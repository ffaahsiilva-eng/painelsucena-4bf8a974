import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

const PREVIEW_HOST_FRAGMENTS = ["id-preview--", "lovableproject.com"];
const isPreviewRuntime = PREVIEW_HOST_FRAGMENTS.some((fragment) => self.location.hostname.includes(fragment));

self.addEventListener("install", () => {
  self.skipWaiting();
});

if (isPreviewRuntime) {
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        await self.clients.claim();

        const controlledClients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        const cacheKeys = await self.caches.keys();
        await Promise.all(cacheKeys.map((cacheKey) => self.caches.delete(cacheKey).catch(() => false)));

        await self.registration.unregister();

        await Promise.all(
          controlledClients.map((client) => {
            if (typeof client.navigate !== "function") {
              return Promise.resolve();
            }

            try {
              const clientUrl = new URL(client.url);
              clientUrl.searchParams.set("preview-bust", `${Date.now()}`);
              return client.navigate(clientUrl.toString());
            } catch {
              return Promise.resolve();
            }
          }),
        );
      })(),
    );
  });
} else {
  clientsClaim();
  precacheAndRoute(self.__WB_MANIFEST);
  cleanupOutdatedCaches();

  // Navegações NÃO usam o index.html do precache: um index antigo aponta para
  // chunks JS que já não existem no servidor, o que causava erro + recarregamento
  // em loop no celular. O handler de fetch abaixo faz network-first com fallback
  // offline apenas quando a rede realmente falha.


  // Autenticação e API do banco NUNCA passam pelo cache do service worker.
  registerRoute(
    ({ url }) => /\/(auth|rest|functions|realtime)\/v1\//.test(url.pathname),
    new NetworkOnly(),
  );

  registerRoute(({ url }) => url.origin === "https://fonts.googleapis.com", new CacheFirst({ cacheName: "google-fonts-cache" }));

  registerRoute(({ url }) => url.origin === "https://fonts.gstatic.com", new CacheFirst({ cacheName: "google-fonts-static" }));

  registerRoute(
    ({ request }) => request.destination === "image",
    new StaleWhileRevalidate({
      cacheName: "image-cache",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    }),
  );

  registerRoute(
    ({ url }) => /^https:\/\/.*\.supabase\.co\/storage\/.*/i.test(url.href),
    new NetworkFirst({
      cacheName: "supabase-storage",
      networkTimeoutSeconds: 4,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 150,
          maxAgeSeconds: 14 * 24 * 60 * 60,
        }),
      ],
    }),
  );

  // Explicit offline fallback for navigations — PWABuilder validators
  // require the SW to return a cached/synthetic response when offline.
  self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.mode !== "navigate") return;
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          return networkResponse;
        } catch {
          const cache = await caches.open("offline-fallback");
          const cached = await caches.match("/index.html");
          if (cached) return cached;
          const fallback = await cache.match("/offline.html");
          if (fallback) return fallback;
          return new Response(
            "<!doctype html><meta charset=utf-8><title>Offline</title><body style='font-family:system-ui;background:#0f0f23;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'><div style='text-align:center'><h1>Sem conexão</h1><p>Você está offline. Reconecte para continuar.</p></div></body>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
  });
}