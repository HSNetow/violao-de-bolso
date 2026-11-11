// Guarda os arquivos do app para abrir mesmo sem internet.
// Estratégia: tenta a rede primeiro (pega sempre a versão nova) e usa o cache se falhar.
const CACHE = 'violao-de-bolso-v6';
const ARQUIVOS = [
  './', 'index.html', 'css/estilo.css', 'manifest.webmanifest', 'icone.svg',
  'icone-192.png', 'icone-512.png', 'icone-mascara-512.png', 'icone-apple-180.png',
  'js/teoria.js', 'js/dsp.js', 'js/conteudo.js', 'js/estado.js', 'js/ui.js',
  'js/audio.js', 'js/pista.js', 'js/licoes.js', 'js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;
  const guardar = url.origin === self.location.origin || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  e.respondWith(
    fetch(req)
      .then((resp) => {
        if (guardar && resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return resp;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
