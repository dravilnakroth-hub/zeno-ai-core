const CACHE = 'zeno-v1';
const ASSETS = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Chỉ xử lý GET cùng domain; bỏ qua /api/, Supabase, CDN, thanh toán
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  // Trang chính: ưu tiên mạng để luôn có bản mới, mất mạng thì dùng bản đã lưu
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('/', copy)); return r; })
        .catch(() => caches.match('/'))
    );
    return;
  }
  // File tĩnh (icon, manifest): ưu tiên bản đã lưu
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
