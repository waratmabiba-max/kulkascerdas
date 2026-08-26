// ============================================
// SERVICE WORKER - KUMPULKAN CERDAS
// ============================================

const CACHE_NAME = 'kulkas-cerdas-v3';
const OFFLINE_URL = '/offline';

// Assets yang di-cache
const urlsToCache = [
  '/',
  '/dashboard',
  '/auth/login',
  '/manifest.json',
  '/api/icon?size=192',
  '/api/icon?size=512',
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Opening cache...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ All assets cached successfully');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('❌ Cache failed:', err);
      })
  );
});

// Activate - bersihkan cache lama
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch - serve dari cache jika ada
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls (biarkan online)
  if (url.pathname.startsWith('/api/')) return;

  // Skip Supabase calls
  if (url.hostname.includes('supabase.co')) return;

  // Skip Next.js internal
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Jika ada di cache, return
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika tidak ada, fetch dari network
        return fetch(event.request)
          .then((response) => {
            // Cek valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response untuk cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                try {
                  cache.put(event.request, responseToCache);
                } catch (err) {
                  console.log('Cache put error:', err);
                }
              });

            return response;
          })
          .catch(() => {
            // Jika offline dan tidak ada cache, tampilkan halaman offline
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
      })
  );
});
