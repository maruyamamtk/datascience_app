"use client";

import { useEffect } from "react";
import { stepTick } from "./frame";

type UseFramePlayerArgs = {
  /** 自動再生中か（ストアの frame.playing を渡す）。 */
  playing: boolean;
  /** 現在の index（ストアの frame.index）。 */
  index: number;
  /** フレーム総数（ストアの frame.count）。 */
  count: number;
  /** 次フレームへ進める action（ストアの nextFrame）。 */
  onAdvance: () => void;
  /** 末尾到達などで停止する action（例: () => setPlaying(false)）。 */
  onStop: () => void;
  /** 1 コマあたりの表示時間（ミリ秒）。既定 900。 */
  intervalMs?: number;
};

/**
 * 自動再生のタイマー（副作用 hook）。StepPlayer は controlled な描画に徹し、
 * 「一定間隔でフレームを進める / 末尾で止める」という副作用はここに閉じる（3層疎結合）。
 *
 * 進行可否の判定は純関数 `stepTick` に委譲し、本 hook は setInterval と
 * action 呼び出しだけを受け持つ。playing/index/count の変化で effect を貼り直すため、
 * 各フレームはほぼ intervalMs で切り替わる。
 */
export function useFramePlayer({
  playing,
  index,
  count,
  onAdvance,
  onStop,
  intervalMs = 900,
}: UseFramePlayerArgs): void {
  useEffect(() => {
    if (!playing) return;
    // 再生開始時にすでに末尾なら即停止（無限ループ防止）。
    if (stepTick(index, count).reachedEnd) {
      onStop();
      return;
    }
    const id = window.setInterval(() => {
      const { reachedEnd } = stepTick(index, count);
      if (reachedEnd) {
        onStop();
        return;
      }
      onAdvance();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, index, count, intervalMs, onAdvance, onStop]);
}
