/* Teoria musical e banco de acordes.
 * Cordas indexadas da 6ª (Mi grave) para a 1ª (Mi agudo): índice 0..5.
 * casas: -1 = corda não tocada (X), 0 = solta, n = casa.
 * dedos: 0 = nenhum, 1 = indicador, 2 = médio, 3 = anelar, 4 = mínimo.
 */
(function (raiz) {
  'use strict';

  const NOMES_NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOMES_SOLFEJO = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'];
  // MIDI das cordas soltas: E2 A2 D3 G3 B3 E4
  const CORDAS_SOLTAS = [40, 45, 50, 55, 59, 64];
  const NOMES_CORDAS = ['Mi grave', 'Lá', 'Ré', 'Sol', 'Si', 'Mi agudo'];

  const freqDeMidi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const midiDeFreq = (f) => 69 + 12 * Math.log2(f / 440);
  const nomeDeMidi = (m) => NOMES_NOTAS[((Math.round(m) % 12) + 12) % 12] + (Math.floor(Math.round(m) / 12) - 1);

  const ACORDES = {
    Em: {
      nome: 'Em', extenso: 'Mi menor', casas: [0, 2, 2, 0, 0, 0], dedos: [0, 2, 3, 0, 0, 0],
      dica: 'O acorde mais fácil do violão. Dedo 2 na 5ª corda e dedo 3 na 4ª corda, ambos na casa 2. Toque as 6 cordas.'
    },
    D69: {
      nome: 'D6/9', extenso: 'Ré com sexta e nona (baixo em Fá#)', casas: [2, 0, 0, 2, 0, 0], dedos: [2, 0, 0, 3, 0, 0],
      dica: 'O segundo acorde de "A Horse With No Name". Use os mesmos dedos do Em, mas leve o dedo 2 para a 6ª corda e o dedo 3 para a 3ª corda, ambos na casa 2.'
    },
    Am: {
      nome: 'Am', extenso: 'Lá menor', casas: [-1, 0, 2, 2, 1, 0], dedos: [0, 0, 2, 3, 1, 0],
      dica: 'Mesmo formato do E (Mi maior), uma corda abaixo. Não toque a 6ª corda: comece a batida na 5ª.'
    },
    Am7: {
      nome: 'Am7', extenso: 'Lá menor com sétima', casas: [-1, 0, 2, 0, 1, 0], dedos: [0, 0, 2, 0, 1, 0],
      dica: 'É o Am sem o dedo 3. A 3ª corda fica solta. Comece a batida na 5ª corda.'
    },
    E: {
      nome: 'E', extenso: 'Mi maior', casas: [0, 2, 2, 1, 0, 0], dedos: [0, 2, 3, 1, 0, 0],
      dica: 'É o Em com o dedo 1 na 3ª corda, casa 1. Toque as 6 cordas.'
    },
    A: {
      nome: 'A', extenso: 'Lá maior', casas: [-1, 0, 2, 2, 2, 0], dedos: [0, 0, 1, 2, 3, 0],
      dica: 'Três dedos lado a lado na casa 2 (4ª, 3ª e 2ª cordas). Fica apertado: incline os dedos. Não toque a 6ª corda.'
    },
    D: {
      nome: 'D', extenso: 'Ré maior', casas: [-1, -1, 0, 2, 3, 2], dedos: [0, 0, 0, 1, 3, 2],
      dica: 'Formato de triângulo nas três cordas finas. Toque só as 4 cordas mais finas, começando pela 4ª (Ré solta).'
    },
    Dsus2: {
      nome: 'Dsus2', extenso: 'Ré com segunda suspensa', casas: [-1, -1, 0, 2, 3, 0], dedos: [0, 0, 0, 1, 3, 0],
      dica: 'É o D sem o dedo 2: a 1ª corda fica solta. Som aberto, usado em "Hurt".'
    },
    G: {
      nome: 'G', extenso: 'Sol maior', casas: [3, 2, 0, 0, 0, 3], dedos: [2, 1, 0, 0, 0, 3],
      dica: 'Dedo 2 na 6ª corda (casa 3), dedo 1 na 5ª (casa 2), dedo 3 na 1ª (casa 3). As três cordas do meio ficam soltas.'
    },
    C: {
      nome: 'C', extenso: 'Dó maior', casas: [-1, 3, 2, 0, 1, 0], dedos: [0, 3, 2, 0, 1, 0],
      dica: 'Uma escadinha: dedo 3 na 5ª corda (casa 3), dedo 2 na 4ª (casa 2), dedo 1 na 2ª (casa 1). Não toque a 6ª corda.'
    },
    Fmaj7: {
      nome: 'F', extenso: 'Fá simplificado (Fmaj7, sem pestana)', casas: [-1, -1, 3, 2, 1, 0], dedos: [0, 0, 3, 2, 1, 0],
      dica: 'Versão do Fá sem pestana. Escadinha nas cordas 4, 3 e 2. Toque só as 4 cordas finas. Substitui o F com pestana enquanto você ganha força.'
    },
    Bm7: {
      nome: 'Bm', extenso: 'Si menor simplificado (Bm7, sem pestana)', casas: [-1, 2, 0, 2, 0, 2], dedos: [0, 1, 0, 2, 0, 3],
      dica: 'Versão do Si menor sem pestana: dedos na casa 2 das cordas 5, 3 e 1. Cordas 4 e 2 soltas. Não toque a 6ª.'
    },
    // Formatos do Wonderwall (dedos 3 e 4 fixos na casa 3 das cordas 2 e 1)
    Em7: {
      nome: 'Em7', extenso: 'Mi menor com sétima (formato Wonderwall)', casas: [0, 2, 2, 0, 3, 3], dedos: [0, 1, 2, 0, 3, 4],
      dica: 'Dedos 3 e 4 ficam presos na casa 3 das cordas 2 e 1. Eles são a "âncora" que não sai do lugar na música inteira.'
    },
    Gww: {
      nome: 'G', extenso: 'Sol maior (formato Wonderwall)', casas: [3, 2, 0, 0, 3, 3], dedos: [2, 1, 0, 0, 3, 4],
      dica: 'A âncora (dedos 3 e 4) continua na casa 3. Dedo 2 na 6ª corda (casa 3) e dedo 1 na 5ª (casa 2).'
    },
    Dsus4: {
      nome: 'Dsus4', extenso: 'Ré com quarta suspensa (formato Wonderwall)', casas: [-1, -1, 0, 2, 3, 3], dedos: [0, 0, 0, 1, 3, 4],
      dica: 'Âncora na casa 3 e dedo 1 na 3ª corda, casa 2. Toque só as 4 cordas finas.'
    },
    A7sus4: {
      nome: 'A7sus4', extenso: 'Lá com sétima e quarta (formato Wonderwall)', casas: [-1, 0, 2, 0, 3, 3], dedos: [0, 0, 1, 0, 3, 4],
      dica: 'Âncora na casa 3 e dedo 1 na 4ª corda, casa 2. Não toque a 6ª corda.'
    },
    Cadd9: {
      nome: 'Cadd9', extenso: 'Dó com nona (formato Wonderwall)', casas: [-1, 3, 2, 0, 3, 3], dedos: [0, 2, 1, 0, 3, 4],
      dica: 'Âncora na casa 3, dedo 2 na 5ª corda (casa 3) e dedo 1 na 4ª corda (casa 2). Não toque a 6ª corda.'
    }
  };
  Object.keys(ACORDES).forEach((id) => { ACORDES[id].id = id; });

  // Frequências de análise (mesmas usadas no cromagrama)
  const FMIN = 70, FMAX = 2000;
  // Amplitude relativa dos harmônicos de uma corda dedilhada (aprox.)
  const AMP_HARM = [1, 0.75, 0.55, 0.4, 0.3, 0.22];
  // Microfone de celular corta graves: filtro passa-altas aproximado
  const respostaMic = (f) => 1 / Math.sqrt(1 + Math.pow(120 / f, 4));

  // Molde (template) de cromagrama a partir de uma lista de notas MIDI
  function moldeDeNotas(midis) {
    const v = new Float64Array(12);
    // agrupa por frequência para imitar o espectro (picos coincidentes se somam)
    const picos = new Map();
    for (const m of midis) {
      const f0 = freqDeMidi(m);
      for (let h = 1; h <= AMP_HARM.length; h++) {
        const f = f0 * h;
        if (f < FMIN || f > FMAX) continue;
        const mh = m + 12 * Math.log2(h);
        const chave = Math.round(mh * 2); // agrupa picos muito próximos
        const amp = AMP_HARM[h - 1] * respostaMic(f);
        const desvio = mh - Math.round(mh);
        const pesoAfinacao = Math.exp(-(desvio * desvio) / (2 * 0.2 * 0.2));
        const atual = picos.get(chave) || { pc: ((Math.round(mh) % 12) + 12) % 12, amp: 0, w: pesoAfinacao };
        atual.amp += amp;
        picos.set(chave, atual);
      }
    }
    for (const p of picos.values()) v[p.pc] += Math.sqrt(p.amp) * p.w;
    return normalizar(v);
  }

  function notasDoAcorde(acorde, capo) {
    const notas = [];
    acorde.casas.forEach((c, s) => { if (c >= 0) notas.push(CORDAS_SOLTAS[s] + c + (capo || 0)); });
    return notas;
  }

  const cacheMoldes = new Map();
  function moldeDeAcorde(id, capo) {
    const chave = id + '@' + (capo || 0);
    if (!cacheMoldes.has(chave)) cacheMoldes.set(chave, moldeDeNotas(notasDoAcorde(ACORDES[id], capo)));
    return cacheMoldes.get(chave);
  }

  // Moldes genéricos (qualquer tom) para o detector livre
  const QUALIDADES = [
    { suf: '', int: [0, 4, 7] },
    { suf: 'm', int: [0, 3, 7] },
    { suf: '7', int: [0, 4, 7, 10] },
    { suf: 'm7', int: [0, 3, 7, 10] },
    { suf: '7M', int: [0, 4, 7, 11] },
    { suf: 'sus2', int: [0, 2, 7] },
    { suf: 'sus4', int: [0, 5, 7] }
  ];
  let moldesGenericos = null;
  function obterMoldesGenericos() {
    if (moldesGenericos) return moldesGenericos;
    moldesGenericos = [];
    for (let r = 0; r < 12; r++) {
      for (const q of QUALIDADES) {
        const baixo = 40 + ((r - 4 + 12) % 12); // tônica entre E2 e D#3
        const midis = [baixo, baixo + 12];
        q.int.forEach((i) => { if (i) midis.push(baixo + 12 + i); });
        midis.push(baixo + 24);
        midis.push(baixo + 24 + q.int[1]);
        midis.push(baixo + 7);
        moldesGenericos.push({ nome: NOMES_NOTAS[r] + q.suf, raiz: r, molde: moldeDeNotas(midis) });
      }
    }
    return moldesGenericos;
  }

  function normalizar(v) {
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    s = Math.sqrt(s) || 1;
    const out = new Float64Array(v.length);
    for (let i = 0; i < v.length; i++) out[i] = v[i] / s;
    return out;
  }

  function cosseno(a, b) {
    let s = 0;
    for (let i = 0; i < 12; i++) s += a[i] * b[i];
    return s;
  }

  const Teoria = {
    NOMES_NOTAS, NOMES_SOLFEJO, CORDAS_SOLTAS, NOMES_CORDAS, ACORDES, FMIN, FMAX, AMP_HARM,
    freqDeMidi, midiDeFreq, nomeDeMidi, notasDoAcorde, moldeDeNotas, moldeDeAcorde,
    obterMoldesGenericos, normalizar, cosseno, respostaMic
  };
  raiz.Teoria = Teoria;
  if (typeof module !== 'undefined' && module.exports) module.exports = Teoria;
})(typeof window !== 'undefined' ? window : globalThis);
