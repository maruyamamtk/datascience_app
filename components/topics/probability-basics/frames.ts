/**
 * ベイズ更新を「自然頻度」で 1 段ずつ見せるコマ送りのフレーム列ビルダー（計算層・純関数）。
 * `naturalFrequencies` の内訳から、StepPlayer に渡す VizFrame 列（母集団→病気/健康→検査→事後）を組む。
 * 副作用なし（Vitest 対象）。描画（BayesStepper.tsx）はこの結果を購読するだけ（3層疎結合）。
 */

import type { VizFrame } from "@/components/viz";
import type { NaturalFrequencies } from "@/lib/stats/bayes";

/** 自然頻度ステッパーの段階。 */
export type BayesStage = "population" | "disease" | "test" | "posterior";

/** 各フレームで描画層が使うスナップショット。 */
export type BayesStepPayload = {
  /** この段階。 */
  stage: BayesStage;
  /** 自然頻度の内訳（全段階で同じ。stage に応じて描き分ける）。 */
  freq: NaturalFrequencies;
  /** 事後確率 P(D|+) = TP/(TP+FP)（positives=0 のときは NaN）。 */
  posterior: number;
};

const pct = (x: number): string => (Number.isFinite(x) ? `${(x * 100).toFixed(0)}%` : "—");

/**
 * 自然頻度によるベイズ更新の 4 フレーム列を作る。
 * フレームを進めるごとに「母集団 → 病気/健康に分割 → 検査で陽性/陰性に分割 → 陽性者の中の病気割合」
 * と分割が細かくなり、最後に事後確率 P(D|+) が «陽性の人だけ» の中の真陽性割合だと分かる。
 */
export function buildBayesFrames(freq: NaturalFrequencies): VizFrame<BayesStepPayload>[] {
  const posterior = freq.positives > 0 ? freq.tp / freq.positives : Number.NaN;
  const base = { freq, posterior };

  return [
    {
      payload: { ...base, stage: "population" },
      highlights: ["population"],
      callout: {
        title: `① 母集団 ${freq.total} 人`,
        body: `まず ${freq.total} 人を考える。ここから「病気か」「検査結果」で人数を分けていく（自然頻度）。`,
        note: "ベイズの定理は、率（％）より «人数» で考えると直感的になる。",
        kind: "explain",
      },
    },
    {
      payload: { ...base, stage: "disease" },
      highlights: ["sick", "healthy"],
      callout: {
        title: `② 事前確率で病気/健康に分割`,
        body: `有病率（事前確率）で分けると、病気 ${freq.sick} 人・健康 ${freq.healthy} 人。`,
        note: "検査を受ける «前» の割り振り。これが事前確率 P(D)。",
        kind: "explain",
      },
    },
    {
      payload: { ...base, stage: "test" },
      highlights: ["tp", "fn", "fp", "tn"],
      callout: {
        title: `③ 検査で陽性/陰性に分割`,
        body: `病気 ${freq.sick} 人のうち陽性 ${freq.tp} 人（真陽性）、健康 ${freq.healthy} 人のうち陽性 ${freq.fp} 人（偽陽性）。`,
        note: "感度＝病気の人が陽性になる割合、特異度＝健康な人が陰性になる割合。",
        kind: "explain",
      },
    },
    {
      payload: { ...base, stage: "posterior" },
      highlights: ["tp", "fp"],
      callout: {
        title: `④ 陽性の人だけを見る → 事後確率`,
        body: `陽性は計 ${freq.positives} 人（真陽性 ${freq.tp}＋偽陽性 ${freq.fp}）。その中で本当に病気なのは ${freq.tp} 人＝ P(D|+) ≈ ${pct(
          posterior,
        )}。`,
        note: "感度が高くても、有病率が低いと «陽性でも病気» の割合は意外と小さい（条件付き確率の向きの罠）。",
        kind: "supplement",
      },
    },
  ];
}
