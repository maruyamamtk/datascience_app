/*
 * Service Worker（手動実装 / Issue #7）。
 * 目的: 受け入れ条件「閲覧済みトピックがオフラインで開ける」を満たす。
 *
 * 戦略:
 *  - ナビゲーション(HTML): network-first → 失敗時はキャッシュ → 無ければ /offline。
 *    一度開いたページは runtime キャッシュに残るのでオフラインで再訪できる。
 *  - 静的アセット(_next/static, 画像, フォント, css/js): stale-while-revalidate。
 *    まずキャッシュを返し、裏で更新。初回表示を軽くしつつ最新化する。
 *  - manifest 変更時はキャッシュ名の VERSION を上げて旧キャッシュを破棄する。
 */
const VERSION = "v1";
const PRECACHE = `precache-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const OFFLINE_URL = "/offline";

// オフライン時の最低限の足場（オフライン用ページとトップ）。
const PRECACHE_URLS = ["/", OFFLINE_URL, "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // 1つでも失敗すると install が落ちるため、取得可能なものだけ個別に入れる。
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (res.ok) await cache.put(url, res.clone());
          } catch {
            /* オフライン install などは無視 */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== PRECACHE && k !== RUNTIME).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|gif|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // 同一オリジンのみ扱う（外部 CDN 等は素通し）。
  if (url.origin !== self.location.origin) return;

  // ページ遷移（HTML）: network-first → cache → offline。
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return (
            offline ||
            new Response("オフラインです。", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  // 静的アセット: stale-while-revalidate。
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
  }
});
