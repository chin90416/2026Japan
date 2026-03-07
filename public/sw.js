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

    // 只有我們目標網域 (Firebase Storage) 的 GET 請求進行快取
    if (requestUrl.hostname.includes(TARGET_DOMAIN) && event.request.method === 'GET') {

        // 核心修正：Firebase Storage 網址帶有動態 token (安全權杖)
        // 為了確保「同一張圖片」不論在哪個當下讀取都能精確命中快取
        // 我們要把網址後面的 ?alt=media&token=xxx 全部拔掉，只用乾淨的基礎路徑作為快取鑰匙
        const cleanUrl = requestUrl.origin + requestUrl.pathname;

        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                // 使用乾淨的網址尋找快取
                return cache.match(cleanUrl).then((cachedResponse) => {
                    // 1. 若本地已經有完美快取，直接以光速丟回給 APP，不消耗網路
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // 2. 若快取沒有，乖乖發送原始帶有 token 的正常網路請求去抓新圖
                    return fetch(event.request).then((networkResponse) => {
                        // 確保拿回來的圖片是正常的 (包含跨域不透明 opaque 回應)
                        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
                            return networkResponse;
                        }

                        // 3. 將抓到的新圖片複製一份，綁定「乾淨網址」放入快取金庫中永久保存
                        const responseToCache = networkResponse.clone();
                        cache.put(cleanUrl, responseToCache);

                        // 4. 並把原生回應丟回去給 APP 渲染
                        return networkResponse;
                    }).catch(err => {
                        console.log('圖片抓取失敗 (可能離線):', err);
                        throw err;
                    });
                });
            })
        );
    }
});
