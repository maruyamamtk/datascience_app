import {
  type Method,
  fitRegularized,
  linspace,
  makeLcg,
  predictRegularized,
  pseudoGaussian,
  rootMeanSquaredError,
} from "@/lib/stats/regularization-sparse";
import { createTopicStore } from "./topicStore";

/**
 * ラボの «真の関数» f(x)=sin(2πx)（x∈[0,1]）。[機械学習の枠組み](learning-framework) と同じ関数を使い、
 * «高次多項式（次数9）を小さいデータ（10点）でフィットすると不安定になる» という同じ問題設定から、
 * 正則化（λ）がその不安定さを «どう抑えるか» を見せる。
 */
export const TRUE_FN = (x: number) => Math.sin(2 * Math.PI * x);
export const X_MIN = 0;
export const X_MAX = 1;
export const DENSE_N = 120;
export const DENSE_X = linspace(0.0, 1.0, DENSE_N);
export const DENSE_TRUTH = DENSE_X.map(TRUE_FN);

/** モデルの複雑さは固定（次数9）。動かすのは正則化の強さ λ。 */
export const POLY_DEGREE = 9;
export const N_TRAIN = 10;
export const NOISE = 0.3;

/** λ = 10^logLambda。対数スケールで操作する（罰則の効きは桁で変わるため）。 */
export const LOG_LAMBDA_MIN = -4;
export const LOG_LAMBDA_MAX = 2;

/** 決定的に生成した訓練データ（整数LCG。SSR/CSRで結果がぶれない）。 */
const rng = makeLcg(20240707);
export const TRAIN_X = linspace(0.04, 0.96, N_TRAIN);
export const TRAIN_Y = TRAIN_X.map((x) => TRUE_FN(x) + NOISE * pseudoGaussian(rng));

/** 訓練とは独立のノイズを持つ held-out テスト集合（汎化誤差はここで測る）。 */
const testRng = makeLcg(13571113);
export const TEST_X = linspace(0.02, 0.98, 40);
export const TEST_Y = TEST_X.map((x) => TRUE_FN(x) + NOISE * pseudoGaussian(testRng));

/** バー表示で使う「係数の見出し」（x¹…x⁹）。 */
export const COEF_LABELS = Array.from({ length: POLY_DEGREE }, (_, i) => `x^${i + 1}`);

/**
 * ステッパー（正則化パス）用の λ 列（対数等分、小さい方から大きい方へ）。
 * こちらは多項式の次数ではなく「多くの候補変数のうち一部だけが真に効く」という
 * 変数選択の設定（frames.ts で定義）で使う——高次多項式どうしの強い相関で
 * 係数の順位が入れ替わるノイズを避け、Lasso のスパース化を素直に見せるため。
 */
export const STEP_LAMBDA_N = 16;
export const STEP_LOG_LAMBDA_MIN = -2;
export const STEP_LOG_LAMBDA_MAX = 2;

export type RsControls = {
  /** log10(λ)。操作はこの対数スケールで行う。 */
  logLambda: number;
  method: Method;
};

export type XY = { x: number; y: number };

export type RsDerived = {
  logLambda: number;
  lambda: number;
  method: Method;
  /** 標準化空間での係数（x¹…x⁹の順）。Lasso はここが厳密に0になりうる。 */
  coeffs: number[];
  intercept: number;
  fitCurve: XY[];
  trueCurve: XY[];
  trainPoints: XY[];
  trainRmse: number;
  testRmse: number;
  /** ちょうど0ではない係数の数（スパース性の指標）。 */
  nonzeroCount: number;
  /** 係数の絶対値和（縮小の度合いの指標）。 */
  coefNorm: number;
};

/**
 * 正則化・スパースモデリング（I-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（λ・手法 method）は action を呼び、Render 層（RegularizationLab の
 * フィット曲線・係数バーと数式 罰則 λ・非ゼロ数）は controls・derived を購読する。
 * λ を上げると係数は縮小し（Ridge は0にならず全体的に、Lasso はちょうど0になり自動変数選択）、
 * フィット曲線が滑らかに安定していく。frame は正則化パスステッパー（λが増えるコマ送り）が使う。
 */
export const useRegularizationSparseStore = createTopicStore<RsControls, RsDerived>({
  initialControls: { logLambda: LOG_LAMBDA_MIN, method: "ridge" },
  derive: ({ logLambda, method }) => {
    const lambda = 10 ** logLambda;
    const fit = fitRegularized(TRAIN_X, TRAIN_Y, POLY_DEGREE, lambda, method);
    const fitCurve = DENSE_X.map((x) => ({ x, y: predictRegularized(fit, x) }));
    const trueCurve = DENSE_X.map((x, i) => ({ x, y: DENSE_TRUTH[i] }));
    const trainPoints = TRAIN_X.map((x, i) => ({ x, y: TRAIN_Y[i] }));
    const trainRmse = rootMeanSquaredError(
      TRAIN_X.map((x) => predictRegularized(fit, x)),
      TRAIN_Y,
    );
    const testRmse = rootMeanSquaredError(
      TEST_X.map((x) => predictRegularized(fit, x)),
      TEST_Y,
    );
    const nonzeroCount = fit.coeffs.filter((c) => Math.abs(c) > 1e-6).length;
    const coefNorm = fit.coeffs.reduce((s, c) => s + Math.abs(c), 0);

    return {
      logLambda,
      lambda,
      method,
      coeffs: fit.coeffs,
      intercept: fit.intercept,
      fitCurve,
      trueCurve,
      trainPoints,
      trainRmse,
      testRmse,
      nonzeroCount,
      coefNorm,
    };
  },
});
