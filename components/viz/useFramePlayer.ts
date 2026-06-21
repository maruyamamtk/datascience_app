"use client";

import { useEffect, useRef } from "react";
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
 * action 呼び出しだけを受け持つ。
 *
 * interval は **再生セッション中に 1 度だけ**張る（依存は playing/intervalMs のみ）。
 * 毎ティックの index/count/コールバックは ref から最新値を読むため、呼び出し側が
 * 不安定な関数参照を渡しても・親が高頻度で再レンダーしても、タイマーがリセットされて
 * フレームが進まなくなることがない（再利用部品としての堅牢性）。
 */
export function useFramePlayer({
  playing,
  index,
  count,
  onAdvance,
  onStop,
  intervalMs = 900,
}: UseFramePlayerArgs): void {
  // 毎レンダーで最新値を退避（interval の再生成を避けるため依存に含めない）。
  const latest = useRef({ index, count, onAdvance, onStop });
  latest.current = { index, count, onAdvance, onStop };

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const { index, count, onAdvance, onStop } = latest.current;
      if (stepTick(index, count).reachedEnd) {
        onStop();
        return;
      }
      onAdvance();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, intervalMs]);
}
