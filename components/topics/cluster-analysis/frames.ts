/**
 * k-means（ロイドのアルゴリズム）の収束過程をコマ送りで見せるフレーム列ビルダー（計算層・純関数）。
 * 各ステップの «割り当て→重心更新» と WCSS の減少を提示する。
 * 副作用なし（Vitest 対象）。描画（KmeansStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import type { KmeansStep } from "@/lib/stats/clustering";
import type { Point2 } from "@/lib/stats/pca";

/** 各フレーム（あるステップ）のスナップショット。 */
export type KmeansFramePayload = {
  step: number;
  assignments: number[];
  centroids: Point2[];
  wcss: number;
  /** 収束したか。 */
  converged: boolean;
};

/** k-means ステップ列をフレーム列に変換する。 */
export function buildKmeansFrames(steps: readonly KmeansStep[]): VizFrame<KmeansFramePayload>[] {
  return steps.map((s, i) => {
    const converged = i === steps.length - 1;
    const prevW = i > 0 ? steps[i - 1].wcss : null;
    return {
      payload: {
        step: i,
        assignments: s.assignments,
        centroids: s.centroids,
        wcss: s.wcss,
        converged,
      },
      highlights: ["centroids"],
      callout: {
        title:
          i === 0
            ? `初期：重心をランダムに置き割り当て（WCSS=${s.wcss.toFixed(1)}）`
            : `ステップ ${i}：重心を更新し再割り当て（WCSS=${s.wcss.toFixed(1)}）`,
        body:
          i === 0
            ? "各点を最も近い重心の色に塗る。これが最初のクラスター。"
            : `各クラスターの平均へ重心を動かし、点を割り当て直す。WCSS が ${
                prevW !== null ? prevW.toFixed(1) : "—"
              }→${s.wcss.toFixed(1)} と減る。`,
        note: converged
          ? "重心が動かなくなった＝収束。これが k-means の結果。初期値しだいで局所解に落ちることもある。"
          : "«割り当て» と «重心更新» を交互に繰り返すと WCSS は必ず減り、有限回で収束する。",
        kind: converged ? "supplement" : "explain",
      },
    };
  });
}
