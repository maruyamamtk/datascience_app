"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useLdaStore } from "@/lib/store/discriminant-analysis";
import { buildFisherFrames } from "./frames";

const STEPS = 19;
const W = 320;
const H = 170;
const CX = W / 2;
const CY = H * 0.42;
const SCALE = 17;

/**
 * フィッシャー判別軸をコマ送りで探すステッパー（描画層）。軸を 0→180° 回し、各角度で両群を射影した
 * 分離度（フィッシャー基準）を測り、最大の向き＝判別軸を強調する。下に1次元射影（両群のヒスト的な帯）も描く。
 * データは上のラボと共有（useLdaStore）。フレーム位置は frame。
 */
export function FisherAxisStepper() {
  const g1 = useLdaStore((s) => s.derived.g1);
  const g2 = useLdaStore((s) => s.derived.g2);
  const index = useLdaStore((s) => s.frame.index);
  const count = useLdaStore((s) => s.frame.count);
  const playing = useLdaStore((s) => s.frame.playing);
  const nextFrame = useLdaStore((s) => s.nextFrame);
  const prevFrame = useLdaStore((s) => s.prevFrame);
  const goToFrame = useLdaStore((s) => s.goToFrame);
  const setPlaying = useLdaStore((s) => s.setPlaying);
  const setFrameCount = useLdaStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildFisherFrames(g1, g2, STEPS), [g1, g2]);
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
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);

  const toX = (x: number) => CX + x * SCALE;
  const toY = (y: number) => CY - y * SCALE;
  const axLen = 70;

  // 1次元射影の帯（y=H-24 のラインに点を落とす）。
  const projY = H - 22;
  const proj = (p: { x: number; y: number }) => CX + (p.x * ux + p.y * uy) * SCALE;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        軸を回して «2群が最も分かれる» 向きを探す
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="判別軸の探索"
        data-testid="fisher-plot"
      >
        {g1.map((p, i) => (
          <circle key={`a${i}`} cx={toX(p.x)} cy={toY(p.y)} r={2.2} fill="#dc2626" opacity={0.55} />
        ))}
        {g2.map((p, i) => (
          <circle key={`b${i}`} cx={toX(p.x)} cy={toY(p.y)} r={2.2} fill="#2563eb" opacity={0.55} />
        ))}
        {/* 候補軸 */}
        <line
          x1={CX - ux * axLen}
          y1={CY + uy * axLen}
          x2={CX + ux * axLen}
          y2={CY - uy * axLen}
          stroke={isBest ? "#7c3aed" : "#94a3b8"}
          strokeWidth={isBest ? 3 : 1.5}
        />
        {/* 1次元射影の帯 */}
        <line x1={20} y1={projY} x2={W - 20} y2={projY} stroke="#e2e8f0" />
        {g1.map((p, i) => (
          <circle key={`pa${i}`} cx={proj(p)} cy={projY} r={2} fill="#dc2626" opacity={0.5} />
        ))}
        {g2.map((p, i) => (
          <circle key={`pb${i}`} cx={proj(p)} cy={projY + 5} r={2} fill="#2563eb" opacity={0.5} />
        ))}
      </svg>

      <p
        className="text-center font-mono text-sm"
        style={{ color: isBest ? "#7c3aed" : "#475569" }}
      >
        角度 {((angle * 180) / Math.PI).toFixed(0)}°・分離度 J=
        {(frame?.payload?.criterion ?? 0).toFixed(2)}
        {isBest ? " ← 最大（判別軸）" : ""}
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
        ▶ 下の帯が射影。軸を回すと赤群と青群の重なり方が変わり、最も分かれる向きが
        «判別軸»。上のラボで隔たりを変えると最適方向も変化。
      </p>
    </div>
  );
}
