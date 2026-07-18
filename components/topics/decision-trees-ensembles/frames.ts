/**
 * 「分岐探索」ステッパー（Level1）のフレーム列ビルダー（計算層・純関数・Vitest 対象）。
 *
 * 決定木の根ノードで «どの特徴量のどの閾値で切ると情報利得が最大になるか» を、
 * CART と同じ総当たり（各特徴量のソート済みユニーク値の中点をすべて候補にする）で探す過程を
 * 1候補ずつコマ送りにする。最良更新のたびにハイライトし、最後に «木はこの分割を選ぶ» で締める。
 * ラボ本体（DecisionTreeLab）とは別の小さい専用データセットを使い、候補数を絞って見通しよくする
 * （tasks/lessons.md: ステッパーは «見せたい本質だけを持つ» 専用データで作ってよい）。
 * 描画は SplitFinderStepper.tsx。
 */

import type { VizFrame } from "@/components/viz";
import {
  type ClassPoint,
  type Criterion,
  enumerateSplitCandidates,
  generateClassificationData,
  impurity,
  type Split,
} from "@/lib/stats/decision-trees-ensembles";

/** ステッパー専用の小さい判別データ（ラボ本体とは別シード）。 */
export const SPLIT_SEED = 271828;
export const SPLIT_N = 22;
export const SPLIT_NOISE = 0.05;

/** 分岐候補1つぶんの情報（lib/stats の `Split` と同じ形。`bestSplit` が最良を選ぶ元データ）。 */
export type SplitCandidate = Split;

export type SplitSearchPayload = {
  points: ClassPoint[];
  parentImpurity: number;
  candidates: SplitCandidate[];
  /** ここまでに調べ終えた候補数。 */
  revealed: number;
  /** ここまでの最良候補の index。 */
  bestIndex: number;
  criterion: Criterion;
};

/** 分岐探索ステッパーのフレーム列（候補を1つ調べるたびに1コマ）を作る。 */
export function buildSplitSearchFrames(criterion: Criterion = "gini"): VizFrame<SplitSearchPayload>[] {
  const points = generateClassificationData(SPLIT_N, SPLIT_SEED, SPLIT_NOISE);
  const parentImpurity = impurity(points, criterion);
  // 木の構築（lib/stats の bestSplit）とまったく同じ候補列挙関数を使う——
  // «貪欲探索が実際に何を比較しているか» をステッパーと決定木本体で二重実装しない。
  const candidates = enumerateSplitCandidates(points, criterion);

  const frames: VizFrame<SplitSearchPayload>[] = [];
  let bestIndex = -1;
  for (let i = 0; i < candidates.length; i++) {
    if (bestIndex === -1 || candidates[i].gain > candidates[bestIndex].gain + 1e-12) bestIndex = i;
    const c = candidates[i];
    const featureLabel = c.feature === 0 ? "x₁" : "x₂";
    const isNewBest = bestIndex === i;
    const isLast = i === candidates.length - 1;

    frames.push({
      payload: { points, parentImpurity, candidates, revealed: i + 1, bestIndex, criterion },
      highlights: isNewBest ? ["best"] : [],
      callout: {
        title: `候補 ${i + 1}/${candidates.length}: ${featureLabel} ≤ ${c.threshold.toFixed(3)}`,
        body: isNewBest
          ? `情報利得 ${c.gain.toFixed(3)}——ここまでの最良。左${c.leftN}点・右${c.rightN}点に分かれる。`
          : `情報利得 ${c.gain.toFixed(3)}（最良は候補${bestIndex + 1}の ${candidates[bestIndex].gain.toFixed(3)} のまま）。`,
        note: isLast
          ? `全${candidates.length}候補（x₁・x₂それぞれの中点をすべて）を調べ終えた。最良は ${
              candidates[bestIndex].feature === 0 ? "x₁" : "x₂"
            } ≤ ${candidates[bestIndex].threshold.toFixed(3)}（利得 ${candidates[bestIndex].gain.toFixed(
              3,
            )}）——決定木はこの分割を根に選び、左右それぞれで同じ探索を再帰的に繰り返す。`
          : undefined,
        kind: isLast ? "supplement" : "explain",
      },
    });
  }
  return frames;
}
