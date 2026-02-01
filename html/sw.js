const CACHE_NAME = 'scouting-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',  // 改成你實際的檔名
  './app.js',     // 改成你實際的檔名
  './mainfest.json' // 雖然建議改小寫，但先對齊你目前的檔名
];

// 安裝並快取檔案
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 攔截請求：如果沒網路，就從 Cache 拿檔案
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});