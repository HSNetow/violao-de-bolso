// Gera os ícones PNG do app (palheta com 3 cordas) sem dependências.
// Rode com:  node ferramentas/gerar-icones.js
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const FUNDO = [0x15, 0x11, 0x0e];
const PALHETA = [0xee, 0x9f, 0x45];
const ESCURO = [0x1b, 0x12, 0x06];

// contorno da palheta (coordenadas no quadro 512x512), curvas cúbicas
const CURVAS = [
  [[256, 92], [170, 92], [106, 122], [106, 184]],
  [[106, 184], [106, 258], [176, 360], [232, 412]],
  [[232, 412], [246, 425], [266, 425], [280, 412]],
  [[280, 412], [336, 360], [406, 258], [406, 184]],
  [[406, 184], [406, 122], [342, 92], [256, 92]]
];
const poligono = [];
for (const [p0, p1, p2, p3] of CURVAS) {
  for (let i = 0; i < 40; i++) {
    const t = i / 40, u = 1 - t;
    poligono.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
    ]);
  }
}
function dentroPoligono(x, y) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i], [xj, yj] = poligono[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}
const CORDAS = [[206, 150, 330], [256, 140, 370], [306, 150, 330]];
function naCorda(x, y) {
  for (const [cx, y0, y1] of CORDAS) {
    const yy = Math.max(y0, Math.min(y1, y));
    if ((x - cx) ** 2 + (y - yy) ** 2 <= 25) return true;
  }
  return false;
}
function noFundoArredondado(x, y) {
  const r = 112;
  const cx = Math.max(r, Math.min(512 - r, x)), cy = Math.max(r, Math.min(512 - r, y));
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

// cor de um ponto do desenho (null = transparente)
function corEm(x, y, quadrado) {
  if (!quadrado && !noFundoArredondado(x, y)) return null;
  if (dentroPoligono(x, y)) {
    if (naCorda(x, y) || (x - 256) ** 2 + (y - 226) ** 2 <= 400) return ESCURO;
    return PALHETA;
  }
  return FUNDO;
}

function desenhar(tam, quadrado) {
  const px = Buffer.alloc(tam * tam * 4);
  const S = 4; // 4x4 amostras por pixel (antisserrilhado)
  const esc = 512 / tam;
  for (let py = 0; py < tam; py++) {
    for (let pxx = 0; pxx < tam; pxx++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const c = corEm((pxx + (sx + 0.5) / S) * esc, (py + (sy + 0.5) / S) * esc, quadrado);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
        }
      }
      const i = (py * tam + pxx) * 4;
      if (a) { px[i] = Math.round(r / a); px[i + 1] = Math.round(g / a); px[i + 2] = Math.round(b / a); }
      px[i + 3] = Math.round(255 * a / (S * S));
    }
  }
  return png(tam, tam, px);
}

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function bloco(tipo, dados) {
  const t = Buffer.from(tipo, 'ascii');
  const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
  return Buffer.concat([tam, t, dados, crc]);
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const linhas = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    linhas[y * (w * 4 + 1)] = 0;
    rgba.copy(linhas, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(linhas, { level: 9 })), bloco('IEND', Buffer.alloc(0))
  ]);
}

const destino = path.join(__dirname, '..', 'app');
const saidas = [
  ['icone-192.png', 192, false],
  ['icone-512.png', 512, false],
  ['icone-mascara-512.png', 512, true],
  ['icone-apple-180.png', 180, true]
];
for (const [nome, tam, quadrado] of saidas) {
  const buf = desenhar(tam, quadrado);
  fs.writeFileSync(path.join(destino, nome), buf);
  console.log(nome, buf.length, 'bytes');
}
