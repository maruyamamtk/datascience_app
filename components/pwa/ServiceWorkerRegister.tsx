"use client";

import { useEffect } from "react";

/**
 * Service Worker 登録（クライアント側 / Issue #7）。
 * 本番ビルドでのみ /sw.js を登録する。開発中はキャッシュで HMR が壊れるため、
 * 既存の登録があれば解除して dev 体験を保つ。
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* 登録失敗時もアプリ自体は通常動作させる */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
