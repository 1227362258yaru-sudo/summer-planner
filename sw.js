/* 地球online 暑假工作台 - Service Worker */
const CACHE_NAME = 'earth-online-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] 预缓存核心资源');
      return cache.addAll(ASSETS);
    }).then(() => {
      // 跳过等待，立即激活
      return self.skipWaiting();
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME)
            .map(k => caches.delete(k))
      );
    }).then(() => {
      // 立即控制所有客户端
      return self.clients.claim();
    })
  );
});

// 拦截请求：Cache First 策略（静态资源），网络回退并缓存
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // 忽略非同源请求（如外链图片、CDN）
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // 命中缓存：后台更新
        fetch(event.request).then((resp) => {
          if (resp && resp.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, resp.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      // 未命中：走网络，成功后缓存
      return fetch(event.request).then((resp) => {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') {
          return resp;
        }
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, respClone));
        return resp;
      }).catch(() => {
        // 离线且无缓存：返回首页（SPA 友好）
        return caches.match('./index.html');
      });
    })
  );
});

// 接收消息：手动触发更新
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
