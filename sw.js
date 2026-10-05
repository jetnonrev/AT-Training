const CACHE="at-training-v8";
const ASSETS=["./manifest.webmanifest","./icon-192.svg","./icon-512.svg"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;

  // Always prefer the newest HTML/navigation response so app updates are visible quickly.
  if(e.request.mode==="navigate" || e.request.destination==="document"){
    e.respondWith(
      fetch(e.request,{cache:"no-store"})
        .then(resp=>{
          const copy=resp.clone();
          caches.open(CACHE).then(c=>c.put("./index.html",copy));
          return resp;
        })
        .catch(()=>caches.match("./index.html"))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request))
  );
});