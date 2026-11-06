/* 学会大会カレンダー — オフライン用サービスワーカー
   HTML と events.json はネットワーク優先（更新をすぐ反映）、それ以外はキャッシュ優先。 */
var CACHE = 'gakkai-calendar-v2';
var ASSETS = [
  './',
  './index.html',
  './events.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return k===CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  var fresh = req.mode === 'navigate' || /events\.json$/.test(url.pathname);
  if(fresh){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req.mode === 'navigate' ? './index.html' : './events.json', copy); });
        return res;
      }).catch(function(){
        return caches.match(req.mode === 'navigate' ? './index.html' : './events.json');
      })
    );
    return;
  }
  e.respondWith(caches.match(req).then(function(hit){ return hit || fetch(req); }));
});
