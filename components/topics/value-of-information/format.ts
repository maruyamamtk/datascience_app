/**
 * 情報の価値トピック共通の表示フォーマッタ(純関数)。
 * EvpiStepper / EvpiLab / PriorPosteriorLab で共有する。
 */

/** 有限でない値は"—"にする小数表示(既定は整数)。 */
export function num(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

/** 0〜1の確率を%表示にする。 */
export function pct(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

/** SVG座標を2桁に丸める(hydration mismatch回避, tasks/lessons.md #67の教訓)。 */
export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
