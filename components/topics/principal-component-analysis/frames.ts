/**
 * 「分散最大の方向＝第1主成分」を、軸を回しながら射影分散を測って探す過程をコマ送りで見せる
 * フレーム列ビルダー（計算層・純関数）。各角度で軸へ射影した分散を計算し、最大になる角度を強調する。
 * 副作用なし（Vitest 対象）。描画（MaxVarianceStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import type { Point2 } from "@/lib/stats/pca";

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** ある角度の軸へ射影したときの分散。 */
function projectedVariance(points: readonly Point2[], angle: number): number {
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const scores = points.map((p) => (p.x - mx) * ux + (p.y - my) * uy);
  const m = mean(scores);
  return scores.reduce((a, s) => a + (s - m) ** 2, 0) / Math.max(1, points.length - 1);
}

/** 各フレーム（ある角度）のスナップショット。 */
export type MaxVarPayload = {
  /** 試した軸の角度（ラジアン）。 */
  angle: number;
  /** その軸への射影分散。 */
  variance: number;
  /** これまでの最大分散の角度。 */
  bestAngle: number;
  /** 最大分散。 */
  bestVariance: number;
  /** この角度が（ほぼ）最大か。 */
  isBest: boolean;
};

/**
 * 0〜180° を steps 段階に分けて軸を回し、各角度の射影分散を提示するフレーム列を作る。
 * 最大分散の角度＝第1主成分の方向。pc1Angle は «正解» の角度（強調用）。
 */
export function buildMaxVarianceFrames(
  points: readonly Point2[],
  steps: number,
  pc1Angle: number,
): VizFrame<MaxVarPayload>[] {
  const angles = Array.from({ length: steps }, (_, i) => (i / (steps - 1)) * Math.PI);
  const variances = angles.map((a) => projectedVariance(points, a));
  let bestIdx = 0;
  for (let i = 1; i < variances.length; i++) if (variances[i] > variances[bestIdx]) bestIdx = i;

  return angles.map((angle, i) => {
    // ここまでの最大。
    let bIdx = 0;
    for (let k = 1; k <= i; k++) if (variances[k] > variances[bIdx]) bIdx = k;
    const isBest = i === bestIdx;
    return {
      payload: {
        angle,
        variance: variances[i],
        bestAngle: angles[bIdx],
        bestVariance: variances[bIdx],
        isBest,
      },
      highlights: ["axis"],
      callout: {
        title: `軸を ${((angle * 180) / Math.PI).toFixed(0)}° に回す：射影分散 ${variances[i].toFixed(2)}`,
        body: isBest
          ? "ここで射影分散が最大！ この方向が «第1主成分»。データが最も広がる向き。"
          : "この軸にデータを射影したときの分散。回しながら分散が最大になる向きを探す。",
        note: isBest
          ? `主成分分析は «分散最大の方向» を固有ベクトルとして一発で求める（${(((pc1Angle * 180) / Math.PI + 180) % 180) | 0}° 付近）。`
          : "分散が大きいほど、その方向にデータの情報が多く乗っている。",
        kind: isBest ? "supplement" : "explain",
      },
    };
  });
}
