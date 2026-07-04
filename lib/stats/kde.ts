/**
 * カーネル密度推定（H-6）トピックの計算層（純関数）。
 * ガウス・エパネチニコフ等のカーネル関数、KDE の評価、帯域幅の自動選択（Silverman）、ISE 近似を扱う。
 * 「ヒストグラムを滑らかにし、各点に山を置いて足し合わせて密度を推定する」の土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。
 */

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** カーネルの種類。 */
export type KernelKind = "gaussian" | "epanechnikov" | "uniform" | "triangular";

/** 各カーネル関数 K(u)（∫K=1, 平均0）。 */
export function kernel(kind: KernelKind, u: number): number {
  switch (kind) {
    case "gaussian":
      return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
    case "epanechnikov":
      return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0;
    case "uniform":
      return Math.abs(u) <= 1 ? 0.5 : 0;
    case "triangular":
      return Math.abs(u) <= 1 ? 1 - Math.abs(u) : 0;
  }
}

/**
 * カーネル密度推定量 f̂(x) = (1/nh) Σ K((x−xᵢ)/h)。
 * 各データ点に «山（カーネル）» を置き、平均して密度を作る。h は帯域幅。
 */
export function kde(
  x: number,
  data: readonly number[],
  bandwidth: number,
  kind: KernelKind = "gaussian",
): number {
  const n = data.length;
  if (n === 0 || bandwidth <= 0) return 0;
  let s = 0;
  for (const xi of data) s += kernel(kind, (x - xi) / bandwidth);
  return s / (n * bandwidth);
}

/** 標本標準偏差（n−1）。 */
export function sampleSd(data: readonly number[]): number {
  const n = data.length;
  if (n < 2) return 0;
  const m = mean(data);
  return Math.sqrt(data.reduce((a, x) => a + (x - m) ** 2, 0) / (n - 1));
}

/** 四分位範囲 IQR。 */
export function iqr(data: readonly number[]): number {
  if (data.length < 4) return 0;
  const s = [...data].sort((a, b) => a - b);
  const q = (p: number) => {
    const idx = p * (s.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return s[lo] + (s[hi] - s[lo]) * (idx - lo);
  };
  return q(0.75) - q(0.25);
}

/**
 * シルバーマンの経験則による帯域幅 h = 0.9 · min(σ, IQR/1.34) · n^(−1/5)。
 * 正規性を仮定した «良い» 帯域幅の目安。データのばらつきと標本数から自動で決まる。
 */
export function silvermanBandwidth(data: readonly number[]): number {
  const n = data.length;
  if (n < 2) return 1;
  const sd = sampleSd(data);
  const iq = iqr(data);
  const spread = iq > 0 ? Math.min(sd, iq / 1.34) : sd;
  return 0.9 * (spread || 1) * Math.pow(n, -1 / 5);
}

/** 密度曲線を [min,max] の格子で評価した (x, y) 列。 */
export function densityCurve(
  data: readonly number[],
  bandwidth: number,
  kind: KernelKind,
  range: { min: number; max: number; steps: number },
): { x: number; y: number }[] {
  const { min, max, steps } = range;
  return Array.from({ length: steps }, (_, i) => {
    const x = min + ((max - min) * i) / (steps - 1);
    return { x, y: kde(x, data, bandwidth, kind) };
  });
}

/**
 * 真の密度（既知）と KDE の積分二乗誤差 ISE ≈ Σ (f̂−f)² Δx。帯域幅の «良さ» の目安。
 * bandwidth が小さすぎるとギザギザ（過小平滑）、大きすぎると潰れる（過大平滑）で ISE が増える。
 */
export function integratedSquaredError(
  data: readonly number[],
  bandwidth: number,
  kind: KernelKind,
  trueDensity: (x: number) => number,
  range: { min: number; max: number; steps: number },
): number {
  const { min, max, steps } = range;
  const dx = (max - min) / (steps - 1);
  let s = 0;
  for (let i = 0; i < steps; i++) {
    const x = min + dx * i;
    const diff = kde(x, data, bandwidth, kind) - trueDensity(x);
    s += diff * diff * dx;
  }
  return s;
}
