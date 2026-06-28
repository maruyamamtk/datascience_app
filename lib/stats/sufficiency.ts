/**
 * 統計量と十分性（D-1）トピックの計算層（純関数）。
 * 十分統計量（ベルヌーイの成功数）・尤度のネイマン分解・順序統計量を純関数で扱う。
 * 「データの要約（統計量）がどこまで情報を保つか」を体感する土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。
 */

/** ベルヌーイ列の十分統計量＝成功数 T=Σxᵢ。順序に依らない（並べ替え不変）。 */
export function bernoulliSuccesses(bits: readonly number[]): number {
  return bits.reduce((a, b) => a + (b ? 1 : 0), 0);
}

/**
 * ベルヌーイ模型の対数尤度 log L(p)=T·log p + (n−T)·log(1−p)。
 * データには «成功数 T と n» を通してしか依存しない（＝T が十分統計量, ネイマンの分解）。
 * p∈{0,1} の端は -∞ を避けて有限のクランプ値を返す。
 */
export function bernoulliLogLikelihood(p: number, successes: number, n: number): number {
  const eps = 1e-12;
  const pc = Math.max(eps, Math.min(1 - eps, p));
  return successes * Math.log(pc) + (n - successes) * Math.log(1 - pc);
}

/** ベルヌーイの最尤推定量 p̂=T/n（n=0 は NaN）。尤度を最大化する p。 */
export function bernoulliMle(successes: number, n: number): number {
  if (n <= 0) return Number.NaN;
  return successes / n;
}

/** 尤度曲線（p を 0..1 で刻んだ {p, logLik, lik} 列）。lik は最大値で正規化して描画しやすくする。 */
export function likelihoodCurve(
  successes: number,
  n: number,
  samples = 100,
): { p: number; logLik: number; lik: number }[] {
  const raw: { p: number; logLik: number }[] = [];
  let maxLog = -Infinity;
  for (let i = 0; i <= samples; i++) {
    const p = i / samples;
    const logLik = bernoulliLogLikelihood(p, successes, n);
    raw.push({ p, logLik });
    if (logLik > maxLog) maxLog = logLik;
  }
  return raw.map((r) => ({ ...r, lik: Math.exp(r.logLik - maxLog) }));
}

/** 順序統計量＝標本を昇順に並べたもの x₍₁₎≤…≤x₍ₙ₎。元配列は変更しない。 */
export function orderStatistics(samples: readonly number[]): number[] {
  return [...samples].sort((a, b) => a - b);
}

/** k 番目の順序統計量 x₍ₖ₎（1 始まり）。範囲外は NaN。最小は k=1、最大は k=n。 */
export function orderStatistic(samples: readonly number[], k: number): number {
  if (k < 1 || k > samples.length) return Number.NaN;
  return orderStatistics(samples)[k - 1];
}

/** 標本中央値（順序統計量から、偶数個は中央2つの平均）。 */
export function sampleMedian(samples: readonly number[]): number {
  const s = orderStatistics(samples);
  const n = s.length;
  if (n === 0) return Number.NaN;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
