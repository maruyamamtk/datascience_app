"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useEdgeStepperFrameStore } from "@/lib/store/image-analysis";
import { buildEdgeFrames, STEPPER_INPUT, STEPPER_OUTPUT, type EdgePayload } from "./edgeFrames";
import { Grid, type GridCell } from "./Grid";

function cellsFor(highlights: readonly string[] | undefined, prefix: string): GridCell[] {
  if (!highlights) return [];
  return highlights
    .filter((h) => h.startsWith(`${prefix}-`))
    .map((h) => {
      const [, r, c] = h.split("-");
      return { row: Number(r), col: Number(c) };
    });
}

/**
 * エッジ検出（Sobel）のコマ送りステッパー（描画層・アルゴリズム図鑑スタイル）。
 * 固定の5×5グレースケール画像に3×3のSobel縦エッジ検出フィルタを1マスずつスライドさせ、
 * 出力（特徴マップ）を9コマかけて埋めていく。フレーム位置は本ステッパー専用の空ストアが
 * single source of truth（tasks/lessons.md #76）。
 */
export function EdgeDetectionStepper() {
  const index = useEdgeStepperFrameStore((s) => s.frame.index);
  const count = useEdgeStepperFrameStore((s) => s.frame.count);
  const playing = useEdgeStepperFrameStore((s) => s.frame.playing);
  const nextFrame = useEdgeStepperFrameStore((s) => s.nextFrame);
  const prevFrame = useEdgeStepperFrameStore((s) => s.prevFrame);
  const goToFrame = useEdgeStepperFrameStore((s) => s.goToFrame);
  const setPlaying = useEdgeStepperFrameStore((s) => s.setPlaying);
  const setFrameCount = useEdgeStepperFrameStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildEdgeFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1400 });

  const frame = frameAt<EdgePayload>(frames, index);
  const inputHighlights = cellsFor(frame?.highlights, "in");
  const outHighlights = cellsFor(frame?.highlights, "out");

  return (
    <div id="ia-edge-stepper" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">Sobelフィルタ（縦エッジ検出）を1マスずつスライドさせる</p>

      <div className="flex flex-wrap items-start justify-center gap-6 overflow-x-auto py-2">
        <Grid values={STEPPER_INPUT} highlighted={inputHighlights} accent="#2563eb" label="入力 5×5" />
        <Grid values={STEPPER_OUTPUT} highlighted={outHighlights} accent="#dc2626" label="出力 3×3（Gx＝縦方向の勾配）" />
      </div>

      {frame ? (
        <p className="text-center font-mono text-xs text-slate-500">
          ステップ {frame.payload?.step}/{frame.payload?.total} ／ 出力({frame.payload?.row},{frame.payload?.col})=
          {frame.payload ? (Number.isInteger(frame.payload.value) ? frame.payload.value : frame.payload.value.toFixed(1)) : ""}
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
        フィルタの重みは左が負・右が正（
        <span className="font-mono">-1,0,1</span> の並び2重）——窓の中で左右の輝度差が大きいほど出力（青枠→赤マス）の絶対値が大きくなる。
        右半分の一様な領域では出力が0に近づく。
      </p>
    </div>
  );
}
