// Service Worker —— 离线缓存
// 策略:联网时优先取最新文件(并更新缓存),断网时才用缓存。这样每次更新内容,手机打开就能看到。
// 更新内容时,把 CACHE_VERSION 改一下(如 v1 -> v2),确保新版本被安装。

const CACHE_VERSION = "kepu-v13";

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

// 安装:预缓存所有资源。cache: "reload" 强制从服务器重新下载,避免拿到浏览器里的旧副本
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(ASSETS.map((url) => new Request(url, { cache: "reload" })))
    )
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

// 请求拦截:网络优先。联网时向服务器确认最新版本(no-cache 会做协商,文件没变时开销很小)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return; // 只处理本站资源

  event.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((resp) => {
        if (resp && resp.status === 200 && resp.type === "basic") {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return resp;
      })
      .catch(() =>
        // 断网:用缓存;导航请求找不到时回退到首页
        caches.match(req, { ignoreSearch: true }).then(
          (cached) => cached || (req.mode === "navigate" ? caches.match("./index.html") : undefined)
        )
      )
  );
});
