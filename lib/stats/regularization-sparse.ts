/**
 * 正則化・スパースモデリング（I-2）の計算層（純関数・副作用なし・Vitest 対象）。
 *
 * 扱う道具:
 * - リッジ回帰（L2 正則化）: 罰則 λΣβ² を加えた正規方程式 (XᵀX+λI)β=Xᵀy の閉じた解
 * - Lasso回帰（L1 正則化）: 罰則 λΣ|β| は微分不能なので座標降下法＋軟閾値作用素で解く
 * - 正則化パス: λ を連続的に動かしたときの係数の推移（Lasso はちょうど0になる＝スパース化）
 *
 * 多項式特徴 [x, x², …, x^d]（定数項は除く）を標準化してから罰則をかけるのが定石
 * （そうしないと次数ごとにスケールが違い λ の効き方が不公平になる）。切片は罰則をかけず
 * y の中心化だけで求める。描画層（Lab/Stepper）と状態層（store）はこの純関数だけを呼ぶ。
 */

// ────────────────────────────────────────────────────────────
// 多項式特徴（定数項なし）と線形代数
// ────────────────────────────────────────────────────────────

/** x の多項式特徴ベクトル [x, x², …, x^degree]（定数項1は含まない。切片は別に中心化で扱う）。 */
export function polyFeaturesNoConst(x: number, degree: number): number[] {
  const row: number[] = [];
  let p = x;
  for (let k = 1; k <= degree; k++) {
    row.push(p);
    p *= x;
  }
  return row;
}

/** 連立一次方程式 A c = b を部分ピボット付きガウス消去で解く（A は正方・純関数）。 */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
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

// ────────────────────────────────────────────────────────────
// 標準化（列ごとに平均0・標準偏差1へ、罰則を次数間で公平にする）
// ────────────────────────────────────────────────────────────

export type Standardized = { Xs: number[][]; mean: number[]; std: number[] };

/** 各列を平均0・標準偏差1へ標準化する（標準偏差が0に近い列は1として扱いゼロ割りを避ける）。 */
export function standardizeColumns(X: number[][]): Standardized {
  const n = X.length;
  const p = X[0]?.length ?? 0;
  const mean = new Array(p).fill(0);
  const std = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    let m = 0;
    for (let i = 0; i < n; i++) m += X[i][j];
    m /= n;
    let v = 0;
    for (let i = 0; i < n; i++) v += (X[i][j] - m) ** 2;
    v /= n;
    mean[j] = m;
    std[j] = Math.sqrt(v) || 1;
  }
  const Xs = X.map((row) => row.map((x, j) => (x - mean[j]) / std[j]));
  return { Xs, mean, std };
}

/** ベクトルを中心化する（平均を引く）。 */
export function centerVector(y: number[]): { yc: number[]; mean: number } {
  const mean = y.reduce((s, v) => s + v, 0) / y.length;
  return { yc: y.map((v) => v - mean), mean };
}

// ────────────────────────────────────────────────────────────
// リッジ回帰（L2正則化）: 閉じた解
// ────────────────────────────────────────────────────────────

/**
 * 標準化済み特徴 Xs・中心化済み目的変数 yc に対し、リッジ回帰の係数を正規方程式
 * (XsᵀXs + λI)β = Xsᵀyc で解く（λ=0 なら通常の最小二乗）。切片は含まない。
 */
export function ridgeFit(Xs: number[][], yc: number[], lambda: number): number[] {
  const n = Xs.length;
  const p = Xs[0]?.length ?? 0;
  const ata: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const aty: number[] = new Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      aty[j] += Xs[i][j] * yc[i];
      for (let k = 0; k < p; k++) ata[j][k] += Xs[i][j] * Xs[i][k];
    }
  }
  for (let j = 0; j < p; j++) ata[j][j] += lambda;
  return solveLinearSystem(ata, aty);
}

// ────────────────────────────────────────────────────────────
// Lasso回帰（L1正則化）: 軟閾値作用素 + 座標降下法
// ────────────────────────────────────────────────────────────

/** 軟閾値作用素 S(z,γ) = sign(z)·max(|z|−γ, 0)。Lasso の各座標更新の核。 */
export function softThreshold(z: number, gamma: number): number {
  if (z > gamma) return z - gamma;
  if (z < -gamma) return z + gamma;
  return 0;
}

/**
 * 座標降下法で Lasso 回帰 min_β ‖yc−Xsβ‖²+λΣ|β_j| を解く。
 * 二乗誤差項を β_j で微分すると係数2が出るが罰則 λ|β_j| の劣微分には出ないため、
 * 各座標の停留条件は 2z_jβ_j−2ρ_j+λ·sign(β_j)=0 となり、閾値は λ «そのもの» ではなく
 * λ/2（β_j ← S(ρ_j, λ/2) / z_j、ρ_j は j 番目を除いた残差との内積、z_j=Σ Xs[i][j]²）。
 * こうして初めて Ridge（‖y−Xβ‖²+λΣβ_j²）と «同じ λ» が同じ強さの罰則を意味する。
 * warmStart を渡すと収束が速い（正則化パスをたどるときに使う）。
 */
export function lassoCoordinateDescent(
  Xs: number[][],
  yc: number[],
  lambda: number,
  maxIter = 300,
  tol = 1e-9,
  warmStart?: number[],
): number[] {
  const n = Xs.length;
  const p = Xs[0]?.length ?? 0;
  const beta = warmStart ? [...warmStart] : new Array(p).fill(0);
  const z = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += Xs[i][j] * Xs[i][j];
    z[j] = s;
  }
  const pred = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < p; j++) s += Xs[i][j] * beta[j];
    pred[i] = s;
  }

  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0;
    for (let j = 0; j < p; j++) {
      let rho = 0;
      for (let i = 0; i < n; i++) rho += Xs[i][j] * (yc[i] - pred[i] + Xs[i][j] * beta[j]);
      const newBetaJ = z[j] === 0 ? 0 : softThreshold(rho, lambda / 2) / z[j];
      const delta = newBetaJ - beta[j];
      if (delta !== 0) {
        for (let i = 0; i < n; i++) pred[i] += Xs[i][j] * delta;
      }
      maxChange = Math.max(maxChange, Math.abs(delta));
      beta[j] = newBetaJ;
    }
    if (maxChange < tol) break;
  }
  return beta;
}

// ────────────────────────────────────────────────────────────
// 正則化パス（λ を動かしたときの係数の推移）
// ────────────────────────────────────────────────────────────

export type Method = "ridge" | "lasso";

/**
 * λ を小さい方から大きい方へ動かし、各 λ での係数（標準化空間）を返す。
 * Lasso は直前の解を warm start にして座標降下法をたどる（正則化パスの定石）。
 */
export function regularizationPath(
  Xs: number[][],
  yc: number[],
  lambdas: number[],
  method: Method,
): number[][] {
  const p = Xs[0]?.length ?? 0;
  let warm = new Array(p).fill(0);
  const betas: number[][] = [];
  for (const lambda of lambdas) {
    warm = method === "ridge" ? ridgeFit(Xs, yc, lambda) : lassoCoordinateDescent(Xs, yc, lambda, 300, 1e-9, warm);
    betas.push([...warm]);
  }
  return betas;
}

// ────────────────────────────────────────────────────────────
// フィット全体（標準化 → 回帰 → 元スケールでの予測）
// ────────────────────────────────────────────────────────────

export type RegularizedFit = {
  coeffs: number[];
  intercept: number;
  mean: number[];
  std: number[];
  degree: number;
};

/** xs, ys（訓練データ）を次数 degree の多項式特徴で標準化し、指定手法・λ でフィットする。 */
export function fitRegularized(xs: number[], ys: number[], degree: number, lambda: number, method: Method): RegularizedFit {
  const X = xs.map((x) => polyFeaturesNoConst(x, degree));
  const { Xs, mean, std } = standardizeColumns(X);
  const { yc, mean: yMean } = centerVector(ys);
  const coeffs = method === "ridge" ? ridgeFit(Xs, yc, lambda) : lassoCoordinateDescent(Xs, yc, lambda);
  return { coeffs, intercept: yMean, mean, std, degree };
}

/** fitRegularized の結果を使って x での予測値を計算する（元のスケールへ戻して評価）。 */
export function predictRegularized(fit: RegularizedFit, x: number): number {
  const feat = polyFeaturesNoConst(x, fit.degree);
  let acc = fit.intercept;
  for (let j = 0; j < fit.coeffs.length; j++) {
    acc += fit.coeffs[j] * ((feat[j] - fit.mean[j]) / fit.std[j]);
  }
  return acc;
}

// ────────────────────────────────────────────────────────────
// 誤差・決定的乱数（I-1 と同じ整数 LCG。SSR/CSR で結果がぶれない）
// ────────────────────────────────────────────────────────────

export function meanSquaredError(preds: number[], targets: number[]): number {
  if (preds.length === 0) return Number.NaN;
  let sum = 0;
  for (let i = 0; i < preds.length; i++) sum += (preds[i] - targets[i]) ** 2;
  return sum / preds.length;
}

export function rootMeanSquaredError(preds: number[], targets: number[]): number {
  return Math.sqrt(meanSquaredError(preds, targets));
}

/** 決定的な線形合同法（整数演算だけなので SSR とブラウザで結果がぶれない）。 */
export function makeLcg(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** 一様乱数3個の和−1.5 で近似ガウス（Irwin–Hall、超越関数を使わず決定的）。 */
export function pseudoGaussian(rng: () => number): number {
  return rng() + rng() + rng() - 1.5;
}

/** [min,max] を n 点で等分（端点を含む）。 */
export function linspace(min: number, max: number, n: number): number[] {
  if (n <= 1) return [min];
  return Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1));
}

/** [logMin,logMax] を n 点で対数等分した 10^k の列（λ のスライダー・パス用）。 */
export function logspace(logMin: number, logMax: number, n: number): number[] {
  return linspace(logMin, logMax, n).map((v) => 10 ** v);
}
