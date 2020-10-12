var version = 'v0.16'
var OFFLINE_URL = '/offline.html'


if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/serviceWorker.js').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    })
  })
}

var CACHE_NAME = 'tuulikartta-cache';
var urlsToCache = [
  '/',
  '/offline.html',
  '/css/style.css'
];

self.addEventListener('install', function(event) {
  // Perform install steps
  event.waitUntil(
    caches
      .open(CACHE_NAME + version)
      .then(function(cache) {
        // console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  )
})

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          // console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
})

self.addEventListener('fetch', function(event) {

  if (event.request.mode !== 'navigate') {
    // Not a page navigation, bail.
    return;
  }

  if ( event.request.url.indexOf( '/php/' ) !== -1 ) {
    // console.log(event.request.url)
    // console.log(event)
    return false
  }

  // event.respondWith(
  //   fetch(evt.request)
  //     .catch(() => {
  //       return caches.open(CACHE_NAME)
  //         .then((cache) => {
  //           return cache.match('offline.html');
  //         });
  //     })
  // );

  // request.mode = navigate isn't supported in all browsers
  // so include a check for Accept: text/html header.
  if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request.url).catch(error => {
        // Return the offline page
        console.log('offline!')
        return caches.match(OFFLINE_URL);
      })
  );
  } else {
      // Respond with everything else if we can
      event.respondWith(caches.match(event.request)
        .then(function (response) {
          return response || fetch(event.request);
          })
        );
    }
  })

caches.keys().then(function(names) {
  for (let name of names)
    if(name !== CACHE_NAME + version)
      caches.delete(name);
});
