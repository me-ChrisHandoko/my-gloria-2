/**
 * Service Worker for Gloria System
 * Production-ready offline caching and PWA support
 */

const CACHE_NAME = "gloria-v1";
const RUNTIME_CACHE = "gloria-runtime-v1";
const API_CACHE = "gloria-api-v1";

// Files to cache on install (app shell)
const STATIC_CACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/v1\/users\/me$/,
  /\/api\/v1\/permissions$/,
  /\/api\/v1\/system\/config$/,
  /\/api\/v1\/system\/features$/,
];

// Network-first endpoints (always try fresh data)
const NETWORK_FIRST_PATTERNS = [
  /\/api\/v1\/notifications/,
  /\/api\/v1\/workflows\/executions/,
  /\/api\/v1\/system\/health/,
];

// Cache-first endpoints (use cache when available)
const CACHE_FIRST_PATTERNS = [
  /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/,
  /\/fonts\//,
  /\/images\//,
];

// Install event - cache app shell
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Install");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[ServiceWorker] Caching app shell");
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log("[ServiceWorker] Skip waiting");
        return self.skipWaiting();
      })
  );
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activate");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== RUNTIME_CACHE &&
              cacheName !== API_CACHE
            ) {
              console.log("[ServiceWorker] Removing old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[ServiceWorker] Claiming clients");
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip Chrome extensions, dev tools, hot reload, etc.
  if (
    url.protocol === "chrome-extension:" ||
    (url.hostname === "localhost" && url.port === "3001") || // Skip backend API in dev
    url.pathname.includes("__webpack") ||
    url.pathname.includes("_next/webpack") ||
    url.pathname.includes("hot-update")
  ) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (CACHE_FIRST_PATTERNS.some((pattern) => pattern.test(request.url))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default to network first
  event.respondWith(networkFirst(request));
});

// Strategy: Cache First
async function cacheFirst(request) {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Update cache in background
      fetchAndCache(request, RUNTIME_CACHE);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error("[ServiceWorker] Cache first failed:", error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return offlineResponse();
  }
}

// Strategy: Network First
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error("[ServiceWorker] Network first failed:", error);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // For navigation requests, show offline page
    if (request.mode === "navigate") {
      return caches.match("/offline.html");
    }

    return offlineResponse();
  }
}

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // Network-first for real-time data
  if (NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    try {
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        const cache = await caches.open(API_CACHE);
        cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Add header to indicate stale data
        const headers = new Headers(cachedResponse.headers);
        headers.set("X-From-Cache", "true");
        headers.set(
          "X-Cache-Time",
          new Date(cachedResponse.headers.get("date")).toISOString()
        );

        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers,
        });
      }

      return apiErrorResponse();
    }
  }

  // Cache-first for stable data
  if (API_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Check if cache is still fresh (5 minutes)
      const cacheTime = new Date(cachedResponse.headers.get("date"));
      const now = new Date();
      const cacheAge = (now - cacheTime) / 1000 / 60; // in minutes

      if (cacheAge < 5) {
        // Update in background for next time
        fetchAndCache(request, API_CACHE);
        return cachedResponse;
      }
    }

    try {
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    } catch (error) {
      if (cachedResponse) {
        return cachedResponse;
      }
      return apiErrorResponse();
    }
  }

  // Default: try network, fallback to cache
  try {
    return await fetch(request);
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || apiErrorResponse();
  }
}

// Background fetch and cache update
async function fetchAndCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silent fail - this is background update
  }
}

// Offline response for general requests
function offlineResponse() {
  return new Response(
    JSON.stringify({
      error: "Offline",
      message: "You are currently offline. Please check your connection.",
    }),
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: new Headers({
        "Content-Type": "application/json",
        "X-From-Cache": "offline",
      }),
    }
  );
}

// API error response
function apiErrorResponse() {
  return new Response(
    JSON.stringify({
      error: "Network Error",
      message:
        "Unable to connect to the server. Showing cached data if available.",
      offline: true,
    }),
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: new Headers({
        "Content-Type": "application/json",
        "X-From-Cache": "error",
      }),
    }
  );
}

// Message event - handle commands from the app
self.addEventListener("message", (event) => {
  console.log("[ServiceWorker] Message received:", event.data);

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "CLEAR_CACHE") {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }

  if (event.data.type === "CACHE_URLS") {
    const urls = event.data.urls;
    caches.open(RUNTIME_CACHE).then((cache) => {
      cache.addAll(urls);
    });
  }
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[ServiceWorker] Background sync:", event.tag);

  if (event.tag === "sync-api-data") {
    event.waitUntil(syncApiData());
  }
});

async function syncApiData() {
  try {
    // Sync critical data when coming back online
    const criticalEndpoints = [
      "/users/me",
      "/notifications/unread",
      "/system/health",
    ];

    const cache = await caches.open(API_CACHE);

    await Promise.all(
      criticalEndpoints.map(async (endpoint) => {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            await cache.put(endpoint, response);
          }
        } catch (error) {
          console.error(`[ServiceWorker] Failed to sync ${endpoint}:`, error);
        }
      })
    );

    // Notify clients about successful sync
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_COMPLETE",
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error("[ServiceWorker] Sync failed:", error);
  }
}

// Push notifications
self.addEventListener("push", (event) => {
  console.log("[ServiceWorker] Push received");

  const options = {
    body: event.data ? event.data.text() : "New notification from Gloria",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    vibrate: [200, 100, 200],
    data: {
      timestamp: Date.now(),
    },
    actions: [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification("Gloria System", options));
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[ServiceWorker] Notification click:", event.action);

  event.notification.close();

  if (event.action === "view") {
    event.waitUntil(clients.openWindow("/notifications"));
  }
});
