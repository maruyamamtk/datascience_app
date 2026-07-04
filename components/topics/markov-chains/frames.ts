/**
 * マルコフ連鎖の状態分布が «初期分布から定常分布へ» 収束する過程をコマ送りで見せるフレーム列ビルダー
 * （計算層・純関数）。各ステップの分布と、定常分布への総変動距離を提示する。
 * 副作用なし（Vitest 対象）。描画（DistributionStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";

/** 各フレーム（あるステップ）のスナップショット。 */
export type MarkovFramePayload = {
  step: number;
  /** その時点の分布。 */
  dist: number[];
  /** 定常分布への総変動距離。 */
  tv: number;
  /** ほぼ収束したか。 */
  converged: boolean;
};

/** 分布推移列と総変動距離列からフレーム列を作る。 */
export function buildDistributionFrames(
  evolution: readonly (readonly number[])[],
  tvSeq: readonly number[],
  stateNames: readonly string[],
): VizFrame<MarkovFramePayload>[] {
  return evolution.map((dist, t) => {
    const tv = tvSeq[t] ?? 0;
    const converged = tv < 0.01;
    const top = dist.reduce((best, v, i) => (v > dist[best] ? i : best), 0);
    return {
      payload: { step: t, dist: [...dist], tv, converged },
      highlights: ["dist"],
      callout: {
        title:
          t === 0
            ? `t=0：初期分布（${stateNames[top]}から出発）`
            : `t=${t}：分布を更新（定常まで距離 ${tv.toFixed(3)}）`,
        body:
          t === 0
            ? "最初は特定の状態に集中。ここから π_{t+1}=π_t P で1ステップずつ更新する。"
            : `各状態の確率が π P で混ざり合い、初期の偏りが薄れていく。今の最頻状態は «${stateNames[top]}»。`,
        note: converged
          ? "分布がほぼ動かなくなった＝定常分布に到達。初期状態を忘れ、長期の滞在割合に一致する。"
          : "既約・非周期なマルコフ連鎖は、初期分布によらず必ず同じ定常分布に収束する（エルゴード性）。",
        kind: converged ? "supplement" : "explain",
      },
    };
  });
}
