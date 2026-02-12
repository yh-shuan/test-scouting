const CACHE_NAME = 'scouter-v151';
// 這裡修正了 manifest 的拼字錯誤
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './test.js',
    './style.css',
    './manifest.json' 
];

// 1. 安裝：把檔案通通存起來
self.addEventListener('install', (event) => {
    // 強制跳過等待，讓新的 SW 立即生效
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ PWA: 正在緩存靜態資源...');
            // 如果這行報錯，通常是因為上面的檔名在資料夾裡找不到
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. 啟動：清理舊版快取
self.addEventListener('activate', (event) => {
    // 讓 SW 立即取得頁面控制權
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

// 3. 抓取：離線開啟的關鍵，並處理版本號請求
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// 4. 監聽訊息：回傳版本號給 test.js
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME
        });
    }
});