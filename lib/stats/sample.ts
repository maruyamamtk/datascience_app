/**
 * 計算層（純関数）の最小サンプル。
 * 副作用を持たず、Vitest で単体テスト可能であることを示す土台。
 * 本格的な統計関数（乱数・分布・標本平均など）は後続 Issue で拡充する。
 */

/** 標本平均 E[x] を計算する。空配列は 0 を返す。 */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}
