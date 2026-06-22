/**
 * ヒストグラムのビニング（計算層・純関数）。
 * 標本平均の蓄積列 → 等幅ビンの度数列に変換する。描画層（SVG バー）はこの結果を購読するだけ
 * （CLAUDE.md §2「計算層は純関数、描画と疎結合」）。
 */

/** ヒストグラムの 1 ビン。 */
export type Bin = {
  /** ビンの下端（含む）。 */
  x0: number;
  /** ビンの上端（最終ビンのみ含む / それ以外は含まない）。 */
  x1: number;
  /** このビンに入った件数。 */
  count: number;
};

export type HistogramOptions = {
  /** 軸の下端。 */
  min: number;
  /** 軸の上端。 */
  max: number;
  /** ビン数（>=1）。 */
  bins: number;
};

/**
 * 値列を [min,max] の等幅 `bins` 個のビンに割り当てる。
 * min/max の外側の値は両端のビンへクランプする（軸外でも欠損させない）。
 * 空入力でも bins 個の count=0 ビンを返す（描画側の軸が安定する）。
 */
export function histogram(values: readonly number[], options: HistogramOptions): Bin[] {
  const bins = Math.max(1, Math.floor(options.bins));
  const { min, max } = options;
  const width = (max - min) / bins;

  const result: Bin[] = Array.from({ length: bins }, (_, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count: 0,
  }));

  if (width <= 0) return result;

  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    result[idx].count += 1;
  }
  return result;
}

/** ビン列の最大度数（描画のスケール基準）。空・全 0 でも 0 以上を返す。 */
export function maxCount(bins: readonly Bin[]): number {
  return bins.reduce((m, b) => Math.max(m, b.count), 0);
}
