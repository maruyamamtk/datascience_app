/**
 * 共分散構造分析・因子分析（H-4）トピックの計算層（純関数）。
 * 1因子モデル（観測変数 = 因子負荷×共通因子 + 独自因子）の含意相関・共通性・独自性・残差を扱う。
 * 「観測変数の相関を、少数の潜在因子で説明する」共分散構造のモデル化の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。
 */

/**
 * 1因子モデルが含意する相関行列。標準化を仮定し、
 * 非対角 r_ij = λ_i·λ_j（共通因子経由の相関）、対角は1。
 */
export function impliedCorrelation(loadings: readonly number[]): number[][] {
  const p = loadings.length;
  return Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) => (i === j ? 1 : loadings[i] * loadings[j])),
  );
}

/** 共通性 h_i² = λ_i²（共通因子が説明する分散の割合, 標準化時）。 */
export function communality(loading: number): number {
  return loading * loading;
}

/** 独自性 ψ_i = 1 − λ_i²（独自因子・誤差の分散, 標準化時）。 */
export function uniqueness(loading: number): number {
  return 1 - loading * loading;
}

/** 観測相関と含意相関の残差行列（observed − implied）。 */
export function residualMatrix(
  observed: readonly (readonly number[])[],
  loadings: readonly number[],
): number[][] {
  const implied = impliedCorrelation(loadings);
  return observed.map((row, i) => row.map((v, j) => v - implied[i][j]));
}

/** 非対角の残差平方和（モデルの当てはまりの悪さ）。対角は構造上1なので除く。 */
export function residualSumOfSquares(
  observed: readonly (readonly number[])[],
  loadings: readonly number[],
): number {
  const res = residualMatrix(observed, loadings);
  let s = 0;
  for (let i = 0; i < res.length; i++) {
    for (let j = 0; j < res.length; j++) {
      if (i !== j) s += res[i][j] * res[i][j];
    }
  }
  return s;
}

/** 全変数の共通性の平均（モデル全体での «説明できた分散» の目安）。 */
export function meanCommunality(loadings: readonly number[]): number {
  if (loadings.length === 0) return 0;
  return loadings.reduce((a, l) => a + communality(l), 0) / loadings.length;
}

/**
 * 主因子法（principal factor）で1因子の負荷を推定する。
 * 対角を共通性の推定（各行の非対角の最大絶対値）に置き換えた «縮約相関行列» の
 * 第1固有ベクトルを冪乗法で求め、√固有値でスケールした負荷を返す。小規模向け。
 */
export function fitOneFactor(observed: readonly (readonly number[])[], iters = 100): number[] {
  const p = observed.length;
  // 縮約相関行列（対角を共通性の初期推定に置換）。
  const reduced = observed.map((row, i) => {
    const offMax = Math.max(...row.map((v, j) => (i === j ? 0 : Math.abs(v))));
    return row.map((v, j) => (i === j ? offMax : v));
  });
  // 冪乗法で第1固有ベクトル。
  let v = new Array(p).fill(1 / Math.sqrt(p));
  let lambda = 0;
  for (let it = 0; it < iters; it++) {
    const w = reduced.map((row) => row.reduce((a, x, j) => a + x * v[j], 0));
    const norm = Math.hypot(...w) || 1;
    const next = w.map((x) => x / norm);
    lambda = norm;
    v = next;
  }
  const scale = Math.sqrt(Math.max(0, lambda));
  // 符号は «正の負荷» が多くなる向きに揃える。
  const sign = v.reduce((a, x) => a + x, 0) < 0 ? -1 : 1;
  return v.map((x) => Math.min(0.999, Math.max(-0.999, sign * x * scale)));
}
