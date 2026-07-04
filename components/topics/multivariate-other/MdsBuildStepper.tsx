"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { TRUE_CITIES, useMdsStore } from "@/lib/store/multivariate-other";
import { buildMdsFrames } from "./frames";

const W = 260;
const H = 150;

/**
 * MDS が «距離だけ» から地図を復元する過程のステッパー（描画層）。①距離のみ ②1次元復元 ③2次元復元 と
 * 次元を増やし、点が線→平面に配置されストレスが下がる様子をコマ送りで見せる（アルゴリズム図鑑スタイル）。
 * 距離は上のラボと共有（useMdsStore）。フレーム位置は frame。
 */
export function MdsBuildStepper() {
  const distances = useMdsStore((s) => s.derived.distances);
  const index = useMdsStore((s) => s.frame.index);
  const count = useMdsStore((s) => s.frame.count);
  const playing = useMdsStore((s) => s.frame.playing);
  const nextFrame = useMdsStore((s) => s.nextFrame);
  const prevFrame = useMdsStore((s) => s.prevFrame);
  const goToFrame = useMdsStore((s) => s.goToFrame);
  const setPlaying = useMdsStore((s) => s.setPlaying);
  const setFrameCount = useMdsStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildMdsFrames(distances), [distances]);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({
    playing,
    index,
    count,
    onAdvance: nextFrame,
    onStop: () => setPlaying(false),
    intervalMs: 1400,
  });

  const frame = frameAt(frames, index);
  const dim = frame?.payload?.dim ?? 0;
  const coords = frame?.payload?.coords ?? [];

  // 表示レンジ。
  const cx = W / 2;
  const cy = H / 2;
  const all = coords.flatMap((c) => c);
  const span = Math.max(...all.map((v) => Math.abs(v)), 1);
  const s = 55 / span;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        距離だけから «地図» を復元する（次元を増やす）
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="MDS復元の段階"
        data-testid="mds-build"
      >
        {dim === 0 && (
          <text x={cx} y={cy} textAnchor="middle" className="fill-slate-400 text-[11px]">
            距離行列のみ（座標は未知）
          </text>
        )}
        {dim === 1 && <line x1={cx - 60} y1={cy} x2={cx + 60} y2={cy} stroke="#e2e8f0" />}
        {dim >= 1 &&
          coords.map((c, i) => {
            const x = cx + c[0] * s;
            const y = dim === 1 ? cy : cy - c[1] * s;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={4} fill="#ea580c" opacity={0.75} />
                <text x={x + 6} y={y + 3} className="fill-slate-600 text-[9px] font-semibold">
                  {TRUE_CITIES[i].name}
                </text>
              </g>
            );
          })}
      </svg>

      <p className="text-center font-mono text-sm text-slate-700">
        {dim === 0
          ? "距離のみ"
          : `${dim}次元復元・ストレス=${(frame?.payload?.stress ?? 0).toFixed(3)}`}
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
        ▶ 距離のみ → 1次元（直線上）→
        2次元（平面の地図）。次元を増やすとストレスが下がり距離をよく再現します。上のラボで歪みを変えると復元も変化。
      </p>
    </div>
  );
}
