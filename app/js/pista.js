/* Pista rolante: acordes e setas de palhetada passam pela linha de toque.
 * Avalia o acorde de cada bloco (pelo cromagrama) e o tempo de cada batida
 * (pelo detector de ataques). Usada em ritmo, desafios e músicas.
 */
(function () {
  'use strict';
  const { el, icone, diagrama } = window.UI;
  const T = window.Teoria, C = window.Conteudo, DSP = window.DSP, M = window.Motor;

  const TOL_PERFEITO = 0.075, TOL_BOM = 0.15;

  function gerarBatidas(slots, total, blocos) {
    const mapa = new Map();
    const fantasmas = [];
    const nComp = Math.ceil(total / 4 - 1e-6);
    for (let c = 0; c < nComp; c++) {
      slots.forEach((s, i) => {
        const tempo = c * 4 + i * 0.5;
        if (tempo > total - 1e-6) return;
        if (s === '-') fantasmas.push({ tempo, dir: i % 2 === 0 ? 'baixo' : 'cima' });
        else mapa.set(tempo.toFixed(3), { tempo, dir: s === 'B' ? 'baixo' : 'cima' });
      });
    }
    (blocos || []).forEach((b) => {
      const k = b.inicio.toFixed(3);
      if (!mapa.has(k)) mapa.set(k, { tempo: b.inicio, dir: 'baixo' });
    });
    const batidas = [...mapa.values()].sort((a, b) => a.tempo - b.tempo).map((b) => Object.assign(b, { estado: null }));
    const fant = fantasmas.filter((f) => !mapa.has(f.tempo.toFixed(3)));
    return { batidas, fantasmas: fant };
  }

  function cores() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    return {
      fundo: v('--superficie'), linha: v('--linha'), texto: v('--texto'), texto2: v('--texto-2'),
      acento: v('--acento'), ok: v('--ok'), bom: v('--bom'), erro: v('--erro'), sup2: v('--superficie-2'),
      fonteNome: v('--fonte-acorde') || 'sans-serif'
    };
  }

  // cfg: {blocos, total, padrao, bpm, capo, avaliarAcordes, avaliarRitmo, marcas, metronomo, candidatos, abafado}
  function rodarPista(palco, cfg) {
    return new Promise((resolver) => {
      const corpo = palco.corpo;
      corpo.innerHTML = '';
      const capo = cfg.capo || 0;
      const blocos = (cfg.blocos || []).map((b) => Object.assign({}, b, { quadros: 0, ok: 0, estado: null, viu: null }));
      const slots = C.PADROES[cfg.padrao].slots;
      const { batidas, fantasmas } = cfg.batidas ? { batidas: cfg.batidas.map((b) => Object.assign({ estado: null }, b)), fantasmas: cfg.fantasmas || [] } : gerarBatidas(slots, cfg.total, blocos);
      const batida = 60 / cfg.bpm;
      const contagem = 4;
      const candidatos = cfg.candidatos || [...new Set(blocos.map((b) => b.id))];
      const temColcheias = slots.some((x, i) => i % 2 === 1 && x !== '-');
      const mostrarMao = cfg.padrao !== 'q1' && cfg.padrao !== 'q2' && cfg.padrao !== 'livre';
      let extras = 0;
      const desvios = [];

      // ---------- DOM ----------
      const cartaoAgora = el('div', { class: 'pista-agora' });
      const cartaoDepois = el('div', { class: 'pista-depois' });
      const acordeUnico = new Set(blocos.map((b) => b.id)).size <= 1;
      if (acordeUnico) cartaoDepois.hidden = true;
      const painel = el('div', { class: 'pista-acordes' + (acordeUnico ? ' so-ritmo' : '') }, cartaoAgora, cartaoDepois);
      const canvas = el('canvas', { class: 'pista-canvas', 'aria-label': 'Pista com os acordes e as batidas' });
      const contagemEl = el('div', { class: 'pista-contagem', 'aria-live': 'polite' });
      const julgamento = el('div', { class: 'pista-julgamento' });
      const caixaCanvas = el('div', { class: 'pista-canvas-caixa' }, canvas, contagemEl, julgamento);
      const barra = el('div', { class: 'pista-progresso' }, el('div'));
      const medidor = el('div', { class: 'medidor', title: 'Volume do microfone' }, el('div'));
      const btParar = el('button', { class: 'bt bt-secundario' }, 'Parar');
      const padraoTxt = el('div', { class: 'pista-padrao' }, el('span', { class: 'rotulo' }, 'Ritmo'), C.PADROES[cfg.padrao].curto);
      const rodape = el('div', { class: 'pista-rodape' }, padraoTxt, barra, el('div', { class: 'pista-linha' }, el('span', { class: 'rotulo' }, icone('mic')), medidor, btParar));
      if (cfg.abafado) painel.appendChild(el('div', { class: 'pista-abafado' }, el('b', null, 'Cordas abafadas'), el('span', null, 'Encoste a mão do braço nas cordas, sem apertar. A bolinha ao lado da linha é a sua mão: suba e desça junto com ela, sem parar.')));
      corpo.append(el('div', { class: 'pista-tela' }, painel, caixaCanvas, rodape));

      const g = canvas.getContext('2d');
      const cor = cores();
      let W = 0, H = 0;
      function ajustar() {
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(2.5, window.devicePixelRatio || 1);
        W = r.width; H = r.height;
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ajustar();
      window.addEventListener('resize', ajustar);

      // ---------- Tempo ----------
      const tInicio = M.agora() + 0.6;
      const t0 = tInicio + contagem * batida;
      const nCliques = cfg.metronomo && !cfg.banda ? contagem + Math.ceil(cfg.total) : contagem;
      const pararMetronomo = M.metronomo(tInicio, batida, nCliques, 4, cfg.banda || cfg.relogio ? 0.35 : 0);
      if (cfg.aoIniciar) cfg.aoIniciar(t0);
      const pararBanda = cfg.banda && blocos.length ? M.banda(t0, batida, blocos, cfg.total, capo, {}) : null;

      // ---------- Robô (modo demonstração) ----------
      if (M.simulado) {
        const erradoPorBloco = new Map();
        blocos.forEach((b) => {
          if (Math.random() < 0.08) {
            const outros = (candidatos.length > 1 ? candidatos : ['Em', 'Am', 'C', 'G', 'D']).filter((id) => id !== b.id);
            erradoPorBloco.set(b, outros[Math.floor(Math.random() * outros.length)]);
          }
        });
        batidas.forEach((bt) => {
          if (Math.random() < 0.04) return;
          const bl = blocos.find((b) => bt.tempo >= b.inicio - 1e-6 && bt.tempo < b.inicio + b.dur - 1e-6);
          const id = bl ? (erradoPorBloco.get(bl) || bl.id) : (cfg.acordeRobo || 'Em');
          const jitter = (Math.random() + Math.random() + Math.random() - 1.5) * 0.03;
          M.roboBatida(id, capo, t0 + bt.tempo * batida + jitter, bt.dir, bt.dir === 'baixo' ? 0.75 : 0.4);
        });
      }

      function blocoEm(tb) {
        for (const b of blocos) if (tb >= b.inicio && tb < b.inicio + b.dur) return b;
        return null;
      }

      // ---------- Escuta ----------
      let tempoAcum = 0;
      let ultimoOk = 0;
      const offQuadro = (r) => {
        const fr = Math.max(0, Math.min(1, (r.db + 60) / 50));
        medidor.firstChild.style.width = (fr * 100).toFixed(0) + '%';
        if (r.temSinal) { tempoAcum += 0.07; if (tempoAcum > 5) { window.Estado.somarTempo(tempoAcum); tempoAcum = 0; } }
        if (!cfg.avaliarAcordes || !blocos.length) return;
        const tb = cfg.relogio ? cfg.relogio() - (M.agora() - r.t + 0.17) / batida : (r.t - 0.17 - t0) / batida;
        const bl = blocoEm(tb);
        if (!bl || bl.estado) return;
        if ((tb - bl.inicio) * batida < 0.3) return;
        bl.quadros++;
        if (r.temSinal && !r.silenciado) {
          const av = DSP.avaliarAlvo(r.chroma, bl.id, capo, candidatos);
          if (av.ok) { bl.ok++; ultimoOk = performance.now(); }
          bl.viu = av.melhor.id !== bl.id ? av.melhor.nome : bl.viu;
        }
      };
      const offAtaque = (ev) => {
        if (!cfg.avaliarRitmo) return;
        const tb = cfg.relogio ? cfg.relogio() - (M.agora() - ev.tAjustado) / batida : (ev.tAjustado - t0) / batida;
        if (tb < -0.5 || tb > cfg.total + 0.5) return;
        let melhor = null, dm = Infinity;
        for (const b of batidas) {
          if (b.estado) continue;
          const d = Math.abs(b.tempo - tb) * batida;
          if (d < dm) { dm = d; melhor = b; }
        }
        if (melhor && dm <= TOL_BOM) {
          melhor.estado = dm <= TOL_PERFEITO ? 'perfeito' : 'bom';
          const desvio = (tb - melhor.tempo) * batida;
          desvios.push(desvio);
          mostrarJulgamento(melhor.estado, desvio);
        } else if (tb > -0.3) {
          extras++;
        }
      };
      M.ouvQuadro.add(offQuadro);
      M.ouvAtaque.add(offAtaque);

      let timerJulg = null;
      function mostrarJulgamento(estado, desvio) {
        const txt = estado === 'perfeito' ? 'Perfeito' : desvio < 0 ? 'Adiantado' : 'Atrasado';
        julgamento.textContent = txt;
        julgamento.className = 'pista-julgamento mostrar ' + estado;
        clearTimeout(timerJulg);
        timerJulg = setTimeout(() => { julgamento.className = 'pista-julgamento'; }, 450);
      }

      // ---------- Painel agora/depois ----------
      let agoraId = null, depoisId = null;
      function atualizarPainel(tb) {
        if (!blocos.length) {
          if (agoraId !== 'ritmo') {
            agoraId = 'ritmo';
            cartaoAgora.innerHTML = '';
            cartaoAgora.append(el('div', { class: 'rotulo' }, cfg.acordeRotulo || 'Só ritmo'), el('div', { class: 'pista-nome' }, C.PADROES[cfg.padrao].curto));
          }
          return;
        }
        let idx = blocos.findIndex((b) => tb < b.inicio + b.dur);
        if (idx < 0) idx = blocos.length - 1;
        const atual = blocos[Math.max(0, idx)];
        let prox = null;
        for (let k = idx + 1; k < blocos.length; k++) if (blocos[k].id !== atual.id) { prox = blocos[k]; break; }
        if (atual.id !== agoraId) {
          agoraId = atual.id;
          cartaoAgora.innerHTML = '';
          cartaoAgora.append(el('div', { class: 'rotulo' }, tb < 0 ? 'Primeiro' : 'Agora'), el('div', { class: 'pista-nome' }, T.ACORDES[atual.id].nome), diagrama(atual.id, { largura: 118 }));
        }
        const pid = prox ? prox.id : '';
        if (pid !== depoisId) {
          depoisId = pid;
          cartaoDepois.innerHTML = '';
          if (prox) cartaoDepois.append(el('div', { class: 'rotulo' }, 'Depois'), el('div', { class: 'pista-nome pequeno' }, T.ACORDES[prox.id].nome), diagrama(prox.id, { largura: 74 }));
          else cartaoDepois.append(el('div', { class: 'rotulo' }, 'Depois'), el('div', { class: 'pista-nome pequeno' }, idx < blocos.length - 1 ? 'mesmo' : 'fim'));
        }
        cartaoAgora.classList.toggle('ouvindo-ok', performance.now() - ultimoOk < 350);
      }

      // ---------- Desenho ----------
      function caixa(x, y, w, h, r) {
        g.beginPath();
        g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
        g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
        g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
      }
      function seta(x, y, dir, tam, corS, larg) {
        g.strokeStyle = corS; g.lineWidth = larg; g.lineCap = 'round'; g.lineJoin = 'round';
        const s = dir === 'baixo' ? 1 : -1;
        g.beginPath();
        g.moveTo(x, y - s * tam); g.lineTo(x, y + s * tam);
        g.moveTo(x - tam * 0.55, y + s * tam * 0.45); g.lineTo(x, y + s * tam); g.lineTo(x + tam * 0.55, y + s * tam * 0.45);
        g.stroke();
      }

      function desenhar(tb) {
        g.clearRect(0, 0, W, H);
        const xToque = Math.max(56, W * 0.22);
        const ppb = Math.max(44, Math.min(120, (W - xToque) / 5)) * (cfg.zoom || 1);
        const x = (b) => xToque + (b - tb) * ppb;
        const temAcordes = blocos.length > 0;
        const yA = 14, hA = temAcordes ? Math.min(64, H * 0.36) : 0;
        const yB = temAcordes ? yA + hA + 18 : 18, hB = H - yB - 22;
        const yMeio = yB + hB / 2;
        // linhas de tempo
        const bIni = Math.floor(tb - xToque / ppb) - 1, bFim = Math.ceil(tb + (W - xToque) / ppb) + 1;
        if (!cfg.semGrade) for (let b = Math.max(-contagem, bIni); b <= Math.min(cfg.total, bFim); b++) {
          const xb = x(b);
          g.strokeStyle = cor.linha; g.lineWidth = b % 4 === 0 ? 2 : 1;
          g.globalAlpha = b % 4 === 0 ? 0.9 : 0.45;
          g.beginPath(); g.moveTo(xb, yA - 6); g.lineTo(xb, H - 16); g.stroke();
          g.globalAlpha = 1;
          if (b >= 0 && b < cfg.total) {
            g.fillStyle = cor.texto2; g.font = '600 11px ' + cor.fonteNome; g.textAlign = 'center';
            g.fillText(String((b % 4) + 1), xb, H - 3);
            if (temColcheias) g.fillText('e', x(b + 0.5), H - 3);
          }
        }
        if (cfg.grade) for (const gb of cfg.grade) {
          const xb = x(gb.t);
          if (xb < -10 || xb > W + 10) continue;
          g.strokeStyle = cor.linha; g.lineWidth = gb.n === 1 ? 2 : 1; g.globalAlpha = gb.n === 1 ? 0.9 : 0.45;
          g.beginPath(); g.moveTo(xb, yA - 6); g.lineTo(xb, H - 16); g.stroke();
          g.globalAlpha = 1;
          g.fillStyle = cor.texto2; g.font = '600 11px ' + cor.fonteNome; g.textAlign = 'center';
          g.fillText(String(gb.n), xb, H - 3);
        }
        // marcas de seção
        (cfg.marcas || []).forEach((m) => {
          const xm = x(m.inicio);
          if (xm < -200 || xm > W) return;
          g.fillStyle = cor.acento; g.font = '700 11px ' + cor.fonteNome; g.textAlign = 'left';
          g.fillText(m.nome.toUpperCase(), xm + 4, yA - 2 + (temAcordes ? 0 : 0));
        });
        // blocos de acorde
        if (temAcordes) {
          for (const bl of blocos) {
            const xa = x(bl.inicio) + 2, xb = x(bl.inicio + bl.dur) - 2;
            if (xb < 0 || xa > W) continue;
            const atual = tb >= bl.inicio && tb < bl.inicio + bl.dur;
            let fundo = cor.sup2, borda = cor.linha;
            if (bl.estado === 'ok') { fundo = cor.ok; borda = cor.ok; }
            else if (bl.estado === 'erro') { fundo = cor.erro; borda = cor.erro; }
            else if (atual) { borda = cor.acento; }
            g.globalAlpha = bl.estado ? 0.28 : 1;
            caixa(xa, yA + 6, xb - xa, hA - 6, 8); g.fillStyle = fundo; g.fill();
            g.globalAlpha = 1;
            g.lineWidth = atual ? 2.5 : 1.2; g.strokeStyle = borda; g.stroke();
            g.save(); caixa(xa, yA + 6, xb - xa, hA - 6, 8); g.clip();
            g.fillStyle = bl.estado === 'ok' ? cor.ok : bl.estado === 'erro' ? cor.erro : cor.texto;
            g.font = '700 ' + Math.round(hA * 0.46) + 'px ' + cor.fonteNome; g.textAlign = 'left'; g.textBaseline = 'middle';
            g.fillText(T.ACORDES[bl.id].nome, Math.max(xa + 10, Math.min(xToque + 8, xb - 60)), yA + 6 + (hA - 6) / 2 + 1);
            g.restore();
            g.textBaseline = 'alphabetic';
          }
        }
        // trilho das batidas
        caixa(4, yB, W - 8, hB, 10); g.fillStyle = cor.sup2; g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1;
        const tam = Math.min(15, hB * 0.3);
        for (const f of fantasmas) {
          const xf = x(f.tempo);
          if (xf < -20 || xf > W + 20) continue;
          g.fillStyle = cor.texto2; g.globalAlpha = 0.35;
          g.beginPath(); g.arc(xf, yMeio, 3, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
        }
        for (const b of batidas) {
          const xb = x(b.tempo);
          if (xb < -20 || xb > W + 20) continue;
          let c = b.dir === 'baixo' ? cor.texto : cor.acento;
          if (b.estado === 'perfeito') c = cor.ok;
          else if (b.estado === 'bom') c = cor.bom;
          else if (b.estado === 'perdeu') c = cor.erro;
          g.globalAlpha = b.estado === 'perdeu' ? 0.55 : 1;
          seta(xb, yMeio, b.dir, b.dir === 'baixo' ? tam : tam * 0.8, c, b.dir === 'baixo' ? 3.4 : 2.6);
          g.globalAlpha = 1;
        }
        // linha de toque
        g.strokeStyle = cor.acento; g.lineWidth = 3;
        g.shadowColor = cor.acento; g.shadowBlur = 10;
        g.beginPath(); g.moveTo(xToque, 4); g.lineTo(xToque, H - 14); g.stroke();
        g.shadowBlur = 0;
        // a "mão": desce no tempo, sobe no "e", sem parar
        if (mostrarMao) {
          const fase = 2 * Math.PI * (cfg.grade ? fracBatida(tb) : tb);
          const ym = yMeio + Math.sin(fase) * hB * 0.3;
          const descendo = Math.cos(fase) > 0;
          const xm = xToque - 26;
          g.fillStyle = descendo ? cor.texto : cor.acento;
          g.beginPath(); g.arc(xm, ym, 11, 0, Math.PI * 2); g.fill();
          g.fillStyle = cor.fundo; g.font = '700 14px ' + cor.fonteNome; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(descendo ? '↓' : '↑', xm, ym + 1);
          g.textBaseline = 'alphabetic';
        }
      }

      // posição dentro do tempo atual quando o pulso vem da gravação (tempos de tamanho variável)
      let gi = 0;
      function fracBatida(tb) {
        const G = cfg.grade;
        if (!G.length || tb < G[0].t) return 0;
        while (gi + 1 < G.length && G[gi + 1].t <= tb) gi++;
        while (gi > 0 && G[gi].t > tb) gi--;
        const a = G[gi].t, b = gi + 1 < G.length ? G[gi + 1].t : a + 0.67;
        return Math.min(0.999, Math.max(0, (tb - a) / (b - a)));
      }

      // ---------- Laço ----------
      let rodando = true, raf = 0;
      function quadro() {
        if (!rodando) return;
        const saida = M.ctx.outputLatency || 0;
        const tb = cfg.relogio ? cfg.relogio() : (M.agora() - saida - t0) / batida;
        // contagem regressiva
        if (tb < 0) { contagemEl.textContent = String(Math.min(contagem, Math.ceil(-tb))); contagemEl.classList.add('mostrar'); }
        else contagemEl.classList.remove('mostrar');
        // batidas perdidas
        for (const b of batidas) if (!b.estado && (tb - b.tempo) * batida > TOL_BOM + 0.06) { b.estado = cfg.avaliarRitmo ? 'perdeu' : 'neutro'; }
        // fecha blocos
        for (const bl of blocos) {
          if (!bl.estado && (tb - (bl.inicio + bl.dur)) * batida > 0.25) {
            bl.estado = bl.ok >= Math.max(2, 0.3 * bl.quadros) ? 'ok' : 'erro';
          }
        }
        atualizarPainel(tb);
        barra.firstChild.style.width = (Math.max(0, Math.min(1, tb / cfg.total)) * 100).toFixed(1) + '%';
        desenhar(tb);
        if (tb > cfg.total + 0.8) { terminar(false); return; }
        raf = requestAnimationFrame(quadro);
      }
      raf = requestAnimationFrame(quadro);

      function limpar() {
        rodando = false;
        cancelAnimationFrame(raf);
        pararMetronomo();
        if (cfg.aoLimpar) cfg.aoLimpar();
        if (pararBanda) pararBanda();
        M.pararRobo();
        M.ouvQuadro.delete(offQuadro);
        M.ouvAtaque.delete(offAtaque);
        window.removeEventListener('resize', ajustar);
        if (tempoAcum > 0) window.Estado.somarTempo(tempoAcum);
        tempoAcum = 0;
      }
      palco.aoFechar(limpar);

      function terminar(interrompido) {
        if (!rodando) return;
        limpar();
        if (interrompido) { resolver(null); return; }
        const nB = batidas.length;
        const perf = batidas.filter((b) => b.estado === 'perfeito').length;
        const bom = batidas.filter((b) => b.estado === 'bom').length;
        const penalExtras = nB ? Math.min(0.3, 0.5 * extras / nB) : 0;
        const pctRitmo = nB ? Math.max(0, Math.min(1, (perf + 0.7 * bom) / nB - penalExtras)) : 0;
        const okB = blocos.filter((b) => b.estado === 'ok').length;
        const pctAcordes = blocos.length ? okB / blocos.length : 0;
        let pct;
        if (cfg.avaliarAcordes && cfg.avaliarRitmo && blocos.length) pct = 0.6 * pctAcordes + 0.4 * pctRitmo;
        else if (cfg.avaliarAcordes && blocos.length) pct = pctAcordes;
        else pct = pctRitmo;
        const estrelas = pct >= 0.9 ? 3 : pct >= 0.78 ? 2 : pct >= 0.6 ? 1 : 0;
        const errosPorAcorde = {};
        blocos.filter((b) => b.estado === 'erro').forEach((b) => { errosPorAcorde[b.id] = (errosPorAcorde[b.id] || 0) + 1; });
        const silencioso = blocos.filter((b) => b.estado === 'erro' && b.ok === 0 && !b.viu).length;
        const porSlot = Array.from({ length: 8 }, () => ({ total: 0, erros: 0 }));
        batidas.forEach((b) => { const i = b.slot !== undefined ? b.slot : Math.round((b.tempo % 4) * 2) % 8; porSlot[i].total++; if (b.estado !== 'perfeito' && b.estado !== 'bom') porSlot[i].erros++; });
        const mediaDesvio = desvios.length ? desvios.reduce((a, b) => a + b, 0) / desvios.length : 0;
        resolver({
          pct, estrelas, pctAcordes, pctRitmo, perf, bom, perdidas: nB - perf - bom, extras, nBatidas: nB,
          okBlocos: okB, nBlocos: blocos.length, errosPorAcorde, silencioso, mediaDesvio, porSlot,
          avaliouAcordes: !!(cfg.avaliarAcordes && blocos.length), avaliouRitmo: !!cfg.avaliarRitmo
        });
      }
      btParar.addEventListener('click', () => terminar(true));
    });
  }

  // Texto de dicas a partir do resultado
  function dicasDoResultado(r) {
    const dicas = [];
    if (r.avaliouAcordes) {
      const piores = Object.entries(r.errosPorAcorde).sort((a, b) => b[1] - a[1]).slice(0, 2);
      piores.forEach(([id, n]) => dicas.push(`O acorde ${T.ACORDES[id].nome} não soou certo ${n} ${n > 1 ? 'vezes' : 'vez'}. Treine a troca para ele.`));
      if (r.silencioso > 2) dicas.push('Em alguns compassos o app não ouviu nada. Toque mais forte ou aproxime o celular.');
    }
    if (r.avaliouRitmo) {
      if (Math.abs(r.mediaDesvio) > 0.035) dicas.push(`Você tende a tocar ${r.mediaDesvio < 0 ? 'adiantado' : 'atrasado'} (${Math.round(Math.abs(r.mediaDesvio) * 1000)} ms). ${r.mediaDesvio < 0 ? 'Segure um pouco' : 'Antecipe um pouco'}, ou refaça a sincronização no Treino.`);
      if (r.porSlot && r.perdidas < r.nBatidas * 0.6) {
        let pior = -1, taxa = 0.34;
        r.porSlot.forEach((p, i) => { if (p.total >= 2 && p.erros / p.total > taxa) { taxa = p.erros / p.total; pior = i; } });
        if (pior >= 0) dicas.push('A batida que mais escapa é a ' + (pior % 2 === 0 ? '↓ do tempo ' + (pior / 2 + 1) : '↑ do "e" depois do ' + ((pior - 1) / 2 + 1)) + '. Conte em voz alta "1 e 2 e 3 e 4 e" e ouça o exemplo de novo.');
      }
      if (r.perdidas > r.nBatidas * 0.25) dicas.push('Várias batidas passaram sem som. Mantenha a mão subindo e descendo sem parar.');
      if (r.extras > Math.max(4, r.nBatidas * 0.12)) dicas.push('Teve batidas fora do lugar. Nos espaços (·) a mão passa sem encostar nas cordas.');
    }
    return dicas;
  }

  window.Pista = { rodarPista, dicasDoResultado, gerarBatidas };
})();
