// Teste do motor de áudio com violão sintetizado.
// Rode com:  node testes/teste-deteccao.js
'use strict';
const path = require('path');
const T = require(path.join(__dirname, '..', 'app', 'js', 'teoria.js'));
globalThis.Teoria = T;
const DSP = require(path.join(__dirname, '..', 'app', 'js', 'dsp.js'));

const SR = 48000;
const N = 16384;

// gerador pseudoaleatório com semente (resultados reproduzíveis)
function rng(semente) {
  let s = semente >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// simula o microfone do celular: passa-altas 2ª ordem em 120 Hz + ruído
function simularMic(sinal, aleatorio, ruidoDb) {
  const f = DSP.DetectorAtaques.biquad('hp', 120, 0.707, SR);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const out = new Float32Array(sinal.length);
  const amp = Math.pow(10, (ruidoDb || -45) / 20);
  for (let i = 0; i < sinal.length; i++) {
    const x = sinal[i] + (aleatorio() * 2 - 1) * amp;
    const y = f.b0 * x + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

function notas(id, capo) {
  return T.ACORDES[id].casas.map((c, s) => (c >= 0 ? T.CORDAS_SOLTAS[s] + c + capo : null));
}

function janelaEm(sinal, tSeg) {
  const fim = Math.round(tSeg * SR);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) { const j = fim - N + i; out[i] = j >= 0 && j < sinal.length ? sinal[j] : 0; }
  return out;
}

const analisador = new DSP.AnalisadorEspectral(N, SR);
let falhas = 0;
function check(cond, msg) { if (!cond) { falhas++; console.log('  FALHOU: ' + msg); } }

// ---------- 1. Reconhecimento de cada acorde (alvo correto) ----------
const CONJUNTOS = {
  basicos: ['Em', 'Am', 'E', 'A', 'D', 'G', 'C', 'Fmaj7', 'Am7', 'Bm7', 'Dsus2', 'D69'],
  wonderwall: ['Em7', 'Gww', 'Dsus4', 'A7sus4', 'Cadd9']
};
console.log('1) Acorde certo deve ser aceito');
let totalOk = 0, total = 0;
const confusoes = {};
for (const [nomeConj, ids] of Object.entries(CONJUNTOS)) {
  const capo = nomeConj === 'wonderwall' ? 2 : 0;
  for (const id of ids) {
    let acertos = 0, tent = 0, simMed = 0;
    for (let k = 0; k < 12; k++) {
      const al = rng(1000 + k * 7 + id.length * 131);
      const ganhos = [0, 1, 2, 3, 4, 5].map(() => 0.55 + 0.45 * al());
      const s = DSP.sintetizarBatida(notas(id, capo), SR, { duracao: 1.6, desafinar: 10, ganhoCordas: ganhos, aleatorio: al, direcao: k % 3 === 2 ? 'cima' : 'baixo' });
      const mic = simularMic(s, al, -50);
      for (const t of [0.45, 1.1]) {
        const r = analisador.analisar(janelaEm(mic, t));
        const av = DSP.avaliarAlvo(r.chroma, id, capo, ids);
        tent++; total++;
        simMed += av.sAlvo;
        if (av.ok) { acertos++; totalOk++; } else {
          const ch = id + '→' + av.melhor.nome + (av.melhor.id === id ? '(sim ' + av.sAlvo.toFixed(2) + ', gen ' + av.melhorGenerico.nome + ' ' + av.melhorGenerico.s.toFixed(2) + ')' : '');
          confusoes[ch] = (confusoes[ch] || 0) + 1;
        }
      }
    }
    console.log(`  ${id.padEnd(7)} ${acertos}/${tent}  sim média ${(simMed / tent).toFixed(3)}`);
  }
}
console.log(`  TOTAL aceitos: ${totalOk}/${total} (${(100 * totalOk / total).toFixed(1)}%)`);
if (Object.keys(confusoes).length) console.log('  confusões:', confusoes);
check(totalOk / total > 0.9, 'taxa de aceitação do acorde certo abaixo de 90%');

// ---------- 2. Acorde errado deve ser rejeitado ----------
console.log('\n2) Acorde errado deve ser rejeitado');
const PARES = [
  ['Em', 'Am'], ['Am', 'Em'], ['A', 'D'], ['D', 'A'], ['E', 'Em'], ['Em', 'E'], ['G', 'C'], ['C', 'G'], ['G', 'Em'], ['Em', 'G'],
  ['C', 'Am'], ['Am', 'C'], ['D', 'Dsus2'], ['Am', 'Am7'], ['C', 'Fmaj7'], ['Fmaj7', 'C'], ['G', 'D'], ['D', 'G'], ['Em', 'D69'], ['D69', 'Em'],
  ['Bm7', 'D'], ['Em7', 'Gww'], ['Gww', 'Em7'], ['Dsus4', 'A7sus4'], ['A7sus4', 'Dsus4'], ['Cadd9', 'Em7'], ['Cadd9', 'Gww']
];
let rejeitados = 0, totalErr = 0;
const aceitosErrado = {};
for (const [tocado, alvo] of PARES) {
  const capo = ['Em7', 'Gww', 'Dsus4', 'A7sus4', 'Cadd9'].includes(alvo) ? 2 : 0;
  const ids = capo ? CONJUNTOS.wonderwall : CONJUNTOS.basicos;
  for (let k = 0; k < 8; k++) {
    const al = rng(5000 + k * 13 + tocado.length * 31 + alvo.length);
    const ganhos = [0, 1, 2, 3, 4, 5].map(() => 0.55 + 0.45 * al());
    const s = DSP.sintetizarBatida(notas(tocado, capo), SR, { duracao: 1.2, desafinar: 10, ganhoCordas: ganhos, aleatorio: al });
    const mic = simularMic(s, al, -50);
    const r = analisador.analisar(janelaEm(mic, 0.6));
    // só o par em jogo (como na troca de 1 minuto) e também o conjunto inteiro
    const avPar = DSP.avaliarAlvo(r.chroma, alvo, capo, [tocado]);
    const avConj = DSP.avaliarAlvo(r.chroma, alvo, capo, ids);
    totalErr += 2;
    if (!avPar.ok) rejeitados++; else aceitosErrado[tocado + '→' + alvo + ' (par)'] = (aceitosErrado[tocado + '→' + alvo + ' (par)'] || 0) + 1;
    if (!avConj.ok) rejeitados++; else aceitosErrado[tocado + '→' + alvo + ' (conj)'] = (aceitosErrado[tocado + '→' + alvo + ' (conj)'] || 0) + 1;
  }
}
console.log(`  rejeitados: ${rejeitados}/${totalErr} (${(100 * rejeitados / totalErr).toFixed(1)}%)`);
if (Object.keys(aceitosErrado).length) console.log('  aceitos por engano:', aceitosErrado);
check(rejeitados / totalErr > 0.95, 'rejeição de acorde errado abaixo de 95%');

// Barulho sem violão (ruído) não pode ser aceito
console.log('\n2b) Só ruído não pode ser aceito');
{
  const al = rng(42);
  const ruido = new Float32Array(SR);
  for (let i = 0; i < ruido.length; i++) ruido[i] = (al() * 2 - 1) * 0.05;
  const r = analisador.analisar(janelaEm(simularMic(ruido, al, -60), 0.9));
  let aceitos = 0;
  for (const id of CONJUNTOS.basicos) if (DSP.avaliarAlvo(r.chroma, id, 0, CONJUNTOS.basicos).ok) aceitos++;
  console.log(`  acordes aceitos com ruído branco: ${aceitos}`);
  check(aceitos === 0, 'ruído aceito como acorde');
}

// ---------- 3. Corda abafada ----------
console.log('\n3) Dica de corda abafada');
const CASOS_MUDO = [['C', 4], ['G', 5], ['D', 4], ['A', 3], ['Am', 4], ['E', 3], ['Em', 1]];
let dicasCertas = 0, falsoAlarme = 0, verificaveis = 0;
for (const [id, mudo] of CASOS_MUDO) {
  const al = rng(777 + mudo);
  const ganhos = [1, 1, 1, 1, 1, 1];
  ganhos[mudo] = 0;
  const sMudo = simularMic(DSP.sintetizarBatida(notas(id, 0), SR, { duracao: 1.2, ganhoCordas: ganhos, aleatorio: al, desafinar: 5 }), al, -50);
  const sOk = simularMic(DSP.sintetizarBatida(notas(id, 0), SR, { duracao: 1.2, aleatorio: al, desafinar: 5 }), al, -50);
  const rM = analisador.analisar(janelaEm(sMudo, 0.6));
  const cM = DSP.verificarCordas(rM.picos, T.ACORDES[id], 0);
  const rO = analisador.analisar(janelaEm(sOk, 0.6));
  const cO = DSP.verificarCordas(rO.picos, T.ACORDES[id], 0);
  const fmt = (c) => c.map((x) => (x === null ? '-' : x ? 'v' : 'X')).join('');
  console.log(`  ${id.padEnd(5)} corda ${6 - mudo} abafada: ${fmt(cM)} | normal: ${fmt(cO)}`);
  if (cM[mudo] !== null) { verificaveis++; if (cM[mudo] === false) dicasCertas++; }
  falsoAlarme += cO.filter((x) => x === false).length;
}
console.log(`  dicas certas ${dicasCertas}/${verificaveis}, falsos alarmes ${falsoAlarme}`);
check(falsoAlarme <= 1, 'muitos falsos alarmes de corda abafada');

// ---------- 4. Afinador ----------
console.log('\n4) Afinador (YIN)');
let erroMax = 0;
for (let s = 0; s < 6; s++) {
  for (const cents of [-30, -7, 0, 12, 40]) {
    const al = rng(s * 100 + cents + 300);
    const cordas = [null, null, null, null, null, null];
    cordas[s] = T.CORDAS_SOLTAS[s] + cents / 100;
    const sinal = simularMic(DSP.sintetizarBatida(cordas, SR, { duracao: 1, aleatorio: al }), al, -55);
    const jan = janelaEm(sinal, 0.5);
    const r = DSP.yin(jan, SR);
    const medido = r.freq ? 1200 * Math.log2(r.freq / T.freqDeMidi(T.CORDAS_SOLTAS[s])) : NaN;
    const erro = Math.abs(medido - cents);
    erroMax = Math.max(erroMax, isNaN(erro) ? 999 : erro);
    if (!(erro < 3)) console.log(`  corda ${6 - s} ${cents} cents → medido ${medido.toFixed(1)} (freq ${r.freq.toFixed(1)})`);
  }
}
console.log(`  erro máximo: ${erroMax.toFixed(2)} cents`);
check(erroMax < 3, 'afinador com erro acima de 3 cents');

// ---------- 5. Detector de batidas ----------
console.log('\n5) Detector de batidas (com clique do metrônomo vazando)');
{
  const al = rng(2024);
  const bpm = 90, beat = 60 / bpm, dur = 1 + 7 * 4 * beat + 1.5;
  const total = Math.round(dur * SR);
  const sinal = new Float32Array(total);
  // padrão ↓ ↓↑ ↑↓↑ (colcheias: 1, 2, 2&, 3&, 4, 4&)
  const slots = [0, 2, 3, 5, 6, 7];
  const esperados = [];
  const acordes = ['G', 'C', 'D', 'Em'];
  for (let compasso = 0; compasso < 7; compasso++) {
    const id = acordes[compasso % 4];
    for (const sl of slots) {
      const t = 1 + compasso * 4 * beat + sl * beat / 2 + (al() - 0.5) * 0.03;
      const dir = sl % 2 === 0 ? 'baixo' : 'cima';
      const vol = dir === 'baixo' ? 0.6 + 0.3 * al() : 0.25 + 0.2 * al();
      const b = DSP.sintetizarBatida(notas(id, 0), SR, { duracao: 1.5, direcao: dir, aleatorio: al, volume: vol, espalhar: 0.008 + 0.01 * al() });
      const i0 = Math.round(t * SR);
      for (let i = 0; i < b.length && i0 + i < total; i++) sinal[i0 + i] += b[i];
      esperados.push(t);
    }
  }
  // cliques de 6 kHz em todos os tempos, bem altos
  for (let k = 0; k * beat < dur; k++) {
    const i0 = Math.round((0.5 + k * beat) * SR), len = Math.round(0.03 * SR);
    for (let i = 0; i < len && i0 + i < total; i++) {
      const env = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / len);
      sinal[i0 + i] += 0.5 * env * Math.sin(2 * Math.PI * 6000 * i / SR);
    }
  }
  const mic = simularMic(sinal, al, -50);
  const det = new DSP.DetectorAtaques(SR);
  const eventos = [];
  for (let i = 0; i < mic.length; i += 128) eventos.push(...det.processar(mic.subarray(i, i + 128), i));
  let acertos = 0; const erros = [];
  const usados = new Set();
  const perdidas = { baixo: 0, cima: 0 };
  esperados.forEach((t, idx) => {
    let melhor = -1, dm = 1;
    eventos.forEach((e, j) => { const d = Math.abs(e.t - t); if (d < dm && !usados.has(j)) { dm = d; melhor = j; } });
    if (melhor >= 0 && dm < 0.05) { acertos++; usados.add(melhor); erros.push(eventos[melhor].t - t); }
    else perdidas[slots[idx % slots.length] % 2 === 0 ? 'baixo' : 'cima']++;
  });
  console.log('  perdidas por direção:', perdidas);
  const extras = eventos.length - usados.size;
  const media = erros.reduce((a, b) => a + b, 0) / (erros.length || 1);
  console.log(`  batidas detectadas: ${acertos}/${esperados.length}, extras: ${extras}, atraso médio ${(media * 1000).toFixed(1)} ms`);
  check(acertos / esperados.length > 0.9, 'detector perdeu mais de 10% das batidas');
  check(extras <= 3, 'detector com muitos falsos positivos');
}

console.log(falhas ? `\n${falhas} verificação(ões) falharam.` : '\nTudo certo.');
process.exitCode = falhas ? 1 : 0;
