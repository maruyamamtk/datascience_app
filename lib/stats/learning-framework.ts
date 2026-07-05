/**
 * 機械学習の枠組み（I-1）の計算層（純関数・副作用なし・Vitest 対象）。
 *
 * 扱う道具:
 * - 多項式回帰の最小二乗フィット（設計行列 → 正規方程式 → ガウス消去で係数を解く）
 * - 経験誤差（訓練データ上の平均二乗誤差）と汎化誤差（真の関数／別データ上の誤差）
 * - モデルの複雑さ（多項式の次数）と過学習／適合不足
 * - バイアス分散分解（MSE = バイアス² + 分散、点推定の性質からの橋渡し）
 * - モデル評価の道具（k 分割交差検証、ブートストラップ再標本）
 *
 * 描画層（Lab/Stepper）と状態層（store）はこの純関数だけを呼ぶ。
 * 乱数は整数演算だけの決定的 LCG に閉じ、engine 差で結果がぶれないようにする。
 */

export type Fn = (x: number) => number;

/** 1 標本（説明変数 x と目的変数 y）。 */
export type Point = { x: number; y: number };

// ────────────────────────────────────────────────────────────
// 多項式の最小二乗フィット
// ────────────────────────────────────────────────────────────

/** x の多項式特徴ベクトル [1, x, x², …, x^degree]（整数冪は積で作り engine 差を避ける）。 */
export function polyFeatures(x: number, degree: number): number[] {
  const row: number[] = [];
  let p = 1;
  for (let k = 0; k <= degree; k++) {
    row.push(p);
    p *= x;
  }
  return row;
}

/** 係数 [c0, c1, …, cd] の多項式を x で評価する（ホーナー法）。 */
export function predictPolynomial(coeffs: number[], x: number): number {
  let acc = 0;
  for (let k = coeffs.length - 1; k >= 0; k--) {
    acc = acc * x + coeffs[k];
  }
  return acc;
}

/**
 * 連立一次方程式 A c = b を部分ピボット付きガウス消去で解く（A は正方・純関数）。
 * 特異に近い場合は NaN を含む解を返す（呼び出し側は微小リッジで回避する）。
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  // 破壊しないよう複製した拡大係数行列。
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    // 部分ピボット選択（絶対値最大の行を対角へ）。
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const diag = M[col][col];
    if (diag === 0) return new Array(n).fill(Number.NaN);
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / diag;
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / M[i][i]);
}

/**
 * 次数 degree の多項式を最小二乗（任意で L2 リッジ λ）でフィットし係数 [c0..cd] を返す。
 * 正規方程式 (AᵀA + λI) c = Aᵀy を解く。λ は既定 0（純粋な OLS）、
 * 微小値は数値安定化、大きな値は正則化（過学習の抑制、I-2 への橋渡し）として効く。
 */
export function fitPolynomial(xs: number[], ys: number[], degree: number, ridge = 0): number[] {
  const cols = degree + 1;
  const design = xs.map((x) => polyFeatures(x, degree));
  // AᵀA（対称）と Aᵀy を作る。
  const ata: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0));
  const aty: number[] = new Array(cols).fill(0);
  for (let s = 0; s < xs.length; s++) {
    const row = design[s];
    for (let i = 0; i < cols; i++) {
      aty[i] += row[i] * ys[s];
      for (let j = 0; j < cols; j++) ata[i][j] += row[i] * row[j];
    }
  }
  if (ridge > 0) {
    for (let i = 0; i < cols; i++) ata[i][i] += ridge;
  }
  return solveLinearSystem(ata, aty);
}

// ────────────────────────────────────────────────────────────
// 損失と誤差（経験誤差・汎化誤差）
// ────────────────────────────────────────────────────────────

/** 二乗損失 (ŷ − y)²。 */
export function squaredLoss(pred: number, target: number): number {
  const e = pred - target;
  return e * e;
}

/** 0-1 損失（分類）：一致で 0、不一致で 1。 */
export function zeroOneLoss(pred: number, target: number): number {
  return pred === target ? 0 : 1;
}

/** 平均二乗誤差 MSE = (1/n)Σ(ŷ−y)²（経験誤差・汎化誤差どちらの器にも使う）。 */
export function meanSquaredError(preds: number[], targets: number[]): number {
  if (preds.length === 0) return Number.NaN;
  let sum = 0;
  for (let i = 0; i < preds.length; i++) sum += squaredLoss(preds[i], targets[i]);
  return sum / preds.length;
}

/** 二乗平均平方根誤差 RMSE = √MSE。 */
export function rootMeanSquaredError(preds: number[], targets: number[]): number {
  return Math.sqrt(meanSquaredError(preds, targets));
}

/**
 * 多項式係数と評価点集合から誤差（平均二乗誤差）を測る。
 * targets を «訓練 y» にすれば経験誤差、«真の関数値» や «別データ» にすれば汎化誤差。
 */
export function polynomialMSE(coeffs: number[], xs: number[], targets: number[]): number {
  const preds = xs.map((x) => predictPolynomial(coeffs, x));
  return meanSquaredError(preds, targets);
}

// ────────────────────────────────────────────────────────────
// 決定的な擬似乱数（整数 LCG）とデータ生成
// ────────────────────────────────────────────────────────────

/**
 * 決定的な線形合同法（LCG, Numerical Recipes 係数）。整数演算だけなので
 * どの JS engine でも同じ列を返す（SSR とブラウザで結果がぶれない）。
 * 返すのは [0,1) の一様乱数を生む関数。
 */
export function makeLcg(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    // state = (1664525·state + 1013904223) mod 2³²、上位ビットを [0,1) に。
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** 一様乱数 3 個の和−1.5 で近似ガウス（Irwin–Hall、超越関数を使わず決定的）。 */
export function pseudoGaussian(rng: () => number): number {
  return rng() + rng() + rng() - 1.5;
}

// ────────────────────────────────────────────────────────────
// モデル評価（交差検証・ブートストラップ）
// ────────────────────────────────────────────────────────────

/** k 分割交差検証の 1 分割（検証に回す添字と、残りの訓練添字）。 */
export type Fold = { trainIdx: number[]; valIdx: number[] };

/**
 * n 個のデータを（ほぼ均等な）連続ブロックで k 分割し、各分割の
 * 「検証添字 / 訓練添字」を返す。各データはちょうど 1 回だけ検証に回る。
 */
export function kFoldIndices(n: number, k: number): Fold[] {
  const folds: Fold[] = [];
  for (let f = 0; f < k; f++) {
    const start = Math.floor((f * n) / k);
    const end = Math.floor(((f + 1) * n) / k);
    const valIdx: number[] = [];
    const trainIdx: number[] = [];
    for (let i = 0; i < n; i++) (i >= start && i < end ? valIdx : trainIdx).push(i);
    folds.push({ trainIdx, valIdx });
  }
  return folds;
}

/** LCG から «復元抽出» で n 個の添字を選ぶ（ブートストラップ標本）。 */
export function bootstrapIndices(n: number, rng: () => number): number[] {
  return Array.from({ length: n }, () => Math.floor(rng() * n));
}

// ────────────────────────────────────────────────────────────
// バイアス分散分解（点推定の性質からの橋渡し）
// ────────────────────────────────────────────────────────────

/** バイアス分散分解の結果（各評価点ごと＋平均）。 */
export type BiasVariance = {
  /** 各評価点での平均予測 E[ŷ]。 */
  meanPred: number[];
  /** 各評価点でのバイアス² (E[ŷ]−f)²。 */
  bias2: number[];
  /** 各評価点での分散 Var[ŷ]。 */
  variance: number[];
  /** 評価点平均のバイアス²。 */
  avgBias2: number;
  /** 評価点平均の分散。 */
  avgVariance: number;
};

/**
 * 複数モデル（再標本ごとにフィットした予測列）の予測を、評価点ごとに
 * バイアス² と分散に分解する。MSE ≈ バイアス² + 分散（+ノイズ）の実演。
 * predictionsPerModel[m][t] = m 番目のモデルの評価点 t での予測、truth[t] = 真値 f(x_t)。
 */
export function biasVarianceDecomposition(
  predictionsPerModel: number[][],
  truth: number[],
): BiasVariance {
  const M = predictionsPerModel.length;
  const T = truth.length;
  const meanPred = new Array(T).fill(0);
  const bias2 = new Array(T).fill(0);
  const variance = new Array(T).fill(0);
  for (let t = 0; t < T; t++) {
    let mean = 0;
    for (let m = 0; m < M; m++) mean += predictionsPerModel[m][t];
    mean /= M;
    meanPred[t] = mean;
    bias2[t] = (mean - truth[t]) ** 2;
    let v = 0;
    for (let m = 0; m < M; m++) v += (predictionsPerModel[m][t] - mean) ** 2;
    variance[t] = v / M;
  }
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  return { meanPred, bias2, variance, avgBias2: avg(bias2), avgVariance: avg(variance) };
}

/** [min,max] を n 点で等分（端点を含む）。 */
export function linspace(min: number, max: number, n: number): number[] {
  if (n <= 1) return [min];
  return Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1));
}
