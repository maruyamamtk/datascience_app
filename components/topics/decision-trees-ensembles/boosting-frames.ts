/**
 * 「AdaBoost」ステッパー（Level3）のフレーム列ビルダー（計算層・純関数・Vitest 対象）。
 *
 * ラボ本体（CLASS_TRAIN）と同じデータを使い、決定株（深さ1の木）を1本ずつ逐次追加していく
 * AdaBoost の過程をコマ送りにする——バギング（Level2, 木を «並列» に独立して育てる）との対比が
 * 主題なので、あえて同じデータで «並列 vs 逐次» の違いを見せる。1ラウンドごとに
 * 「選ばれた決定株・加重誤差・発言権α・重みが増える誤分類点」をコールアウトし、
 * 最終ラウンドでは α 重み付き多数決の決定境界を見せる。描画は AdaBoostStepper.tsx。
 */

import type { VizFrame } from "@/components/viz";
import { type AdaBoostRound, adaBoostFit, adaBoostPredict, decisionBoundaryGrid, type GridCell } from "@/lib/stats/decision-trees-ensembles";
import { CLASS_TRAIN } from "@/lib/store/decision-trees-ensembles";

/** AdaBoost ステッパーのラウンド数。 */
export const ADABOOST_ROUNDS = 6;
/** 決定境界プレビューの解像度（ステッパーは軽量に保つ）。 */
const BOUNDARY_RESOLUTION = 22;

export type AdaBoostFramePayload = {
  round: number;
  rounds: AdaBoostRound[];
  boundary: GridCell[];
  misclassifiedCount: number;
};

/** AdaBoost ステッパーのフレーム列（1ラウンド進めるたびに1コマ）を作る。 */
export function buildAdaBoostFrames(nRounds: number = ADABOOST_ROUNDS): VizFrame<AdaBoostFramePayload>[] {
  const rounds = adaBoostFit(CLASS_TRAIN, nRounds);
  const frames: VizFrame<AdaBoostFramePayload>[] = [];

  for (let r = 0; r < rounds.length; r++) {
    const round = rounds[r];
    const boundary = decisionBoundaryGrid((x1, x2) => (adaBoostPredict(rounds, x1, x2, r + 1) === 1 ? 1 : 0), BOUNDARY_RESOLUTION);
    const misclassifiedCount = round.misclassified.filter(Boolean).length;
    const isLast = r === rounds.length - 1;
    const featureLabel = round.stump.feature === 0 ? "x₁" : "x₂";

    frames.push({
      payload: { round: r, rounds, boundary, misclassifiedCount },
      highlights: ["stump"],
      callout: {
        title: `ラウンド ${r + 1}/${rounds.length}: ${featureLabel} ≤ ${round.stump.threshold.toFixed(3)}`,
        body: `加重誤差 ${(round.weightedError * 100).toFixed(1)}% → 発言権 α=${round.alpha.toFixed(2)}。誤分類した${misclassifiedCount}点は次ラウンドで標本重み（バブルの大きさ）が増える。`,
        note: isLast
          ? `${rounds.length}本の決定株を α で重み付けした多数決が最終予測。バギング（木を並列・独立に育てる）と違い、AdaBoost は «前の株が間違えた点» に次の株が集中する逐次学習——バイアスを下げる方向に効く。`
          : undefined,
        kind: isLast ? "supplement" : "explain",
      },
    });
  }
  return frames;
}
