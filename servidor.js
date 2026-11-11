// Servidor local do Violão de Bolso (sem dependências).
//   PC:      http://localhost:8080
//   Celular: https://<ip-do-pc>:8443  (mesma rede Wi-Fi)
// O navegador só libera o microfone em https ou em localhost, por isso o
// celular usa https com um certificado gerado aqui mesmo.
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PORTA_HTTP = Number(process.env.PORTA_HTTP) || 8080;
const PORTA_HTTPS = Number(process.env.PORTA_HTTPS) || 8443;
const RAIZ = path.join(__dirname, 'app');
const PASTA_CERT = path.join(__dirname, 'certificado');
const CHAVE = path.join(PASTA_CERT, 'chave.pem');
const CERT = path.join(PASTA_CERT, 'certificado.pem');

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

function ipsDaRede() {
  const ips = [];
  for (const lista of Object.values(os.networkInterfaces())) {
    for (const i of lista || []) if (i.family === 'IPv4' && !i.internal) ips.push(i.address);
  }
  // prioriza redes domésticas comuns
  return ips.sort((a, b) => (b.startsWith('192.168.') - a.startsWith('192.168.')));
}

function acharOpenssl() {
  const candidatos = ['openssl', 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe', 'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe'];
  for (const c of candidatos) {
    try { execFileSync(c, ['version'], { stdio: 'ignore' }); return c; } catch (e) { /* tenta o próximo */ }
  }
  return null;
}

function garantirCertificado() {
  if (fs.existsSync(CHAVE) && fs.existsSync(CERT)) return true;
  const openssl = acharOpenssl();
  if (!openssl) {
    console.log('\n[aviso] OpenSSL não encontrado: o endereço https para o celular não vai funcionar.');
    console.log('        Instale o Git para Windows (que traz o OpenSSL) e rode de novo.\n');
    return false;
  }
  fs.mkdirSync(PASTA_CERT, { recursive: true });
  const san = ['DNS:localhost', 'IP:127.0.0.1', ...ipsDaRede().map((ip) => 'IP:' + ip)].join(',');
  execFileSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '825',
    '-keyout', CHAVE, '-out', CERT, '-subj', '/CN=Violao de Bolso (local)', '-addext', 'subjectAltName=' + san], { stdio: 'ignore' });
  console.log('Certificado local criado em', PASTA_CERT);
  return true;
}

function responder(req, res, protocolo) {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/enderecos') {
    const ips = ipsDaRede();
    const corpo = JSON.stringify({
      http: ['http://localhost:' + PORTA_HTTP],
      https: temHttps ? ips.map((ip) => `https://${ip}:${PORTA_HTTPS}`) : []
    });
    res.writeHead(200, { 'Content-Type': TIPOS['.json'], 'Cache-Control': 'no-store' });
    res.end(corpo);
    return;
  }
  let caminho = decodeURIComponent(url.pathname);
  if (caminho.endsWith('/')) caminho += 'index.html';
  const arquivo = path.normalize(path.join(RAIZ, caminho));
  if (!arquivo.startsWith(RAIZ)) { res.writeHead(403); res.end('Proibido'); return; }
  fs.stat(arquivo, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': TIPOS['.txt'] }); res.end('Não encontrado'); return; }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(arquivo).pipe(res);
  });
  if (process.env.LOG) console.log(protocolo, req.method, url.pathname);
}

let temHttps = false;
http.createServer((q, r) => responder(q, r, 'http')).listen(PORTA_HTTP, '0.0.0.0', () => {
  console.log('\n  Violão de Bolso rodando!\n');
  console.log('  No computador:  http://localhost:' + PORTA_HTTP);
});

try {
  if (garantirCertificado()) {
    const opcoes = { key: fs.readFileSync(CHAVE), cert: fs.readFileSync(CERT) };
    https.createServer(opcoes, (q, r) => responder(q, r, 'https')).listen(PORTA_HTTPS, '0.0.0.0', () => {
      temHttps = true;
      const ips = ipsDaRede();
      if (ips.length) {
        console.log('  No celular (mesmo Wi-Fi):');
        ips.forEach((ip) => console.log(`                  https://${ip}:${PORTA_HTTPS}`));
        console.log('\n  O celular vai avisar que o certificado não é confiável.');
        console.log('  Toque em "Avançado" e depois em "Continuar" (é o seu próprio PC).');
        console.log('  Se o Windows perguntar sobre o Firewall, permita em "Redes privadas".');
      }
      console.log('\n  Para parar: feche esta janela ou aperte Ctrl+C.\n');
    });
  }
} catch (e) {
  console.log('[aviso] Não consegui iniciar o https:', e.message);
}
