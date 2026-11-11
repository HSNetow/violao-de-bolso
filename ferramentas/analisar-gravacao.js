// Analisa uma gravação e gera a linha do tempo dos acordes (em segundos).
// Uso: node ferramentas/analisar-gravacao.js <arquivo de áudio> <acordes separados por vírgula> [saida.json]
// Ex.: node ferramentas/analisar-gravacao.js musicas-originais/hurt.mp3 Am,C,Dsus2,G,Fmaj7
// Precisa do ffmpeg instalado. O áudio não sai do computador; só os tempos vão para o JSON.
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const T = require(path.join(__dirname, '..', 'app', 'js', 'teoria.js'));
globalThis.Teoria = T;
const DSP = require(path.join(__dirname, '..', 'app', 'js', 'dsp.js'));

const [arquivo, listaAcordes, saida] = process.argv.slice(2);
if (!arquivo || !listaAcordes) { console.error('uso: node analisar-gravacao.js <audio> <Am,C,...> [saida.json]'); process.exit(1); }
const ids = listaAcordes.split(',');
const SR = 22050, N = 8192, HOP = 2205; // quadros de 0,1 s

const bruto = execFileSync('ffmpeg', ['-v', 'error', '-i', arquivo, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const x = new Float32Array(bruto.buffer, bruto.byteOffset, Math.floor(bruto.length / 4));
const dur = x.length / SR;

// 1) afinação da gravação: desvio médio dos picos em relação ao Lá 440
const an = new DSP.AnalisadorEspectral(N, SR);
const quadros = [];
const jan = new Float32Array(N);
let somaSen = 0, somaCos = 0;
for (let fim = N; fim <= x.length; fim += HOP) {
  jan.set(x.subarray(fim - N, fim));
  const r = an.analisar(jan);
  for (const p of r.picos) { const m = T.midiDeFreq(p.f); const d = m - Math.round(m); const w = Math.sqrt(p.mag); somaSen += w * Math.sin(2 * Math.PI * d); somaCos += w * Math.cos(2 * Math.PI * d); }
  quadros.push({ t: (fim - N / 2) / SR, picos: r.picos.map((p) => ({ f: p.f, mag: p.mag })), rms: r.rmsTotal });
}
const desvio = Math.atan2(somaSen, somaCos) / (2 * Math.PI); // em semitons
const fator = Math.pow(2, -desvio / 12);

// 2) cromagrama corrigido + semelhança com cada acorde
const moldes = ids.map((id) => T.moldeDeAcorde(id, 0));
const rmsMax = quadros.reduce((a, q) => Math.max(a, q.rms), 0);
const emis = quadros.map((q) => {
  const chroma = DSP.chromaDePicos(q.picos.map((p) => ({ f: p.f * fator, mag: p.mag })));
  const s = moldes.map((m) => T.cosseno(chroma, m));
  s.push(q.rms < rmsMax * 0.02 ? 0.9 : 0.45); // estado "silêncio"
  return s;
});

// 3) Viterbi: prefere ficar no mesmo acorde (evita piscar)
const K = ids.length + 1, PEN = Number(process.env.PEN || 0.35);
let custo = emis[0].map((s) => -s), tras = [];
for (let i = 1; i < emis.length; i++) {
  const novo = new Array(K), de = new Array(K);
  let melhor = 0; for (let k = 1; k < K; k++) if (custo[k] < custo[melhor]) melhor = k;
  for (let k = 0; k < K; k++) {
    if (custo[k] <= custo[melhor] + PEN) { novo[k] = custo[k] - emis[i][k]; de[k] = k; } else { novo[k] = custo[melhor] + PEN - emis[i][k]; de[k] = melhor; }
  }
  custo = novo; tras.push(de);
}
let k = 0; for (let j = 1; j < K; j++) if (custo[j] < custo[k]) k = j;
const caminho = new Array(emis.length); caminho[emis.length - 1] = k;
for (let i = emis.length - 1; i > 0; i--) { k = tras[i - 1][k]; caminho[i - 1] = k; }

// 4) segmentos; some com trechos menores que 0,6 s
let segs = [];
for (let i = 0; i < caminho.length; i++) {
  const id = caminho[i] < ids.length ? ids[caminho[i]] : null;
  const t = Math.max(0, quadros[i].t - HOP / SR / 2);
  if (!segs.length || segs[segs.length - 1].id !== id) segs.push({ id, t });
}
segs.forEach((s, i) => { s.fim = i + 1 < segs.length ? segs[i + 1].t : dur; });
segs = segs.filter((s) => s.fim - s.t >= 0.6);
const juntos = [];
for (const s of segs) { if (juntos.length && juntos[juntos.length - 1].id === s.id) continue; juntos.push({ id: s.id, t: Math.round(s.t * 100) / 100 }); }

const resultado = { duracao: Math.round(dur * 100) / 100, afinacaoCents: Math.round(desvio * 100), acordes: juntos };
console.log('duração', resultado.duracao, 's · afinação', resultado.afinacaoCents, 'cents ·', juntos.length, 'trechos');
console.log(juntos.map((s) => s.t.toFixed(1).padStart(6) + ' ' + (s.id || '-')).join('\n'));
if (saida) fs.writeFileSync(saida, JSON.stringify(resultado));
