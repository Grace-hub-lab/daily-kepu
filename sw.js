// Service Worker —— 离线缓存
// 作用:首次联网打开后,把所有资源缓存到本机;之后即使断网也能打开(加到桌面后像 App 一样秒开)。
// 更新内容时,把 CACHE_VERSION 改一下(如 v1 -> v2),用户下次联网打开即自动更新缓存。

const CACHE_VERSION = "kepu-v11";

// 要缓存的资源(用相对路径,适配任意部署目录)
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./data.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-180-v2.png",
  "./icon-192-v2.png",
  "./icon-512-v2.png",
];

// 安装:预缓存所有资源
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 激活:清理旧版本缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截:缓存优先,命中直接返回;未命中走网络并顺手缓存
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          // 只缓存同源的成功响应
          if (resp && resp.status === 200 && resp.type === "basic") {
            const copy = resp.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return resp;
        })
        .catch(() => {
          // 离线且无缓存时,导航请求回退到首页
          if (req.mode === "navigate") return caches.match("./index.html");
        });
    })
  );
});
