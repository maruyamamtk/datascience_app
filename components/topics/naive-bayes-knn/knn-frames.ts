/**
 * 「k近傍探索」ステッパー（Level2）のフレーム列ビルダー（計算層・純関数・Vitest 対象）。
 *
 * 固定の小さいデータセットで、1個の «新しい点» からの距離が近い順に訓練点を1つずつ調べ、
 * k本目までを近傍として採用・多数決票を積み上げていく過程をコマ送りにする。
 * ラボ本体（KnnLab）とは別の小さい専用データセットを使い、点数を絞って見通しよくする
 * （tasks/lessons.md: ステッパーは «見せたい本質だけを持つ» 専用データで作ってよい）。
 * 描画は KnnStepper.tsx。
 */

import type { CalloutKind, VizFrame } from "@/components/viz";
import { type ClassGaussianParams, generateGaussianClassData, type Point2D, sortByDistance } from "@/lib/stats/naive-bayes-knn";

/** ステッパー専用の小さい判別データ（ラボ本体とは別シード・別パラメータ）。 */
export const KNN_STEP_SEED = 161803;
export const KNN_STEP_N_PER_CLASS = 7;
export const KNN_STEP_K = 5;
export const KNN_STEP_QUERY = { x1: 0.52, x2: 0.46 };

const KNN_STEP_PARAMS: Record<0 | 1, ClassGaussianParams> = {
  0: { mean1: 0.3, mean2: 0.32, sd1: 0.12, sd2: 0.13 },
  1: { mean1: 0.68, mean2: 0.62, sd1: 0.13, sd2: 0.12 },
};

export const KNN_STEP_POINTS: Point2D[] = generateGaussianClassData(KNN_STEP_N_PER_CLASS, KNN_STEP_SEED, KNN_STEP_PARAMS);

export type KnnFramePayload = {
  points: readonly Point2D[];
  query: { x1: number; x2: number };
  order: ReturnType<typeof sortByDistance>;
  /** ここまでに調べ終えた点数（1-indexed）。 */
  revealed: number;
  k: number;
  votes: { label0: number; label1: number };
};

/** k近傍探索ステッパーのフレーム列（距離順に1点ずつ調べ、k本目までハイライトする）を作る。 */
export function buildKnnFrames(
  points: readonly Point2D[] = KNN_STEP_POINTS,
  query: { x1: number; x2: number } = KNN_STEP_QUERY,
  k: number = KNN_STEP_K,
): VizFrame<KnnFramePayload>[] {
  const order = sortByDistance(points, query);
  const frames: VizFrame<KnnFramePayload>[] = [];

  for (let i = 0; i < order.length; i++) {
    const revealed = i + 1;
    const withinK = order.slice(0, Math.min(revealed, k));
    const votes = {
      label0: withinK.filter((n) => n.point.label === 0).length,
      label1: withinK.filter((n) => n.point.label === 1).length,
    };
    const current = order[i];
    const isNeighbor = revealed <= k;
    const isLast = i === order.length - 1;
    const finalLabel = votes.label1 >= votes.label0 ? 1 : 0;

    let note: string | undefined;
    let kind: CalloutKind = "explain";
    if (isLast) {
      note = `全${order.length}点を距離順に見終えた。近傍 k=${k} 点の多数決は クラス0=${votes.label0}票・クラス1=${votes.label1}票 → クラス${finalLabel}と判定。`;
      kind = "supplement";
    }

    frames.push({
      payload: { points, query, order, revealed, k, votes },
      highlights: [isNeighbor ? "neighbor" : "excluded"],
      callout: {
        title: `${revealed}番目に近い点（距離 ${current.dist.toFixed(3)}）`,
        body: isNeighbor
          ? `ラベル${current.point.label}の点——k=${k}以内なので近傍に採用。現在の票: クラス0=${votes.label0} / クラス1=${votes.label1}。`
          : `ラベル${current.point.label}の点だが、k=${k}番目より遠いので多数決には使わない。`,
        note,
        kind,
      },
    });
  }

  return frames;
}
