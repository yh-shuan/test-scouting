const CACHE_NAME = 'scouter-v100';
// 這裡列出你所有需要離線使用的檔案名稱
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './test.js',
    './style.css',
    './mainfest.json'
];

// 1. 安裝：把檔案通通存起來
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ PWA: 正在緩存靜態資源...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. 啟動：清理舊版快取（如果你以後改了 v1 到 v2，它會幫你清空舊的）
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// 3. 抓取：這是離線開啟的關鍵
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // 如果快取裡有，就直接給快取；沒有才去網路上抓
            return response || fetch(event.request);
        })
    );
});