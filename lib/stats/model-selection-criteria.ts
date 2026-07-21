/**
 * モデル選択基準(J-5)の計算層(純関数・副作用なし・Vitest対象)。
 *
 * 題材: 5個の候補説明変数(x1〜x5)を持つ小さな回帰データ(真のモデルはx1・x2だけがyに効き、
 * x3・x4・x5は真には無関係な «ダミー» 変数)を、説明変数を1個ずつ増やした6個のネストされた
 * 回帰モデル(切片のみ〜全5変数)として当てはめ、各モデルのRSS・対数尤度・AIC・BIC・
 * Mallows の Cp・k分割交差検証誤差を計算する(SPEC §3 J-5「情報量規準、AIC、BIC、
 * Mallows の Cp、cross validation」)。
 *
 * 前提関係(CLAUDE.md「前提関係を明示」・重複回避):
 * - [推定法](estimation-methods.ts)で導いた「正規誤差の最尤 = 最小二乗」
 *   (対数尤度がRSSの単調関数になる)という関係を、そのままAIC/BICの対数尤度項に使う。
 * - [重回帰分析](multiple-regression.ts)のolsFit(正規方程式によるOLS)をそのまま再利用する
 *   (回帰の当てはめ自体を再実装しない)。designMatrixは切片のみモデル(説明変数0個)で
 *   列数0からnを推定できない弱点があるため、本ファイルではnを明示的に渡す専用の
 *   buildDesignMatrixを使う。
 *
 * 乱数は決定的な整数演算LCG(tasks/lessons.md #74の教訓。他トピックと同じ方式でSSRとブラウザで
 * 結果がぶれない)。
 */

import { olsFit, type OlsFit } from "./multiple-regression";

// ────────────────────────────────────────────────────────────
// 決定的乱数(整数演算だけのLCG。SSRとブラウザで結果がぶれない)
// ────────────────────────────────────────────────────────────

/** 決定的な線形合同法(整数演算だけなのでSSRとブラウザで結果がぶれない)。 */
export function makeLcg(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** 一様乱数3個の和−1.5で近似ガウス(Irwin–Hall、超越関数を使わず決定的、標準偏差≈0.5)。 */
export function pseudoGaussian(rng: () => number): number {
  return rng() + rng() + rng() - 1.5;
}

// ────────────────────────────────────────────────────────────
// 候補説明変数5個・真に効くのはx1,x2だけの回帰データセット(固定・決定的)
// ────────────────────────────────────────────────────────────

export const N_OBS = 24;
export const N_CANDIDATES = 5;
/** 真の切片・傾き(x3,x4,x5の真の係数は0=真には無関係なダミー変数)。 */
export const TRUE_INTERCEPT = 3;
export const TRUE_COEFS = [2, -1.5, 0, 0, 0] as const;
export const NOISE_SD = 1.2;
/**
 * このseedを選んだ理由(tasks/lessons.md「最適パラメータを決め打ちしない」の教訓どおり、
 * 実際に評価した結果で選定): AIC/BIC/Cpの3指標が一致しない具体例になっている
 * (AICは無関係なx3を含むk=3を最小と判断してしまうが、BIC・Cp・交差検証はいずれも
 * 真のモデルk=2(x1,x2のみ)を正しく選ぶ)——「AICはBICより大きめのモデルを選びがち」という
 * 教科書的な現象を、このアプリの決定的な合成データで再現できる。
 */
export const DATA_SEED = 20_017;

export type RegressionDataset = {
  /** 説明変数の列(x1〜x5の順。各列の長さはn)。 */
  columns: number[][];
  /** 応答変数y。 */
  y: number[];
};

/**
 * 「x1・x2だけが真に効き、x3・x4・x5は無関係」な回帰データを決定的に生成する。
 * 説明変数はすべて独立な疑似正規乱数(多重共線性を持ち込まない、tasks/lessons.md #75の教訓:
 * ネストモデル比較の物語をクリアに見せたいときは無相関な合成データにする)。
 */
export function generateDataset(seed: number = DATA_SEED, n: number = N_OBS): RegressionDataset {
  const rng = makeLcg(seed);
  const columns: number[][] = Array.from({ length: N_CANDIDATES }, () => []);
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const xs = columns.map(() => pseudoGaussian(rng) * 2); // 標準偏差 ≈ 1 にスケール
    xs.forEach((v, j) => columns[j].push(v));
    const signal = TRUE_INTERCEPT + xs.reduce((acc, v, j) => acc + TRUE_COEFS[j] * v, 0);
    const noise = pseudoGaussian(rng) * (NOISE_SD / 0.5);
    y.push(signal + noise);
  }
  return { columns, y };
}

// ────────────────────────────────────────────────────────────
// ネストされた回帰モデル(説明変数0〜N_CANDIDATES個)の当てはめ
// ────────────────────────────────────────────────────────────

/** 切片＋先頭k個の説明変数だけを使う計画行列を、行数nを明示して作る(k=0=切片のみに対応)。 */
export function buildDesignMatrix(columns: readonly number[][], k: number, n: number): number[][] {
  const subset = columns.slice(0, k);
  return Array.from({ length: n }, (_, i) => [1, ...subset.map((c) => c[i])]);
}

/**
 * 正規誤差OLSの対数尤度(σ²の最尤推定=RSS/nを代入した «濃縮対数尤度»)。
 * [推定法](estimation-methods.ts)の「正規誤差の最尤=最小二乗」の対数尤度を、
 * 分散も最尤推定するところまで進めた式:
 *   log L = −(n/2)(log 2π + log(RSS/n) + 1)
 * RSSが小さいほど(=当てはまりが良いほど)対数尤度は大きくなる単調減少の関係。
 */
export function logLikelihoodOf(rss: number, n: number): number {
  if (!(rss > 0) || !(n > 0)) return Number.NaN;
  return -(n / 2) * (Math.log(2 * Math.PI) + Math.log(rss / n) + 1);
}

/** AIC = −2×対数尤度 + 2×パラメータ数(paramCount)。 */
export function aicOf(logLik: number, paramCount: number): number {
  return -2 * logLik + 2 * paramCount;
}

/** BIC = −2×対数尤度 + パラメータ数×log(n)。 */
export function bicOf(logLik: number, paramCount: number, n: number): number {
  return -2 * logLik + paramCount * Math.log(n);
}

/**
 * Mallows の Cp = RSS_p/σ̂²_full − n + 2p。
 * σ̂²_full は最大(全変数)モデルのRSSから推定した誤差分散(不偏推定量、他のモデルに共通の «物差し»)。
 * pはそのモデルのパラメータ数(切片含む係数の数、paramCountと同じ数え方)。
 */
export function mallowsCpOf(rss: number, sigma2Full: number, n: number, paramCount: number): number {
  if (!(sigma2Full > 0)) return Number.NaN;
  return rss / sigma2Full - n + 2 * paramCount;
}

export type ModelFit = {
  /** このモデルに含まれる説明変数の数(0〜N_CANDIDATES)。 */
  k: number;
  /** 含まれる説明変数名(x1, x2, ...)。 */
  predictorNames: string[];
  /** パラメータ数 = 切片1 + 説明変数k個。AIC/BIC/Cpで共通に使う «k»。 */
  paramCount: number;
  rss: number;
  logLik: number;
  aic: number;
  bic: number;
  cp: number;
};

/**
 * 説明変数0個(切片のみ)〜N_CANDIDATES個までのネストされたモデルを全て当てはめ、
 * RSS・対数尤度・AIC・BIC・Cpをまとめて計算する(Lab/Stepperが購読する唯一の集約入口)。
 * 説明変数は常に x1, x2, … の順に追加する(ネスト構造を保ち、モデル間で单調にRSSが減ることを保証)。
 */
export function fitNestedModels(dataset: RegressionDataset): ModelFit[] {
  const { columns, y } = dataset;
  const n = y.length;
  const maxK = columns.length;

  const fullX = buildDesignMatrix(columns, maxK, n);
  const fullFit: OlsFit = olsFit(fullX, y);
  const pFull = maxK + 1;
  const dfFull = n - pFull;
  const sigma2Full = dfFull > 0 ? fullFit.rss / dfFull : Number.NaN;

  const models: ModelFit[] = [];
  for (let k = 0; k <= maxK; k++) {
    const X = buildDesignMatrix(columns, k, n);
    const fit = olsFit(X, y);
    const paramCount = k + 1;
    const logLik = logLikelihoodOf(fit.rss, n);
    models.push({
      k,
      predictorNames: Array.from({ length: k }, (_, i) => `x${i + 1}`),
      paramCount,
      rss: fit.rss,
      logLik,
      aic: aicOf(logLik, paramCount),
      bic: bicOf(logLik, paramCount, n),
      cp: mallowsCpOf(fit.rss, sigma2Full, n, paramCount),
    });
  }
  return models;
}

/** モデル列のうち、指定した指標(aic/bic/cp)が最小になるモデルを返す(argmin、決め打ちしない)。 */
export function argminBy(models: readonly ModelFit[], key: "aic" | "bic" | "cp"): ModelFit {
  return models.reduce((best, m) => (m[key] < best[key] ? m : best));
}

// ────────────────────────────────────────────────────────────
// なぜBICの方がAICよりモデルを小さく評価しがちか(ペナルティ項 log n vs 2 の比較)
// ────────────────────────────────────────────────────────────

/**
 * BICの1パラメータあたりのペナルティ(log n)がAICのそれ(2)を上回るかどうか。
 * log n > 2 ⟺ n > e² ≈ 7.39 (高校数学の指数・対数、両辺をeの指数に戻すだけで示せる)。
 * つまり標本サイズが8以上ある «ふつうの» データでは、BICは常にAICより1パラメータを
 * 重く罰する ⟹ 同じ対数尤度なら、BICはAICよりパラメータ数が少ないモデルを選びやすい。
 */
export function bicPenaltyExceedsAic(n: number): boolean {
  return Math.log(n) > 2;
}

/** BIC/AICのペナルティ差(1パラメータあたり) = log n − 2。 */
export function penaltyGap(n: number): number {
  return Math.log(n) - 2;
}

// ────────────────────────────────────────────────────────────
// k分割交差検証(モデルサイズごとの予測誤差、情報量規準とは別ルートでの比較)
// ────────────────────────────────────────────────────────────

/** n件をk個のフォールドへできるだけ均等に(番号順で)割り当てる、決定的な分割。 */
export function kFoldIndices(n: number, k: number): number[][] {
  const folds: number[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < n; i++) folds[i % k].push(i);
  return folds;
}

/**
 * 説明変数を先頭predictorCount個だけ使うモデルについて、k分割交差検証の平均二乗誤差(MSE)を計算する。
 * 各フォールドを検証用に残し、残りで再度OLSを当てはめてから検証用の予測誤差を集計する
 * (=情報量規準のような「同じデータで当てはめて罰則を引く」方式とは全く別ルートで、
 * モデルサイズの良し悪しを«未知データへの予測精度»から直接評価する)。
 */
export function cvMseOf(dataset: RegressionDataset, predictorCount: number, folds: readonly number[][]): number {
  const { columns, y } = dataset;
  const n = y.length;
  let sumSqErr = 0;
  let count = 0;
  for (const testIdx of folds) {
    const testSet = new Set(testIdx);
    const trainIdx: number[] = [];
    for (let i = 0; i < n; i++) if (!testSet.has(i)) trainIdx.push(i);

    const subset = columns.slice(0, predictorCount);
    const trainX = trainIdx.map((i) => [1, ...subset.map((c) => c[i])]);
    const trainY = trainIdx.map((i) => y[i]);
    const fit = olsFit(trainX, trainY);

    for (const i of testIdx) {
      const xi = [1, ...subset.map((c) => c[i])];
      const pred = xi.reduce((acc, v, j) => acc + v * fit.coefficients[j], 0);
      const err = y[i] - pred;
      sumSqErr += err * err;
      count++;
    }
  }
  return count > 0 ? sumSqErr / count : Number.NaN;
}

export const CV_FOLDS = 4;

/** 全ネストモデル(0〜N_CANDIDATES個の説明変数)について、k分割交差検証MSEをまとめて計算する。 */
export function cvMseForAllModels(dataset: RegressionDataset, foldCount: number = CV_FOLDS): number[] {
  const folds = kFoldIndices(dataset.y.length, foldCount);
  const maxK = dataset.columns.length;
  return Array.from({ length: maxK + 1 }, (_, k) => cvMseOf(dataset, k, folds));
}
