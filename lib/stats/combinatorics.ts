/**
 * 場合の数（順列・組合せ・階乗）と包除原理の計算層（純関数）。
 * 事象と確率（B-1）の L2「場合の数で確率を数える」「包除原理」で参照する。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。
 * 大きな n では値が膨大になるため、桁あふれ（Number.MAX_SAFE_INTEGER 超え）は呼び出し側で扱う前提。
 */

/** 非負整数 n の階乗 n!（0! = 1）。n が負・非整数なら NaN。 */
export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) return Number.NaN;
  let acc = 1;
  for (let k = 2; k <= n; k++) acc *= k;
  return acc;
}

/**
 * 順列 nPr = n!/(n−r)!（区別して並べる場合の数）。
 * 0 ≤ r ≤ n の整数で定義。範囲外は 0、非整数・負は NaN。
 * 階乗の割り算ではなく逐次積で計算し、桁落ちを避ける。
 */
export function permutations(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r)) return Number.NaN;
  if (n < 0 || r < 0) return Number.NaN;
  if (r > n) return 0;
  let acc = 1;
  for (let k = 0; k < r; k++) acc *= n - k;
  return acc;
}

/**
 * 組合せ nCr = n!/(r!(n−r)!)（順序を区別しない選び方）。
 * 対称性 nCr = nC(n−r) を使って小さい側で計算し、各ステップで割って桁あふれを抑える。
 */
export function combinations(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r)) return Number.NaN;
  if (n < 0 || r < 0) return Number.NaN;
  if (r > n) return 0;
  const k = Math.min(r, n - r);
  let acc = 1;
  for (let i = 0; i < k; i++) {
    acc = (acc * (n - i)) / (i + 1);
  }
  return Math.round(acc);
}

/**
 * 2 集合の包除原理 |A∪B| = |A| + |B| − |A∩B|。
 * 確率版 P(A∪B) = P(A)+P(B)−P(A∩B) も同じ式（引数に確率を渡せばよい）。
 */
export function unionTwo(a: number, b: number, ab: number): number {
  return a + b - ab;
}

/**
 * 3 集合の包除原理
 * |A∪B∪C| = |A|+|B|+|C| − |A∩B| − |A∩C| − |B∩C| + |A∩B∩C|。
 * 交わりを足しすぎ／引きすぎを交互に補正するのが包除原理の骨子。
 */
export function unionThree(
  a: number,
  b: number,
  c: number,
  ab: number,
  ac: number,
  bc: number,
  abc: number,
): number {
  return a + b + c - ab - ac - bc + abc;
}
