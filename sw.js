// Service worker của Zeno. Tăng số VERSION mỗi khi muốn ép máy người dùng tải lại bản mới.
const VERSION = "zeno-v1";
const SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Không bao giờ đụng vào API, đăng nhập, hay site khác: luôn đi thẳng ra mạng
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  // Trang chính: ưu tiên mạng (luôn bản mới nhất), mất mạng mới dùng bản đã lưu
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((r) => {
        const copy = r.clone();
        caches.open(VERSION).then((c) => c.put("/", copy)).catch(() => {});
        return r;
      }).catch(() => caches.match("/"))
    );
    return;
  }
  // File tĩnh (icon, manifest...): lấy từ bộ nhớ, đồng thời cập nhật ngầm
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => {
        if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {}); }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
