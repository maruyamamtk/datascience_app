"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { usePcaStore } from "@/lib/store/principal-component-analysis";
import { buildMaxVarianceFrames } from "./frames";

const STEPS = 19;
const W = 320;
const H = 180;
const CX = W / 2;
const CY = H / 2;
const SCALE = 18;

/**
 * 「分散最大の方向＝第1主成分」をコマ送りで探すステッパー（描画層）。軸を 0→180° 回し、
 * 各角度で射影分散を測り、最大になる向きを第1主成分として強調する（アルゴリズム図鑑スタイル）。
 * データは上のラボと共有（usePcaStore）。フレーム位置は frame。
 */
export function MaxVarianceStepper() {
  const points = usePcaStore((s) => s.derived.points);
  const pc1 = usePcaStore((s) => s.derived.pc1);
  const index = usePcaStore((s) => s.frame.index);
  const count = usePcaStore((s) => s.frame.count);
  const playing = usePcaStore((s) => s.frame.playing);
  const nextFrame = usePcaStore((s) => s.nextFrame);
  const prevFrame = usePcaStore((s) => s.prevFrame);
  const goToFrame = usePcaStore((s) => s.goToFrame);
  const setPlaying = usePcaStore((s) => s.setPlaying);
  const setFrameCount = usePcaStore((s) => s.setFrameCount);

  const frames = useMemo(
    () => buildMaxVarianceFrames(points, STEPS, pc1.angle),
    [points, pc1.angle],
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
    intervalMs: 650,
  });

  const frame = frameAt(frames, index);
  const angle = frame?.payload?.angle ?? 0;
  const isBest = frame?.payload?.isBest ?? false;

  const mx = points.reduce((a, p) => a + p.x, 0) / points.length;
  const my = points.reduce((a, p) => a + p.y, 0) / points.length;
  const toX = (x: number) => CX + (x - mx) * SCALE;
  const toY = (y: number) => CY - (y - my) * SCALE;
  const axLen = 80;
  const dx = Math.cos(angle) * axLen;
  const dy = Math.sin(angle) * axLen;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        軸を回して «射影分散が最大» の方向を探す
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="分散最大方向の探索"
        data-testid="maxvar-plot"
      >
        {points.map((p, i) => (
          <circle key={i} cx={toX(p.x)} cy={toY(p.y)} r={2.4} fill="#64748b" opacity={0.5} />
        ))}
        {/* 候補軸 */}
        <line
          x1={CX - dx}
          y1={CY + dy}
          x2={CX + dx}
          y2={CY - dy}
          stroke={isBest ? "#dc2626" : "#7c3aed"}
          strokeWidth={isBest ? 3 : 2}
        />
      </svg>

      <p
        className="text-center font-mono text-sm"
        style={{ color: isBest ? "#dc2626" : "#475569" }}
      >
        角度 {((angle * 180) / Math.PI).toFixed(0)}°・射影分散{" "}
        {(frame?.payload?.variance ?? 0).toFixed(2)}
        {isBest ? " ← 最大（第1主成分）" : ""}
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
        ▶ 軸を回すと射影分散が変わり、最大になる向きが «第1主成分»。PCA
        は固有値分解でこれを一発で求めます。上のラボで相関を変えると方向も変化。
      </p>
    </div>
  );
}
