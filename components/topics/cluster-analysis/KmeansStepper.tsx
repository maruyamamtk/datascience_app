"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useClusterStore } from "@/lib/store/cluster-analysis";
import { CLUSTER_COLORS } from "./ClusterLab";
import { buildKmeansFrames } from "./frames";

const W = 300;
const H = 200;
const CX = W / 2;
const CY = H / 2;
const SCALE = 20;

/**
 * k-means（ロイドのアルゴリズム）の収束をコマ送りで見せるステッパー（描画層）。
 * «割り当て→重心更新» の各ステップで点の色（クラスター）と重心の位置・WCSS が変わる様子を追う
 * （アルゴリズム図鑑スタイル）。データと k は上のラボと共有（useClusterStore）。フレーム位置は frame。
 */
export function KmeansStepper() {
  const points = useClusterStore((s) => s.derived.points);
  const steps = useClusterStore((s) => s.derived.steps);
  const index = useClusterStore((s) => s.frame.index);
  const count = useClusterStore((s) => s.frame.count);
  const playing = useClusterStore((s) => s.frame.playing);
  const nextFrame = useClusterStore((s) => s.nextFrame);
  const prevFrame = useClusterStore((s) => s.prevFrame);
  const goToFrame = useClusterStore((s) => s.goToFrame);
  const setPlaying = useClusterStore((s) => s.setPlaying);
  const setFrameCount = useClusterStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildKmeansFrames(steps), [steps]);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1100,
  });

  const frame = frameAt(frames, index);
  const assignments = frame?.payload?.assignments ?? [];
  const centroids = frame?.payload?.centroids ?? [];

  const toX = (x: number) => CX + x * SCALE;
  const toY = (y: number) => CY - y * SCALE;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">k-means：割り当て→重心更新 を繰り返す</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="k-meansの収束"
        data-testid="kmeans-plot"
      >
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toX(p.x)}
            cy={toY(p.y)}
            r={2.8}
            fill={CLUSTER_COLORS[(assignments[i] ?? 0) % CLUSTER_COLORS.length]}
            opacity={0.6}
          />
        ))}
        {centroids.map((c, j) => (
          <path
            key={j}
            d={star(toX(c.x), toY(c.y), 7)}
            fill={CLUSTER_COLORS[j % CLUSTER_COLORS.length]}
            stroke="#fff"
            strokeWidth={0.8}
          />
        ))}
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        ステップ {frame?.payload?.step}・WCSS={(frame?.payload?.wcss ?? 0).toFixed(1)}
        {frame?.payload?.converged ? " ← 収束" : ""}
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
        ▶ ★が重心。再生で «各点を最寄り重心に割り当て» と «重心を平均へ移動» を交互に繰り返し、WCSS
        が減って収束します。上のラボで k を変えると反復も変化。
      </p>
    </div>
  );
}

/** 5芒星のパス（重心マーカー）。 */
function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}
