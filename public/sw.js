// AI 剧本工坊 — Service Worker
// 策略：Network-first（API 请求） + Cache-first（静态资源）

const CACHE_NAME = 'ai-screenplay-v1';
const STATIC_ASSETS = [
  '/',
  '/convert',
  '/editor',
  '/manifest.json',
  '/icon.svg',
];

// 安装：预缓存关键页面
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 请求拦截
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 请求：Network-first（始终尝试网络，失败则返回离线提示）
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ success: false, error: '网络不可用，请检查网络连接' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        )
      )
    );
    return;
  }

  // 静态资源 & 页面：Network-first，离线时从缓存读取
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 成功获取后缓存一份
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
