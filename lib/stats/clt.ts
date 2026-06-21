/**
 * 中心極限定理(CLT)トピックの計算層（純関数）。
 * 操作値（母標準偏差 σ・標本サイズ n）から派生値（標準誤差 SE）を導出する。
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2「計算層は純関数」）。
 * 描画・状態保持は持たない。ストア（lib/store）はこの derive を呼ぶだけにする。
 */

/** CLT トピックの操作値（ユーザーが直接いじる single source of truth）。 */
export type CltControls = {
  /** 母標準偏差 σ（>0 を想定）。 */
  sigma: number;
  /** 標本サイズ n（>=1 を想定）。 */
  n: number;
};

/** CLT トピックの派生値（controls から純関数で再計算。直接書き換えない）。 */
export type CltDerived = {
  /** 標準誤差 SE = σ/√n。 */
  standardError: number;
};

/** 標準誤差 SE = σ/√n。n<=0 は NaN（呼び出し側で formatNumber により "—" 表示）。 */
export function standardError(sigma: number, n: number): number {
  if (n <= 0) return Number.NaN;
  return sigma / Math.sqrt(n);
}

/**
 * 操作値から派生値を導出する純関数。ストアの `derive` に渡す唯一の計算入口。
 * 派生値を増やすときはここに集約し、Graph/Math/数値表示はストア経由で受け取る。
 */
export function deriveClt(controls: CltControls): CltDerived {
  return {
    standardError: standardError(controls.sigma, controls.n),
  };
}
