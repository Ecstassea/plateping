const VERSION = "v6";
const ASSET_CACHE = `plateping-assets-${VERSION}`;
const PAGE_CACHE = `plateping-pages-${VERSION}`;
const CURRENT_CACHES = [ASSET_CACHE, PAGE_CACHE];

const OFFLINE_URL = "/offline";
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/badge-96.png",
];

// Zimbabwean mobile data can stall for a long time without failing. Stop waiting
// and show something we already hold rather than leaving a blank screen.
const NAVIGATION_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ASSET_CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key)));
      if (self.registration.navigationPreload) {
        // Starts the network request while the worker is still booting.
        await self.registration.navigationPreload.enable().catch(() => undefined);
      }
      await self.clients.claim();
    })(),
  );
});

function isCacheableResponse(response) {
  return Boolean(response) && response.status === 200 && response.type === "basic";
}

// Build output under /_next/static is content-hashed, so it never changes in place.
function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

function isStaticAsset(url) {
  return /\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|css|js|json)$/.test(url.pathname);
}

// Signed-in screens and invite links are per-person, so they never go in a
// cache that anyone holding the phone can read back.
function isPrivatePath(url) {
  return url.pathname === "/app" || url.pathname.startsWith("/app/") || url.pathname.startsWith("/join");
}

// React Server Component payloads share a URL with the HTML document. Caching
// them under the same key hands a payload back as a page and blanks the screen.
function isRscRequest(request, url) {
  return request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    void cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (isCacheableResponse(response)) {
        void cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    void network;
    return cached;
  }
  const response = await network;
  return response || Response.error();
}

async function handleNavigation(event) {
  const request = event.request;
  const url = new URL(request.url);
  const cache = await caches.open(PAGE_CACHE);
  const cached = isPrivatePath(url) ? undefined : await cache.match(request);

  const network = (async () => {
    const preloaded = event.preloadResponse ? await event.preloadResponse : undefined;
    const response = preloaded || (await fetch(request));
    if (!isPrivatePath(url) && isCacheableResponse(response)) {
      void cache.put(request, response.clone());
    }
    return response;
  })();

  if (!cached) {
    try {
      return await network;
    } catch {
      return (await caches.match(OFFLINE_URL)) || Response.error();
    }
  }

  // Something is already on disk, so give the network a short head start only.
  let timer;
  const fallback = new Promise((resolve) => {
    timer = setTimeout(() => resolve(cached), NAVIGATION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([network, fallback]);
  } catch {
    return cached;
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (isRscRequest(request, url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") {
    void self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "PlatePing", body: "A watched plate was listed.", url: "/app/alerts" };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // Keep the fallback text.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      data: { url: data.url || "/app/alerts" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/app/alerts";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(target).catch(() => undefined);
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
