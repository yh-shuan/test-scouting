const CACHE_NAME = 'scouter-v147'; // 每次更新記得改這個
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './test.js',
    './style.css',
    './mainfest.json'
];


self.addEventListener('install', (event) => {
    // ⭐ 強制跳過等待，直接進入 activate 階段
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    // ⭐ 讓新版 SW 立刻接管所有開啟的視窗 (Clients)
    event.waitUntil(clients.claim()); 
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// 抓取策略建議：改為「網路優先」，保證有網路時抓到最新隊伍，沒網路用快取
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});