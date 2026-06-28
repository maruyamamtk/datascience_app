/**
 * 小さな行列演算（純関数）。重回帰の正規方程式・分散共分散行列で使う最小限の線形代数。
 * 大規模・高精度は目的外（MVP の回帰サイズに十分な範囲）。副作用なし（Vitest 対象）。
 */

/** 行列（行優先）の型。 */
export type Matrix = number[][];

/** 行列の転置 Aᵀ。 */
export function transpose(a: Matrix): Matrix {
  const rows = a.length;
  const cols = a[0]?.length ?? 0;
  const out: Matrix = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) out[j][i] = a[i][j];
  return out;
}

/** 行列積 A·B。 */
export function matMul(a: Matrix, b: Matrix): Matrix {
  const n = a.length;
  const m = b[0]?.length ?? 0;
  const k = b.length;
  const out: Matrix = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let p = 0; p < k; p++) {
      const aip = a[i][p];
      if (aip === 0) continue;
      for (let j = 0; j < m; j++) out[i][j] += aip * b[p][j];
    }
  }
  return out;
}

/** 行列×ベクトル A·x。 */
export function matVec(a: Matrix, x: readonly number[]): number[] {
  return a.map((row) => row.reduce((acc, v, j) => acc + v * x[j], 0));
}

/**
 * ガウス–ジョルダン消去で正方行列の逆行列を求める（部分ピボット選択つき）。
 * 特異（ピボットが極小）なら null を返す。
 */
export function inverse(a: Matrix): Matrix | null {
  const n = a.length;
  // [A | I] を作る。
  const m: Matrix = a.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    // 部分ピボット選択。
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const d = m[col][col];
    for (let j = 0; j < 2 * n; j++) m[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) m[r][j] -= f * m[col][j];
    }
  }
  return m.map((row) => row.slice(n));
}

/** 連立一次方程式 A·x=b を解く（A の逆行列経由）。特異なら null。 */
export function solve(a: Matrix, b: readonly number[]): number[] | null {
  const inv = inverse(a);
  if (!inv) return null;
  return matVec(inv, b as number[]);
}
