/**
 * 正規分布の密度（計算層・純関数）。
 * CLT の収束先 N(μ, σ²/n) をヒストグラムに重ねて「標本平均分布が正規に近づく」ことを
 * 視覚化するために使う。副作用なし（Vitest 対象）。
 */

/** 正規分布 N(mu, sigma²) の確率密度 f(x)。sigma<=0 なら 0 を返す。 */
export function normalPdf(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return 0;
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}
