/**
 * 前進選択（forward selection）で説明変数を1つずつ加え、R² と自由度調整済み R² の変化を見せる
 * コマ送りのフレーム列ビルダー（計算層・純関数）。R² は単調に上がるが調整済み R² は «効かない変数» で下がる。
 * 副作用なし（Vitest 対象）。描画（StepwiseStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { designMatrix, olsFit } from "@/lib/stats/multiple-regression";

/** 各フレーム（あるモデル）のスナップショット。 */
export type StepwisePayload = {
  /** モデルに含む説明変数ラベル。 */
  vars: string[];
  /** R²。 */
  rSquared: number;
  /** 自由度調整済み R²。 */
  adjustedRSquared: number;
};

/**
 * 説明変数を 0 個 → 全部 と順に加えたモデル列の R²/調整済み R² を作る。
 * columns は [有効変数, …, 無効（ノイズ）変数, …] の順を想定（後ろほど «効かない» と仮定）。
 */
export function buildStepwiseFrames(
  columns: readonly number[][],
  labels: readonly string[],
  y: readonly number[],
): VizFrame<StepwisePayload>[] {
  const frames: VizFrame<StepwisePayload>[] = [];
  for (let k = 1; k <= columns.length; k++) {
    const used = columns.slice(0, k);
    const vars = labels.slice(0, k);
    const fit = olsFit(designMatrix(used), y);
    const prevAdj =
      frames.length > 0 ? (frames[frames.length - 1].payload?.adjustedRSquared ?? 0) : -1;
    const dropped = fit.adjustedRSquared < prevAdj;
    frames.push({
      payload: { vars: [...vars], rSquared: fit.rSquared, adjustedRSquared: fit.adjustedRSquared },
      highlights: [`var-${k - 1}`],
      callout: {
        title: `${vars.join(" + ")} を投入`,
        body: `R²=${fit.rSquared.toFixed(3)}、自由度調整済み R²=${fit.adjustedRSquared.toFixed(3)}。`,
        note: dropped
          ? `R² は上がっても 調整済み R² は ${prevAdj.toFixed(
              3,
            )}→${fit.adjustedRSquared.toFixed(3)} と下がった——この変数は «効いていない»（過剰適合）。`
          : `説明変数を足すと R² は必ず上がる（下がらない）。本当に効くかは調整済み R² で見る。`,
        kind: dropped ? "supplement" : "explain",
      },
    });
  }
  return frames;
}
