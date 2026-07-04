"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { KDE_RANGE, useKdeStore } from "@/lib/store/kernel-density-estimation";
import { buildBandwidthFrames } from "./frames";

const BANDWIDTHS = [0.1, 0.2, 0.35, 0.55, 0.9, 1.5];
const W = 360;
const H = 150;
const PAD = { top: 12, right: 12, bottom: 20, left: 28 };

const REGIME_COLOR = { under: "#dc2626", good: "#16a34a", over: "#d97706" } as const;

/**
 * 帯域幅 h を «過小平滑→最適→過大平滑» とコマ送りで変えるステッパー（描画層）。
 * 各 h で KDE 曲線（色は regime）と真の密度（灰破線）・ISE を見せ、中間の h で真の密度に最も近くなることを追う
 * （アルゴリズム図鑑スタイル）。データ・カーネルは上のラボと共有（useKdeStore）。フレーム位置は frame。
 */
export function BandwidthStepper() {
  const data = useKdeStore((s) => s.derived.data);
  const truthCurve = useKdeStore((s) => s.derived.truthCurve);
  const silverman = useKdeStore((s) => s.derived.silverman);
  const index = useKdeStore((s) => s.frame.index);
  const count = useKdeStore((s) => s.frame.count);
  const playing = useKdeStore((s) => s.frame.playing);
  const nextFrame = useKdeStore((s) => s.nextFrame);
  const prevFrame = useKdeStore((s) => s.prevFrame);
  const goToFrame = useKdeStore((s) => s.goToFrame);
  const setPlaying = useKdeStore((s) => s.setPlaying);
  const setFrameCount = useKdeStore((s) => s.setFrameCount);

  const frames = useMemo(
    () => buildBandwidthFrames(data, BANDWIDTHS, silverman),
    [data, silverman],
  );
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1200,
  });

  const frame = frameAt(frames, index);
  const curve = frame?.payload?.curve ?? [];
  const regime = frame?.payload?.regime ?? "good";

  const yMax = Math.max(...truthCurve.map((p) => p.y), ...curve.map((p) => p.y), 0.1) * 1.1;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const toX = (x: number) =>
    PAD.left + ((x - KDE_RANGE.min) / (KDE_RANGE.max - KDE_RANGE.min)) * plotW;
  const toY = (y: number) => PAD.top + (1 - y / yMax) * plotH;
  const path = (pts: { x: number; y: number }[]) =>
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`)
      .join(" ");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        帯域幅 h を変えて «ちょうどよい平滑» を探す
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="帯域幅による変化"
        data-testid="bandwidth-plot"
      >
        <path
          d={path(truthCurve)}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.3}
          strokeDasharray="4 3"
        />
        <path d={path(curve)} fill="none" stroke={REGIME_COLOR[regime]} strokeWidth={2.5} />
        {data.map((xi, i) => (
          <line
            key={i}
            x1={toX(xi)}
            y1={toY(0)}
            x2={toX(xi)}
            y2={toY(0) + 4}
            stroke="#475569"
            strokeWidth={1}
          />
        ))}
      </svg>

      <p className="text-center font-mono text-sm" style={{ color: REGIME_COLOR[regime] }}>
        h={(frame?.payload?.bandwidth ?? 0).toFixed(2)}・ISE={(frame?.payload?.ise ?? 0).toFixed(3)}
        {regime === "good" ? " ← 最小（真の密度に最接近）" : ""}
      </p>

      {frame?.callout ? <Callout {...frame.callout} /> : null}

      <StepPlayer
        count={count}
        index={index}
        playing={playing}
        onPrev={prevFrame}
        onNext={nextFrame}
        onSeek={goToFrame}
        onTogglePlay={() => setPlaying(!playing)}
      />

      <p className="text-xs leading-relaxed text-slate-500">
        ▶ 灰破線が真の密度。h
        が小さいとギザギザ（赤・分散大）、大きいと潰れる（橙・バイアス大）、中間で ISE
        最小（緑）。帯域幅の選択がKDEの肝。
      </p>
    </div>
  );
}
