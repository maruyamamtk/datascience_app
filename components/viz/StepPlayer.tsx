"use client";

import { isFirstFrame, isLastFrame } from "./frame";

type StepPlayerProps = {
  /** フレーム総数。 */
  count: number;
  /** 現在のフレーム index（0..count-1）。 */
  index: number;
  /** 自動再生中か。 */
  playing: boolean;
  /** 1 コマ前へ。 */
  onPrev: () => void;
  /** 1 コマ後へ。 */
  onNext: () => void;
  /** スライダーで任意フレームへ。 */
  onSeek: (index: number) => void;
  /** 再生 / 一時停止のトグル。 */
  onTogglePlay: () => void;
  /** 各フレームの短い見出し（任意・現在フレーム表示に使う）。 */
  labels?: readonly string[];
  className?: string;
};

/**
 * コマ送りプレイヤー（Control 層）。「自動再生 / 一時停止 / 1コマ前後送り / スライダー」を提供する。
 *
 * **controlled component**: 状態（count/index/playing）は持たず、すべて props で受け取り
 * コールバックを呼ぶだけ。Zustand トピックストアの `frame` 状態と action にそのまま配線できる
 * （3層疎結合）。自動再生のタイマーは useFramePlayer（副作用 hook）に分離する。
 */
export function StepPlayer({
  count,
  index,
  playing,
  onPrev,
  onNext,
  onSeek,
  onTogglePlay,
  labels,
  className = "",
}: StepPlayerProps) {
  const atFirst = isFirstFrame(index);
  const atLast = isLastFrame(index, count);
  const disabled = count <= 0;
  const currentLabel = labels?.[index];

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 ${className}`}
      data-testid="step-player"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={disabled || atFirst}
          aria-label="1コマ前へ"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={disabled}
          aria-label={playing ? "一時停止" : "再生"}
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {playing ? "⏸ 一時停止" : "▶ 再生"}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={disabled || atLast}
          aria-label="1コマ後へ"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ▶
        </button>
        <span className="ml-auto font-mono text-sm text-slate-500" data-testid="step-counter">
          {disabled ? "0 / 0" : `${index + 1} / ${count}`}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(0, count - 1)}
        step={1}
        value={index}
        onChange={(e) => onSeek(Number(e.target.value))}
        disabled={disabled}
        aria-label="フレームスライダー"
        className="w-full accent-slate-900 disabled:opacity-40"
      />

      {currentLabel ? (
        <p className="text-sm font-medium text-slate-600">ステップ: {currentLabel}</p>
      ) : null}
    </div>
  );
}
