import {
  type Fn,
  fitPolynomial,
  linspace,
  makeLcg,
  type Point,
  polynomialMSE,
  predictPolynomial,
  pseudoGaussian,
  rootMeanSquaredError,
} from "@/lib/stats/learning-framework";
import { createTopicStore } from "./topicStore";

/**
 * ラボの «真の関数» f(x)=sin(2πx)（x∈[0,1]）。多項式では厳密に表せないので、
 * 低次数はバイアス（系統的なズレ）、高次数は分散（訓練ノイズへの過適合）が現れる。
 */
export const TRUE_FN: Fn = (x) => Math.sin(2 * Math.PI * x);
export const X_MIN = 0;
export const X_MAX = 1;
/** 曲線描画・真の関数の表示に使う密なグリッド。 */
export const DENSE_N = 120;
export const DENSE_X = linspace(0.0, 1.0, DENSE_N);
export const DENSE_TRUTH = DENSE_X.map(TRUE_FN);

/** 操作の範囲。 */
export const DEG_MIN = 1;
export const DEG_MAX = 9;
export const NTRAIN_MIN = 5;
export const NTRAIN_MAX = 15;
/**
 * ラボのフィットは純 OLS（リッジ 0）。実効次数を «点数−1» で抑えるので特異化しない。
 * こうすると高次数で訓練ノイズに過適合し、汎化誤差の U 字がはっきり見える。
 */
export const LAB_RIDGE = 0;
/** ステッパーのブートストラップは復元抽出で相異なる x が減りうるので微小リッジで安定化。 */
export const FIT_RIDGE = 1e-6;
/** 訓練・テストデータのノイズ標準偏差の目安。 */
export const NOISE = 0.3;

/**
 * 決定的に生成した «全 15 点» の訓練データ（LCG は整数演算なので engine 非依存）。
 * nTrain スライダーはこの中から均等に間引いた部分集合を使う。
 */
const rng = makeLcg(20240706);
export const TRAIN_ALL: Point[] = linspace(0.04, 0.96, NTRAIN_MAX).map((x) => ({
  x,
  y: TRUE_FN(x) + NOISE * pseudoGaussian(rng),
}));

/**
 * 訓練とは «独立の» ノイズを持つ held-out テスト集合（40 点）。汎化誤差はここで測る。
 * 独立ノイズなので、訓練ノイズに合わせ込む（過学習する）ほどテスト誤差が悪化する。
 */
const testRng = makeLcg(99887766);
export const TEST_X = linspace(0.02, 0.98, 40);
export const TEST_Y = TEST_X.map((x) => TRUE_FN(x) + NOISE * pseudoGaussian(testRng));

/** 点数 n の訓練データに対する実効次数（n−1 まで。それ以上は増やせない）。 */
export function effectiveDegree(degree: number, nTrain: number): number {
  return Math.min(degree, nTrain - 1);
}

/** N 点から均等に m 点を選ぶ（両端を含み、被覆を保つ）。 */
export function selectSpread<T>(items: T[], m: number): T[] {
  const n = items.length;
  if (m >= n) return items;
  if (m <= 1) return [items[0]];
  const idx = Array.from({ length: m }, (_, i) => Math.round((i * (n - 1)) / (m - 1)));
  return idx.map((i) => items[i]);
}

/**
 * バイアス分散ステッパー用の設定。高次数（複雑なモデル）を再標本（ブートストラップ）
 * ごとにフィットし、フィットの «ばらつき»（分散）と平均フィットの «真からのズレ»（バイアス）を見せる。
 */
export const STEP_DEGREE = 6;
export const STEP_NTRAIN = 12;
export const STEP_M = 8;
export const STEP_SEED = 424242;
export const STEP_TRAIN: Point[] = selectSpread(TRAIN_ALL, STEP_NTRAIN);

/** 標本化＋量子化ラボの操作値。 */
export type LfControls = {
  /** 多項式の次数（モデルの複雑さ）。 */
  degree: number;
  /** 訓練データの点数。 */
  nTrain: number;
};

export type XY = { x: number; y: number };
/** 次数ごとの経験誤差・汎化誤差（√MSE）。 */
export type ErrPoint = { degree: number; trainRmse: number; testRmse: number };
export type Regime = "underfit" | "good" | "overfit";

export type LfDerived = {
  degree: number;
  nTrain: number;
  /** 実効次数（点数−1 で頭打ち）。 */
  effDegree: number;
  /** 実際に使った訓練点。 */
  trainPoints: Point[];
  /** フィットした多項式の係数。 */
  coeffs: number[];
  /** フィット曲線（密グリッド）。 */
  fitCurve: XY[];
  /** 真の関数の曲線（密グリッド）。 */
  trueCurve: XY[];
  /** 経験誤差（訓練 MSE）と汎化誤差（held-out テスト MSE）。 */
  trainMse: number;
  testMse: number;
  trainRmse: number;
  testRmse: number;
  /** 経験誤差と汎化誤差の差（汎化ギャップ）。 */
  gap: number;
  /** 次数 1..DEG_MAX を同じ訓練集合で走査した誤差曲線（U 字を描く）。 */
  errorCurve: ErrPoint[];
  /** 汎化誤差が最小の次数（«ちょうどよい» 複雑さ）。 */
  bestDegree: number;
  /** いまの次数が最適に対して過少／適正／過剰か。 */
  regime: Regime;
};

function fitAndErrors(train: Point[], degree: number): { coeffs: number[]; trainRmse: number; testRmse: number } {
  const xs = train.map((p) => p.x);
  const ys = train.map((p) => p.y);
  const ed = effectiveDegree(degree, train.length);
  const coeffs = fitPolynomial(xs, ys, ed, LAB_RIDGE);
  const trainRmse = rootMeanSquaredError(
    xs.map((x) => predictPolynomial(coeffs, x)),
    ys,
  );
  // 汎化誤差は «独立ノイズの held-out テスト集合» に対する誤差で測る。
  const testRmse = rootMeanSquaredError(
    TEST_X.map((x) => predictPolynomial(coeffs, x)),
    TEST_Y,
  );
  return { coeffs, trainRmse, testRmse };
}

/**
 * 機械学習の枠組み（I-1）トピックの Zustand ストア（single source of truth）。
 * Control 層（多項式の次数 degree・訓練点数 nTrain）は action を呼び、Render 層
 * （ModelComplexityLab のフィット曲線・誤差 U 字曲線と数式 経験誤差／汎化誤差）は
 * controls・derived を購読する。degree を上げると訓練誤差は減るが汎化誤差は U 字を描く（過学習）。
 * frame はバイアス分散ステッパー（再標本ごとのフィットの «ばらつき» をコマ送り）が使う。
 */
export const useLearningFrameworkStore = createTopicStore<LfControls, LfDerived>({
  initialControls: { degree: 9, nTrain: 10 },
  derive: ({ degree, nTrain }) => {
    const trainPoints = selectSpread(TRAIN_ALL, nTrain);
    const xs = trainPoints.map((p) => p.x);
    const ys = trainPoints.map((p) => p.y);
    const effDegree = effectiveDegree(degree, trainPoints.length);
    const coeffs = fitPolynomial(xs, ys, effDegree, LAB_RIDGE);
    const fitCurve = DENSE_X.map((x) => ({ x, y: predictPolynomial(coeffs, x) }));
    const trueCurve = DENSE_X.map((x, i) => ({ x, y: DENSE_TRUTH[i] }));
    const trainMse = polynomialMSE(coeffs, xs, ys);
    const testMse = polynomialMSE(coeffs, TEST_X, TEST_Y);

    const errorCurve: ErrPoint[] = [];
    for (let d = DEG_MIN; d <= DEG_MAX; d++) {
      const e = fitAndErrors(trainPoints, d);
      errorCurve.push({ degree: d, trainRmse: e.trainRmse, testRmse: e.testRmse });
    }
    let bestDegree = errorCurve[0].degree;
    let bestErr = errorCurve[0].testRmse;
    for (const e of errorCurve) {
      if (e.testRmse < bestErr) {
        bestErr = e.testRmse;
        bestDegree = e.degree;
      }
    }
    const regime: Regime = degree < bestDegree ? "underfit" : degree > bestDegree ? "overfit" : "good";

    return {
      degree,
      nTrain,
      effDegree,
      trainPoints,
      coeffs,
      fitCurve,
      trueCurve,
      trainMse,
      testMse,
      trainRmse: Math.sqrt(trainMse),
      testRmse: Math.sqrt(testMse),
      gap: Math.sqrt(testMse) - Math.sqrt(trainMse),
      errorCurve,
      bestDegree,
      regime,
    };
  },
});
