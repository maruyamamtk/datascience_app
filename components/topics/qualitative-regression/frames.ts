/**
 * 勾配上昇法でロジスティック回帰を当てはめる過程を見せるコマ送りのフレーム列ビルダー（計算層・純関数）。
 * (b0,b1)=(0,0) から最尤へ登り、シグモイド曲線がデータに馴染む様子を段階的に提示する。
 * 副作用なし（Vitest 対象）。描画（LogitFitStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { fitLogistic } from "@/lib/stats/logistic";

/** 各フレーム（あるステップの係数）のスナップショット。 */
export type LogitFitPayload = {
  /** ステップ番号。 */
  step: number;
  /** 切片 b0。 */
  b0: number;
  /** 傾き b1。 */
  b1: number;
  /** 対数尤度。 */
  logLik: number;
};

/**
 * 勾配上昇の経路を間引いてフレーム列にする。steps（提示する反復番号）ごとに係数・対数尤度を提示する。
 */
export function buildLogitFitFrames(
  x: readonly number[],
  y: readonly number[],
  steps: readonly number[],
): VizFrame<LogitFitPayload>[] {
  const maxIter = Math.max(...steps);
  const path = fitLogistic(x, y, { lr: 0.5, iters: maxIter });
  return steps.map((s) => {
    const p = path[Math.min(s, path.length - 1)];
    return {
      payload: { step: s, b0: p.b0, b1: p.b1, logLik: p.logLik },
      highlights: ["curve"],
      callout: {
        title: `反復 ${s}：b0=${p.b0.toFixed(2)}, b1=${p.b1.toFixed(2)}`,
        body: `対数尤度 ${p.logLik.toFixed(1)}。勾配の向きに係数を動かし «データが最も起こりやすくなる» シグモイドへ近づく。`,
        note:
          s >= maxIter
            ? `勾配がほぼ0＝最尤推定。これが当てはまったロジスティック回帰。傾き b1 のオッズ比 e^{b1}=${Math.exp(
                p.b1,
              ).toFixed(2)}。`
            : `シグモイドがデータの «0と1の境目» に馴染んでいく。`,
        kind: s >= maxIter ? "supplement" : "explain",
      },
    };
  });
}
