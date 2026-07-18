import {
  accuracy,
  type ClassGaussianParams,
  type ClassStats,
  confidenceEllipse,
  decisionBoundaryGrid,
  type Ellipse,
  fitGaussianNB,
  generateGaussianClassData,
  type GridCell,
  type KnnPrediction,
  knnPredict,
  naiveBayesPredict,
  type NBPrediction,
  type Point2D,
} from "@/lib/stats/naive-bayes-knn";
import { createTopicStore } from "./topicStore";

/**
 * 単純ベイズ・k近傍法（I-4）で共通に使う判別データ（2特徴量、2つのガウス分布、決定的LCG）。
 * ナイーブベイズが仮定する «各クラスは正規分布» にそのまま噛み合うデータにすることで、
 * ガウス分布の等高線（信頼楕円）がそのままデータの «山» の形になる——という Level0〜1 の
 * 物語を作る（frames の nb-frames.ts / knn-frames.ts は別データを使う）。
 */
export const N_PER_CLASS_TRAIN = 30;
export const N_PER_CLASS_TEST = 25;
const TRAIN_SEED = 20260401;
const TEST_SEED = 20260415;

export const CLASS_PARAMS: Record<0 | 1, ClassGaussianParams> = {
  0: { mean1: 0.32, mean2: 0.34, sd1: 0.11, sd2: 0.14 },
  1: { mean1: 0.66, mean2: 0.63, sd1: 0.15, sd2: 0.11 },
};

export const CLASS_TRAIN: Point2D[] = generateGaussianClassData(N_PER_CLASS_TRAIN, TRAIN_SEED, CLASS_PARAMS);
export const CLASS_TEST: Point2D[] = generateGaussianClassData(N_PER_CLASS_TEST, TEST_SEED, CLASS_PARAMS);

/** ナイーブベイズの分布パラメータは訓練データのみに依存し、操作値では変わらないので一度だけ計算する。 */
export const CLASS_STATS: ClassStats[] = fitGaussianNB(CLASS_TRAIN);
const NB_C0 = CLASS_STATS.find((c) => c.label === 0)!;
const NB_C1 = CLASS_STATS.find((c) => c.label === 1)!;

/** 1σ・2σの信頼楕円（等高線の近似）。ナイーブベイズラボ・ステッパー双方の描画に使う。 */
export const NB_ELLIPSES_1SD: Record<0 | 1, Ellipse> = { 0: confidenceEllipse(NB_C0, 1), 1: confidenceEllipse(NB_C1, 1) };
export const NB_ELLIPSES_2SD: Record<0 | 1, Ellipse> = { 0: confidenceEllipse(NB_C0, 2), 1: confidenceEllipse(NB_C1, 2) };

/** 決定境界グリッドの解像度（小さく保って60fps目標・再計算コストを抑える）。 */
export const GRID_RESOLUTION = 28;

export const K_MIN = 1;
export const K_MAX = 25;

/** ナイーブベイズの決定境界・テスト正解率は操作値に依存しないので一度だけ計算する。 */
export const NB_BOUNDARY: GridCell[] = decisionBoundaryGrid((x1, x2) => naiveBayesPredict(CLASS_STATS, x1, x2).label, GRID_RESOLUTION);
export const NB_TEST_ACC: number = accuracy(CLASS_TEST, (x1, x2) => naiveBayesPredict(CLASS_STATS, x1, x2).label);

/**
 * k近傍法の決定境界・テスト正解率は k にしか依存しない（クエリ点の座標には依存しない）。
 * k の取りうる範囲（K_MIN..K_MAX）は小さく固定なので、起動時に k ごとの結果を一度だけ
 * 事前計算してテーブルに持つ——ドラッグで queryX1/queryX2 だけが動くたびに毎回グリッド全体
 * （resolution²×訓練点数の距離計算）を再計算するのを避ける（CLAUDE.md §2「重い計算は
 * 再計算を間引く/メモ化」・60fps目標）。
 */
const KNN_BOUNDARY_BY_K = new Map<number, GridCell[]>();
const KNN_TEST_ACC_BY_K = new Map<number, number>();
for (let k = K_MIN; k <= K_MAX; k++) {
  KNN_BOUNDARY_BY_K.set(k, decisionBoundaryGrid((x1, x2) => knnPredict(CLASS_TRAIN, { x1, x2 }, k).label, GRID_RESOLUTION));
  KNN_TEST_ACC_BY_K.set(k, accuracy(CLASS_TEST, (x1, x2) => knnPredict(CLASS_TRAIN, { x1, x2 }, k).label));
}

export type MainControls = {
  /** «新しい点» の座標。ナイーブベイズ・k近傍法どちらのラボも同じ点を分類し、手法を比較する。 */
  queryX1: number;
  queryX2: number;
  /** k近傍法の近傍数。 */
  k: number;
};

export type MainDerived = {
  queryX1: number;
  queryX2: number;
  k: number;
  nb: NBPrediction;
  knn: KnnPrediction;
  knnBoundary: GridCell[];
  knnTestAcc: number;
};

/**
 * Level0（NaiveBayesLab）・Level2（KnnLab）が購読するメインストア。
 * queryX1/queryX2（新しい点の座標）は両ラボで共有し «同じ点を2つの手法がどう判断するか»
 * を比較できるようにする。k はk近傍法のみに効く。すべて controls → derive(純関数, lib/stats)
 * の単一経路で再計算する（single source of truth）。
 */
export const useNaiveBayesKnnStore = createTopicStore<MainControls, MainDerived>({
  initialControls: { queryX1: 0.5, queryX2: 0.5, k: 5 },
  derive: ({ queryX1, queryX2, k }) => {
    const nb = naiveBayesPredict(CLASS_STATS, queryX1, queryX2);
    const query = { x1: queryX1, x2: queryX2 };
    const knn = knnPredict(CLASS_TRAIN, query, k);
    const knnBoundary = KNN_BOUNDARY_BY_K.get(k) ?? [];
    const knnTestAcc = KNN_TEST_ACC_BY_K.get(k) ?? Number.NaN;
    return { queryX1, queryX2, k, nb, knn, knnBoundary, knnTestAcc };
  },
});

/**
 * コマ送りステッパー専用の «空 controls» ストア（Level1 のナイーブベイズ尤度ステッパー・
 * Level2 のk近傍探索ステッパーで使う）。フレーム «中身» は各コンポーネントの
 * nb-frames.ts / knn-frames.ts が純関数で作り、ストアは `frame`（index/count/playing）だけを
 * single source of truth として提供する——2つのステッパーが同一ページに同時に存在するため、
 * メインストアの frame とは独立させる（tasks/lessons.md #76 の教訓）。
 */
export type EmptyControls = Record<string, never>;
export type EmptyDerived = Record<string, never>;

export const useNaiveBayesStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});

export const useKnnStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});
