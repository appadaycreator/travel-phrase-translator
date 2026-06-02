// Service Worker for Travel Phrase Translator - オフライン対応
const CACHE_VERSION = 'travel-phrase-v2.1';
const CACHE_ASSETS = CACHE_VERSION + '-assets';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/robots.txt',
  '/ads.txt'
];

// インストール時にアセットキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_ASSETS).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(() => {
      console.log('Cache install failed, continuing...');
      return Promise.resolve();
    })
  );
  self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_ASSETS) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy: ネットワーク優先、失敗時はキャッシュ
self.addEventListener('fetch', event => {
  // POST や blob 要求はスキップ
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 成功時はキャッシュに追加
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_ASSETS).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // ネットワーク失敗時はキャッシュから返す
        return caches.match(event.request).then(response => {
          return response || new Response('オフラインです。ネットワークに接続してください。', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
          });
        });
      })
  );
});
