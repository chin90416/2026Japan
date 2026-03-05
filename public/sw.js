const CACHE_NAME = 'image-cache-v1';

// 我們想攔截的網域（Firebase Storage 的圖資源網址通常帶有這個主機名稱）
const TARGET_DOMAIN = 'firebasestorage.googleapis.com';

// 安裝 Service Worker 
self.addEventListener('install', (event) => {
    // 強制立即啟動並跳過等待
    self.skipWaiting();
});

// 啟動階段 
self.addEventListener('activate', (event) => {
    // 立即接管所有的頁面，清除舊版快取
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 攔截網路請求 
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 只有我們目標網域 (Firebase Storage) 的 GET 請求，而且不包含 token，才進行快取
    if (requestUrl.hostname.includes(TARGET_DOMAIN) && event.request.method === 'GET') {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    // 1. 如果有快取，直接回傳給 APP，無網路損耗
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // 2. 如果沒有快取，發送原始網路請求
                    return fetch(event.request).then((networkResponse) => {
                        // 如果請求失敗，或者不是 200 OK 的回應，就不要快取
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
                            return networkResponse;
                        }

                        // 3. 請求成功，克隆一份 Response 存入快取
                        const responseToCache = networkResponse.clone();
                        cache.put(event.request, responseToCache);

                        // 4. 將結果回傳給 APP
                        return networkResponse;
                    }).catch(err => {
                        // 離線且無快取的情況
                        console.error('Fetch error:', err);
                        throw err;
                    });
                });
            })
        );
    }
});
