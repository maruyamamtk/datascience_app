/**
 * 「2群を最もよく分ける方向＝フィッシャー判別軸」を、軸を回しながら分離度（フィッシャー基準）を測って
 * 探す過程をコマ送りで見せるフレーム列ビルダー（計算層・純関数）。
 * 各角度で両群を軸へ射影し、群間の隔たり²/群内の分散 を計算、最大の角度を強調する。
 * 副作用なし（Vitest 対象）。描画（FisherAxisStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import type { Point2 } from "@/lib/stats/pca";

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const variance = (xs: readonly number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, v) => a + (v - m) ** 2, 0) / (xs.length - 1);
};

/** ある角度の軸へ両群を射影したときのフィッシャー基準 J=(群間隔たり)²/(群内分散和)。 */
function fisherCriterion(g1: readonly Point2[], g2: readonly Point2[], angle: number): number {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const s1 = g1.map((p) => p.x * ux + p.y * uy);
  const s2 = g2.map((p) => p.x * ux + p.y * uy);
  const between = (mean(s1) - mean(s2)) ** 2;
  const within = variance(s1) + variance(s2);
  return within > 0 ? between / within : 0;
}

/** 各フレーム（ある角度）のスナップショット。 */
export type FisherPayload = {
  angle: number;
  /** フィッシャー基準（分離度）。 */
  criterion: number;
  /** これが最大か。 */
  isBest: boolean;
};

/** 0〜180° を steps 段階に分けて軸を回し、フィッシャー基準を提示するフレーム列を作る。 */
export function buildFisherFrames(
  g1: readonly Point2[],
  g2: readonly Point2[],
  steps: number,
): VizFrame<FisherPayload>[] {
  const angles = Array.from({ length: steps }, (_, i) => (i / (steps - 1)) * Math.PI);
  const crits = angles.map((a) => fisherCriterion(g1, g2, a));
  let bestIdx = 0;
  for (let i = 1; i < crits.length; i++) if (crits[i] > crits[bestIdx]) bestIdx = i;

  return angles.map((angle, i) => {
    const isBest = i === bestIdx;
    return {
      payload: { angle, criterion: crits[i], isBest },
      highlights: ["axis"],
      callout: {
        title: `軸 ${((angle * 180) / Math.PI).toFixed(0)}°：分離度 J=${crits[i].toFixed(2)}`,
        body: isBest
          ? "ここで分離度が最大！ この方向が «フィッシャー判別軸»。2群が最も重ならず分かれる向き。"
          : "両群をこの軸に射影したときの «群間の隔たり²/群内のばらつき»。回しながら最大を探す。",
        note: isBest
          ? "判別分析はこの «分離度最大の方向» を Σ_w⁻¹(μ1−μ2) として一発で求める。"
          : "分離度が大きいほど、その軸の上で2群がきれいに分かれる（重なりが小さい）。",
        kind: isBest ? "supplement" : "explain",
      },
    };
  });
}
