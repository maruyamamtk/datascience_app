/**
 * ベイズ統計の基礎トピック共通の表示フォーマッタ(純関数)。
 * PosteriorUpdateLab / PriorSensitivityLab / BayesFactorLab / BayesianDiscriminantLab で共有する
 * (model-selection-criteria/format.ts と同じ役割分担)。
 */

/** 有限でない値は"—"にする小数表示。 */
export function num(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

/** 0〜1の確率を%表示にする。 */
export function pct(v: number, digits = 1): string {
  if (!Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

/** SVG座標を2桁に丸める(hydration mismatch回避, tasks/lessons.md #67の教訓)。 */
export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** ベイズファクターの強さラベル(日本語表示用)。 */
export const BF_STRENGTH_LABEL: Record<string, string> = {
  anecdotal: "ほぼ決定打なし",
  moderate: "中程度の証拠",
  strong: "強い証拠",
  "very-strong": "非常に強い証拠",
  extreme: "極めて強い証拠",
};

/**
 * 周辺尤度(エビデンス)のようなごく小さい正の値をKaTeXの数式断片として表示する。
 * n(試行数)が大きいと通常の固定小数表示(formatNumber)では"0.0000"に潰れて
 * まるで証拠が0であるかのように誤読させてしまう(BF10自体は対数空間で計算しており正確)ため、
 * 閾値未満は指数表記(例: 3.2\times10^{-7})に切り替える。
 */
export function formatEvidenceTex(v: number, digits = 4): string {
  if (!Number.isFinite(v)) return "\\text{—}";
  if (v === 0) return "0";
  const threshold = 5 * 10 ** -(digits + 1);
  if (Math.abs(v) >= threshold) return num(v, digits);
  const exponent = Math.floor(Math.log10(Math.abs(v)));
  const mantissa = v / 10 ** exponent;
  return `${num(mantissa, 2)}\\times10^{${exponent}}`;
}
