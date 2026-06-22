"use client";

import { useEffect, useRef, useState } from "react";

/**
 * FPS 計測オーバーレイ（Issue #7「操作 60fps 目標を計測」）。
 * URL に `?fps` を付けたときだけ表示する。本番ビルドでも実機（iPhone/PC）で
 * CLT トピックを操作しながら fps を目視計測できるようにするための簡易ツール。
 * requestAnimationFrame の間隔から直近 0.5 秒の平均 fps を出す。
 */
export function FpsMeter() {
  const [enabled, setEnabled] = useState(false);
  const [fps, setFps] = useState(0);
  const [low, setLow] = useState(Infinity);
  const raf = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEnabled(new URLSearchParams(window.location.search).has("fps"));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let frames = 0;
    let last = performance.now();

    const loop = (now: number) => {
      frames++;
      const elapsed = now - last;
      if (elapsed >= 500) {
        const current = Math.round((frames * 1000) / elapsed);
        setFps(current);
        setLow((prev) => Math.min(prev, current));
        frames = 0;
        last = now;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [enabled]);

  if (!enabled) return null;

  const color = fps >= 55 ? "#22c55e" : fps >= 40 ? "#eab308" : "#ef4444";
  return (
    <div
      className="fixed right-3 bottom-3 z-50 rounded-lg bg-slate-900/90 px-3 py-2 font-mono text-xs text-white tabular-nums shadow-lg"
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      <span style={{ color }}>{fps} fps</span>
      <span className="ml-2 text-slate-400">min {low === Infinity ? "—" : low}</span>
    </div>
  );
}
