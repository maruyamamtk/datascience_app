"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { DETECTION_CANVAS, useNmsStepperFrameStore } from "@/lib/store/image-analysis";
import { buildNmsFrames, NMS_BOXES, type NmsPayload } from "./nmsFrames";

const W = 300;
const H = 300;
const SCALE = W / DETECTION_CANVAS.width;

const COLOR_PENDING = "#94a3b8"; // 未判定（灰）
const COLOR_KEEP = "#16a34a"; // 採用（緑）
const COLOR_SUPPRESS = "#dc2626"; // 抑制（赤・破線）

/**
 * NMS（非最大値抑制）のコマ送りステッパー（描画層・アルゴリズム図鑑スタイル）。
 * 固定の5候補ボックス（2つの物体それぞれに重複検出）に対し、スコア最大の候補を採用（緑）→
 * IoUがしきい値以上の候補を抑制（赤・破線）、を候補が尽きるまで繰り返す様子を1ステップずつ見せる。
 * フレーム位置は本ステッパー専用の空ストアが single source of truth（tasks/lessons.md #76）。
 */
export function NmsStepper() {
  const index = useNmsStepperFrameStore((s) => s.frame.index);
  const count = useNmsStepperFrameStore((s) => s.frame.count);
  const playing = useNmsStepperFrameStore((s) => s.frame.playing);
  const nextFrame = useNmsStepperFrameStore((s) => s.nextFrame);
  const prevFrame = useNmsStepperFrameStore((s) => s.prevFrame);
  const goToFrame = useNmsStepperFrameStore((s) => s.goToFrame);
  const setPlaying = useNmsStepperFrameStore((s) => s.setPlaying);
  const setFrameCount = useNmsStepperFrameStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildNmsFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1800 });

  const frame = frameAt<NmsPayload>(frames, index);

  // これまでのフレームで確定した「採用」「抑制」を累積する（既に決着した候補は次のコマでも表示を保つ）。
  const keptSoFar = new Set<number>();
  const suppressedSoFar = new Set<number>();
  for (let i = 0; i <= index; i++) {
    const p = frames[i]?.payload;
    if (!p) continue;
    keptSoFar.add(p.keepIndex);
    for (const s of p.suppressedIndices) suppressedSoFar.add(s);
  }

  return (
    <div id="ia-nms-stepper" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        NMS: スコアが最も高い候補を採用（<span style={{ color: COLOR_KEEP }}>緑</span>）し、重なる候補を抑制（
        <span style={{ color: COLOR_SUPPRESS }}>赤・破線</span>）する
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto h-auto w-full max-w-[300px] rounded-xl bg-slate-50"
        role="img"
        aria-label="NMSの候補ボックスと採用・抑制の状態"
        data-testid="ia-nms-plot"
      >
        {NMS_BOXES.map((b, i) => {
          const isKeep = keptSoFar.has(i);
          const isSuppress = suppressedSoFar.has(i);
          const color = isKeep ? COLOR_KEEP : isSuppress ? COLOR_SUPPRESS : COLOR_PENDING;
          const isActive = frame?.payload?.keepIndex === i || frame?.payload?.suppressedIndices.includes(i);
          return (
            <rect
              key={i}
              x={b.x * SCALE}
              y={b.y * SCALE}
              width={b.w * SCALE}
              height={b.h * SCALE}
              fill="none"
              stroke={color}
              strokeWidth={isActive ? 3.5 : 2}
              strokeDasharray={isSuppress ? "6 3" : undefined}
              opacity={isSuppress && !isActive ? 0.5 : 1}
            />
          );
        })}
      </svg>

      {frame ? (
        <p className="text-center font-mono text-xs text-slate-500">
          ステップ {frame.payload?.step}/{frame.payload?.total}
        </p>
      ) : null}

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
        物体検出モデルは同じ物体に対して複数の重複したボックスを出力しがち——NMSは«スコアが高い順に確定させ、
        大きく重なる（IoUが高い）候補を間引く»ことで、1つの物体につき1つのボックスだけを残す後処理。
      </p>
    </div>
  );
}
