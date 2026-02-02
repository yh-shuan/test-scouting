self.addEventListener('install', (e) => {
    console.log('Service Worker: 已安裝');
});

self.addEventListener('fetch', (e) => {
    // 這裡暫時空著，讓請求直接通過
});