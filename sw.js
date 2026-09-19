// Service worker de Winter Arc: guarda la app para que abra sin conexión.

const CACHE = 'winter-arc-v1';

const PRECARGA = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase.js',
  './manifest.webmanifest',
  './icono-180.png',
  './icono-192.png',
  './icono-512.png',
  './icono-512-maskable.png',
  'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECARGA)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        // Lo que venga de Firebase CDN o de Google Fonts se guarda para offline
        const url = e.request.url;
        if (resp.ok && (url.includes('gstatic.com') || url.includes('googleapis.com'))) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
