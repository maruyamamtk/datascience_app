"use client";

import { useEffect, useMemo } from "react";
import { Callout, StepPlayer, frameAt, useFramePlayer } from "@/components/viz";
import { useConvPoolFrameStore } from "@/lib/store/neural-network-models";
import { buildConvPoolFrames, STEPPER_CONV_OUT, STEPPER_INPUT, STEPPER_POOL_OUT, type ConvPoolPayload } from "./convPoolFrames";
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
 * 畳み込み→プーリングのコマ送りステッパー（描画層・アルゴリズム図鑑スタイル）。
 * 固定の5×5入力・3×3縦エッジ検出フィルタで、9コマかけてフィルタを1マスずつスライドさせ
 * 特徴マップを埋め（青）、続く4コマで2×2 Maxプーリングの窓を走査して特徴マップを要約する（緑）。
 * フレーム位置は本ステッパー専用の空ストア（useConvPoolFrameStore）が single source of truth
 * （tasks/lessons.md: 1トピックに複数のStepPlayerがあるときはstepperごとにストアを分ける）。
 */
export function ConvPoolStepper() {
  const index = useConvPoolFrameStore((s) => s.frame.index);
  const count = useConvPoolFrameStore((s) => s.frame.count);
  const playing = useConvPoolFrameStore((s) => s.frame.playing);
  const nextFrame = useConvPoolFrameStore((s) => s.nextFrame);
  const prevFrame = useConvPoolFrameStore((s) => s.prevFrame);
  const goToFrame = useConvPoolFrameStore((s) => s.goToFrame);
  const setPlaying = useConvPoolFrameStore((s) => s.setPlaying);
  const setFrameCount = useConvPoolFrameStore((s) => s.setFrameCount);

  const frames = useMemo(() => buildConvPoolFrames(), []);
  useEffect(() => {
    setFrameCount(frames.length);
  }, [frames.length, setFrameCount]);

  useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: 1600 });

  const frame = frameAt<ConvPoolPayload>(frames, index);
  const phase = frame?.payload?.phase ?? "conv";
  const accent = phase === "conv" ? "#2563eb" : "#16a34a";

  const inputHighlights = cellsFor(frame?.highlights, "in");
  const outHighlights = cellsFor(frame?.highlights, "out");
  const poolHighlights = cellsFor(frame?.highlights, "pool");

  return (
    <div id="nnm-conv-pool-stepper" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-700">
        畳み込み（① 青、9コマ）→ プーリング（② 緑、4コマ）を1コマずつ走査する
      </p>

      <div className="flex flex-wrap items-start justify-center gap-6 overflow-x-auto py-2">
        <Grid values={STEPPER_INPUT} highlighted={inputHighlights} accent="#2563eb" label="入力 5×5" />
        <Grid values={STEPPER_CONV_OUT} highlighted={[...outHighlights]} accent={accent} label="特徴マップ 3×3（畳み込み出力）" />
        <Grid values={STEPPER_POOL_OUT} highlighted={poolHighlights} accent="#16a34a" label="プーリング出力 2×2" />
      </div>

      {frame ? (
        <p className="text-center font-mono text-xs text-slate-500">
          フェーズ: {phase === "conv" ? "① 畳み込み（青）" : "② Maxプーリング（緑）"} ／ ステップ {frame.payload?.step}/
          {phase === "conv" ? frame.payload?.totalConv : frame.payload?.totalPool}
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
        フィルタ（縦エッジ検出、右のマイナス・左のプラス）が入力の明暗の境目を通ると特徴マップの値が大きくなる——
        «同じフィルタ» を全位置に使い回す（パラメータ共有）ことで、全結合層よりずっと少ない重みで «どこに特徴があるか»
        を検出できる。
      </p>
    </div>
  );
}
