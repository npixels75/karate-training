// Service worker : précache tout le site pour un fonctionnement hors ligne.
// Incrémenter CACHE_VERSION à chaque modification d'un fichier servi.
const CACHE_VERSION = 'v1';
const CACHE = `kumite-${CACHE_VERSION}`;
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/engine.js',
  'js/audio.js',
  'js/storage.js',
  'js/screen.js',
  'js/programs.js',
  'data/attacks.json',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'assets/attacks/eri-tori-chudan.svg',
  'assets/attacks/guard.svg',
  'assets/attacks/gyaku-zuki-chudan.svg',
  'assets/attacks/gyaku-zuki-jodan.svg',
  'assets/attacks/kizami-zuki-chudan.svg',
  'assets/attacks/kizami-zuki-jodan.svg',
  'assets/attacks/mae-geri-chudan.svg',
  'assets/attacks/mae-geri-gedan.svg',
  'assets/attacks/mae-geri-jodan.svg',
  'assets/attacks/mawashi-geri-chudan.svg',
  'assets/attacks/mawashi-geri-jodan.svg',
  'assets/attacks/oi-zuki-chudan.svg',
  'assets/attacks/oi-zuki-jodan.svg',
  'assets/attacks/ura-mawashi-geri-jodan.svg',
  'assets/attacks/uraken-uchi-jodan.svg',
  'assets/attacks/ushiro-geri-chudan.svg',
  'assets/attacks/yoko-geri-kekomi-chudan.svg',
  'assets/attacks/yoko-geri-kekomi-jodan.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('kumite-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Cache d'abord, réseau en secours (et mise en cache des nouveaux fichiers du même site).
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    })),
  );
});
