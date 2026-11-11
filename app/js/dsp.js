/* Processamento de sinal: FFT, cromagrama, comparação com acordes,
 * afinador (YIN), detector de batidas (ataques) e sintetizador de violão
 * (Karplus-Strong). Funções puras: rodam no navegador e no Node (testes).
 */
(function (raiz) {
  'use strict';
  const T = raiz.Teoria || (typeof require !== 'undefined' ? require('./teoria.js') : null);

  // ---------- FFT radix-2 ----------
  function criarFFT(n) {
    const niveis = Math.round(Math.log2(n));
    if (1 << niveis !== n) throw new Error('FFT: tamanho precisa ser potência de 2');
    const cos = new Float64Array(n / 2), sen = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos(2 * Math.PI * i / n); sen[i] = Math.sin(2 * Math.PI * i / n); }
    const inv = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
      let r = 0, x = i;
      for (let j = 0; j < niveis; j++) { r = (r << 1) | (x & 1); x >>>= 1; }
      inv[i] = r;
    }
    const re = new Float64Array(n), im = new Float64Array(n);
    return function fft(entrada) {
      for (let i = 0; i < n; i++) { re[inv[i]] = entrada[i]; im[inv[i]] = 0; }
      for (let tam = 2; tam <= n; tam <<= 1) {
        const meio = tam >> 1, passo = n / tam;
        for (let i = 0; i < n; i += tam) {
          for (let j = i, k = 0; j < i + meio; j++, k += passo) {
            const l = j + meio;
            const tre = re[l] * cos[k] + im[l] * sen[k];
            const tim = im[l] * cos[k] - re[l] * sen[k];
            re[l] = re[j] - tre; im[l] = im[j] - tim;
            re[j] += tre; im[j] += tim;
          }
        }
      }
      return { re, im };
    };
  }

  function janelaHann(n) {
    const w = new Float32Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
    return w;
  }

  // ---------- Análise espectral + cromagrama ----------
  class AnalisadorEspectral {
    constructor(n, sr) {
      this.n = n; this.sr = sr;
      this.fft = criarFFT(n);
      this.janela = janelaHann(n);
      this.buf = new Float32Array(n);
      this.mags = new Float32Array(n / 2);
      this.kmin = Math.max(2, Math.floor(T.FMIN * n / sr));
      this.kmax = Math.min(n / 2 - 2, Math.ceil(T.FMAX * n / sr));
      this.faixaDb = 38; // picos até 38 dB abaixo do maior contam
    }

    analisar(amostras) {
      const n = this.n, buf = this.buf, w = this.janela;
      const ini = amostras.length - n;
      let soma = 0;
      for (let i = 0; i < n; i++) { const x = amostras[ini + i]; soma += x * x; }
      // RMS só do trecho mais recente (~85 ms) para reagir rápido ao silêncio
      let somaRec = 0; const nRec = Math.min(n, 4096);
      for (let i = n - nRec; i < n; i++) { const x = amostras[ini + i]; somaRec += x * x; }
      const rms = Math.sqrt(somaRec / nRec);
      for (let i = 0; i < n; i++) buf[i] = amostras[ini + i] * w[i];
      const { re, im } = this.fft(buf);
      const mags = this.mags;
      let max = 0;
      for (let k = 0; k <= this.kmax + 1; k++) {
        const m = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
        mags[k] = m;
        if (k >= this.kmin && k <= this.kmax && m > max) max = m;
      }
      const picos = this.encontrarPicos(max);
      const chroma = chromaDePicos(picos);
      return { rms, rmsTotal: Math.sqrt(soma / n), max, picos, chroma };
    }

    encontrarPicos(max) {
      const mags = this.mags, picos = [];
      if (max <= 0) return picos;
      const limiar = max * Math.pow(10, -this.faixaDb / 20);
      const fatorHz = this.sr / this.n;
      for (let k = this.kmin; k <= this.kmax; k++) {
        const b = mags[k];
        if (b < limiar || b <= mags[k - 1] || b < mags[k + 1]) continue;
        // piso local: média de vizinhos afastados
        let piso = 0, cnt = 0;
        for (let d = 5; d <= 12; d++) {
          if (k - d >= 1) { piso += mags[k - d]; cnt++; }
          if (k + d < mags.length) { piso += mags[k + d]; cnt++; }
        }
        piso /= cnt || 1;
        if (b < piso * 2.5) continue;
        const a = Math.log(mags[k - 1] + 1e-12), bb = Math.log(b + 1e-12), c = Math.log(mags[k + 1] + 1e-12);
        const den = a - 2 * bb + c;
        const p = den !== 0 ? 0.5 * (a - c) / den : 0;
        const mag = Math.exp(bb - 0.25 * (a - c) * p);
        picos.push({ f: (k + p) * fatorHz, mag });
      }
      return picos;
    }
  }

  function chromaDePicos(picos) {
    const v = new Float64Array(12);
    for (const pk of picos) {
      const midi = T.midiDeFreq(pk.f);
      const prox = Math.round(midi);
      const desvio = midi - prox;
      const w = Math.sqrt(pk.mag) * Math.exp(-(desvio * desvio) / (2 * 0.2 * 0.2));
      v[((prox % 12) + 12) % 12] += w;
    }
    return T.normalizar(v);
  }

  // Compara o cromagrama com uma lista de candidatos [{id, molde}]
  function classificar(chroma, candidatos) {
    const res = candidatos.map((c) => ({ id: c.id, nome: c.nome, s: T.cosseno(chroma, c.molde) }));
    res.sort((a, b) => b.s - a.s);
    return res;
  }

  // Avalia se o acorde-alvo está soando. Retorna {ok, sAlvo, melhor, margem}
  const LIMIAR_SIM = 0.8;
  function avaliarAlvo(chroma, alvoId, capo, outrosIds) {
    const ids = [alvoId].concat((outrosIds || []).filter((i) => i !== alvoId));
    const cands = ids.map((id) => ({ id, nome: T.ACORDES[id].nome, molde: T.moldeDeAcorde(id, capo) }));
    // confundidores genéricos: acordes de qualquer tom
    const gen = T.obterMoldesGenericos().map((g) => ({ id: 'gen:' + g.nome, nome: g.nome, molde: transporMolde(g.molde, 0) }));
    const r = classificar(chroma, cands);
    const sAlvo = r.find((x) => x.id === alvoId).s;
    const melhorEspecifico = r[0];
    // melhor genérico que não seja equivalente ao alvo
    const rg = classificar(chroma, gen);
    const melhorGen = rg[0];
    const outroMelhor = r.find((x) => x.id !== alvoId);
    const margem = sAlvo - (outroMelhor ? outroMelhor.s : 0);
    const ok = melhorEspecifico.id === alvoId && sAlvo >= LIMIAR_SIM && sAlvo >= melhorGen.s - 0.09;
    return { ok, sAlvo, melhor: melhorEspecifico, margem, melhorGenerico: melhorGen };
  }
  function transporMolde(m, st) {
    if (!st) return m;
    const out = new Float64Array(12);
    for (let i = 0; i < 12; i++) out[(i + st) % 12] = m[i];
    return out;
  }

  // Detector livre: nome do acorde mais provável
  function reconhecerLivre(chroma, idsConhecidos) {
    const cands = T.obterMoldesGenericos().map((g) => ({ id: 'gen:' + g.nome, nome: g.nome, molde: g.molde }));
    (idsConhecidos || []).forEach((id) => cands.push({ id, nome: T.ACORDES[id].nome, molde: T.moldeDeAcorde(id, 0) }));
    return classificar(chroma, cands);
  }

  // Verifica, corda a corda, se as notas esperadas aparecem no espectro.
  // Retorna array de 6: null (não tocada ou não dá para saber), true, false.
  function verificarCordas(picos, acorde, capo) {
    const res = [null, null, null, null, null, null];
    if (!picos.length) return res;
    let max = 0;
    for (const p of picos) if (p.mag > max) max = p.mag;
    const notas = acorde.casas.map((c, s) => (c >= 0 ? T.CORDAS_SOLTAS[s] + c + (capo || 0) : null));
    const perto = (a, b) => Math.abs(a - b) < 0.35;
    for (let s = 0; s < 6; s++) {
      const m = notas[s];
      if (m === null) continue;
      // ambíguo se a nota coincide com outra corda ou harmônico de outra corda
      let ambiguo = false;
      for (let o = 0; o < 6 && !ambiguo; o++) {
        if (o === s || notas[o] === null) continue;
        for (let h = 1; h <= 6; h++) {
          if (perto(notas[o] + 12 * Math.log2(h), m)) { ambiguo = true; break; }
        }
      }
      if (ambiguo) continue;
      const alvos = [m];
      if (T.freqDeMidi(m) < 140) alvos.push(m + 12);
      let ouvida = false;
      for (const p of picos) {
        const mp = T.midiDeFreq(p.f);
        if (alvos.some((a) => perto(mp, a)) && p.mag > max * 0.02) { ouvida = true; break; }
      }
      res[s] = ouvida;
    }
    return res;
  }

  // ---------- Afinador: YIN ----------
  function yin(amostras, sr, opcoes) {
    const o = Object.assign({ limiar: 0.12, fmin: 65, fmax: 1100, tamanho: 4096 }, opcoes || {});
    const n = Math.min(o.tamanho, amostras.length);
    const ini = amostras.length - n;
    const tauMax = Math.min(Math.floor(sr / o.fmin), Math.floor(n / 2));
    const tauMin = Math.max(2, Math.floor(sr / o.fmax));
    const W = n - tauMax;
    const d = new Float32Array(tauMax + 1);
    let rms = 0;
    for (let i = 0; i < n; i++) rms += amostras[ini + i] * amostras[ini + i];
    rms = Math.sqrt(rms / n);
    for (let tau = 1; tau <= tauMax; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) {
        const dif = amostras[ini + i] - amostras[ini + i + tau];
        s += dif * dif;
      }
      d[tau] = s;
    }
    // diferença normalizada cumulativa
    const cmnd = new Float32Array(tauMax + 1);
    cmnd[0] = 1;
    let soma = 0;
    for (let tau = 1; tau <= tauMax; tau++) {
      soma += d[tau];
      cmnd[tau] = soma > 0 ? d[tau] * tau / soma : 1;
    }
    let tau = -1;
    for (let t = tauMin; t < tauMax; t++) {
      if (cmnd[t] < o.limiar) {
        while (t + 1 < tauMax && cmnd[t + 1] < cmnd[t]) t++;
        tau = t; break;
      }
    }
    if (tau < 0) return { freq: 0, confianca: 0, rms };
    // interpolação parabólica
    let tauFino = tau;
    if (tau > 1 && tau < tauMax) {
      const a = cmnd[tau - 1], b = cmnd[tau], c = cmnd[tau + 1];
      const den = a - 2 * b + c;
      if (den !== 0) tauFino = tau + 0.5 * (a - c) / den;
    }
    return { freq: sr / tauFino, confianca: 1 - cmnd[tau], rms };
  }

  // ---------- Detector de batidas (ataques) por fluxo espectral ----------
  // Atenção: esta classe também é enviada como texto para o AudioWorklet.
  // Não use nada de fora dela.
  class DetectorAtaques {
    constructor(sr) {
      this.sr = sr;
      const n = sr > 60000 ? 2048 : 1024;
      this.n = n; this.hop = n / 4;
      this.anel = new Float32Array(n); this.pos = 0; this.desdeHop = 0;
      this.quadro = new Float64Array(n);
      this.re = new Float64Array(n); this.im = new Float64Array(n);
      this.jan = new Float64Array(n);
      for (let i = 0; i < n; i++) this.jan[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
      const niveis = Math.round(Math.log2(n));
      this.inv = new Uint32Array(n);
      for (let i = 0; i < n; i++) { let r = 0, x = i; for (let j = 0; j < niveis; j++) { r = (r << 1) | (x & 1); x >>>= 1; } this.inv[i] = r; }
      this.cos = new Float64Array(n / 2); this.sen = new Float64Array(n / 2);
      for (let i = 0; i < n / 2; i++) { this.cos[i] = Math.cos(2 * Math.PI * i / n); this.sen[i] = Math.sin(2 * Math.PI * i / n); }
      // banda analisada: 150 Hz a 4 kHz (o clique do metrônomo fica em 6 kHz, fora da banda)
      this.k0 = Math.ceil(150 * n / sr); this.k1 = Math.floor(4000 * n / sr);
      this.nb = this.k1 - this.k0 + 1;
      this.espec = [new Float32Array(this.nb), new Float32Array(this.nb), new Float32Array(this.nb)];
      this.ei = 0;
      this.fluxos = new Float32Array(24); this.fi = 0;
      this.ruidoFluxo = 0.05;
      this.ultimo = -10;
      this.refratario = 0.07;
      this.sensibilidade = 1;
      this.nivel = -120;
      this.prevF = 0; this.prevT = 0; this.prevPrevF = 0;
      this.contQuadros = 0;
    }
    static biquad(tipo, f0, q, sr) {
      const w0 = 2 * Math.PI * f0 / sr, cw = Math.cos(w0), al = Math.sin(w0) / (2 * q);
      let b0, b1, b2;
      if (tipo === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; } else { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; }
      const a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
      return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
    }
    processar(bloco, frameInicial) {
      const eventos = [];
      const n = this.n;
      for (let i = 0; i < bloco.length; i++) {
        this.anel[this.pos] = bloco[i];
        this.pos = (this.pos + 1) % n;
        if (++this.desdeHop >= this.hop) {
          this.desdeHop = 0;
          this.analisarQuadro((frameInicial + i + 1) / this.sr, eventos);
        }
      }
      return eventos;
    }
    analisarQuadro(tFim, eventos) {
      const n = this.n, re = this.re, im = this.im, inv = this.inv;
      let energia = 0;
      for (let i = 0; i < n; i++) {
        const x = this.anel[(this.pos + i) % n];
        energia += x * x;
        re[inv[i]] = x * this.jan[i]; im[inv[i]] = 0;
      }
      this.nivel = 10 * Math.log10(energia / n + 1e-14);
      for (let tam = 2; tam <= n; tam <<= 1) {
        const meio = tam >> 1, passo = n / tam;
        for (let i = 0; i < n; i += tam) {
          for (let j = i, k = 0; j < i + meio; j++, k += passo) {
            const l = j + meio;
            const tre = re[l] * this.cos[k] + im[l] * this.sen[k];
            const tim = im[l] * this.cos[k] - re[l] * this.sen[k];
            re[l] = re[j] - tre; im[l] = im[j] - tim; re[j] += tre; im[j] += tim;
          }
        }
      }
      const atual = this.espec[this.ei];
      const ant2 = this.espec[(this.ei + 1) % 3]; // dois quadros atrás
      let fluxo = 0;
      for (let b = 0; b < this.nb; b++) {
        const k = this.k0 + b;
        const m = Math.log(1 + 10 * Math.sqrt(re[k] * re[k] + im[k] * im[k]));
        atual[b] = m;
        const d = m - ant2[b];
        if (d > 0) fluxo += d;
      }
      fluxo /= this.nb;
      this.ei = (this.ei + 1) % 3;
      this.contQuadros++;
      // escolha de pico com 1 quadro de atraso: o quadro anterior é máximo local?
      const f = this.prevF, t = this.prevT;
      if (this.contQuadros > 3) {
        const ord = this.ordenado || (this.ordenado = new Float32Array(this.fluxos.length));
        ord.set(this.fluxos); ord.sort();
        const mediana = ord[ord.length >> 1];
        const limiar = Math.max(mediana * 1.3 + 0.05, this.ruidoFluxo * 3 + 0.05) / this.sensibilidade;
        if (f > limiar && f >= this.prevPrevF && f > fluxo && t - this.ultimo > this.refratario) {
          this.ultimo = t;
          eventos.push({ t: t - 1.5 * this.hop / this.sr, forca: f });
        }
      }
      // histórico e piso de ruído do fluxo
      this.fluxos[this.fi] = f; this.fi = (this.fi + 1) % this.fluxos.length;
      if (fluxo < this.ruidoFluxo) this.ruidoFluxo += (fluxo - this.ruidoFluxo) * 0.2;
      else this.ruidoFluxo += (fluxo - this.ruidoFluxo) * 0.003;
      this.prevPrevF = f; this.prevF = fluxo; this.prevT = tFim;
    }
  }

  // ---------- Sintetizador de violão (Karplus-Strong) ----------
  // cordas: array de 6 notas MIDI (ou null). Retorna Float32Array.
  function sintetizarBatida(cordas, sr, opcoes) {
    const o = Object.assign({ duracao: 2.5, espalhar: 0.012, direcao: 'baixo', volume: 0.8, desafinar: 0, ganhoCordas: null, aleatorio: Math.random, brilho: 0.5 }, opcoes || {});
    const total = Math.round(o.duracao * sr);
    const saida = new Float32Array(total);
    const ordem = [0, 1, 2, 3, 4, 5];
    if (o.direcao === 'cima') ordem.reverse();
    let pos = 0;
    for (const s of ordem) {
      const m = cordas[s];
      if (m === null || m === undefined) continue;
      const det = typeof o.desafinar === 'number' ? o.desafinar * (o.aleatorio() * 2 - 1) : 0;
      const f = T.freqDeMidi(m + det / 100);
      const ganho = (o.ganhoCordas ? o.ganhoCordas[s] : 1) * (o.direcao === 'cima' && s < 2 ? 0.35 : 1);
      if (ganho <= 0) { pos++; continue; }
      const inicio = Math.round(pos * o.espalhar * sr);
      pos++;
      tocarCorda(saida, inicio, f, sr, ganho, o);
    }
    let pico = 0;
    for (let i = 0; i < total; i++) pico = Math.max(pico, Math.abs(saida[i]));
    if (pico > 0) { const g = o.volume / pico; for (let i = 0; i < total; i++) saida[i] *= g; }
    // fade-out no fim para não estalar
    const nFade = Math.min(total, Math.round(0.25 * sr));
    for (let i = 0; i < nFade; i++) saida[total - 1 - i] *= i / nFade;
    return saida;
  }

  function tocarCorda(saida, inicio, f, sr, ganho, o) {
    const periodo = sr / f - 0.5;
    const N = Math.floor(periodo) + 2;
    const frac = periodo - Math.floor(periodo);
    const linha = new Float32Array(N + 2);
    // excitação: soma de harmônicos com amplitude de corda palhetada
    // (posição da palheta ~ 1/6 da corda) e fases aleatórias
    const P = sr / f;
    const H = Math.min(40, Math.floor(sr / (2.2 * f)));
    const beta = 0.17;
    for (let h = 1; h <= H; h++) {
      const a = Math.abs(Math.sin(Math.PI * h * beta)) / Math.pow(h, 1.05 - 0.3 * o.brilho);
      const fase = o.aleatorio() * 2 * Math.PI;
      for (let i = 0; i < N; i++) linha[i] += a * Math.sin(2 * Math.PI * h * i / P + fase);
    }
    // ruído da palheta no ataque (~4 ms)
    const nRuido = Math.round(0.004 * sr);
    let pico = 0;
    for (let i = 0; i < N; i++) pico = Math.max(pico, Math.abs(linha[i]));
    for (let i = 0; i < nRuido && inicio + i < saida.length; i++) {
      const env = 1 - i / nRuido;
      saida[inicio + i] += (o.aleatorio() * 2 - 1) * env * 0.25 * pico * ganho;
    }
    const perda = 0.9965 + Math.min(0.0025, 60 / (f * 400));
    const L = Math.floor(periodo);
    const buf = new Float32Array(saida.length - inicio);
    // escreve a excitação e segue a recorrência
    for (let n = 0; n < buf.length; n++) {
      let y;
      if (n < N) y = linha[n];
      else {
        const a = buf[n - L] * (1 - frac) + buf[n - L - 1] * frac;
        const b = buf[n - L - 1] * (1 - frac) + buf[n - L - 2] * frac;
        y = perda * 0.5 * (a + b);
      }
      buf[n] = y;
      saida[inicio + n] += y * ganho;
    }
  }

  const DSP = {
    criarFFT, janelaHann, AnalisadorEspectral, chromaDePicos, classificar, avaliarAlvo,
    reconhecerLivre, verificarCordas, yin, DetectorAtaques, sintetizarBatida, LIMIAR_SIM
  };
  raiz.DSP = DSP;
  if (typeof module !== 'undefined' && module.exports) module.exports = DSP;
})(typeof window !== 'undefined' ? window : globalThis);
