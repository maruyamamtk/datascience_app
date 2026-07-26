/**
 * 逐次決定トピック共通の表示フォーマッタ(純関数)。
 * PolicyLab / BackwardInductionStepper / MdpLab / frames.ts で共有する。
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

/** 行動ごとの色(格子・棒グラフのハイライトで使い回す)。decision-analysisの配色と揃える。 */
export const ACTION_COLORS = ["#94a3b8", "#f59e0b", "#2563eb"];

export const COLOR_DONE = "#2563eb";
export const COLOR_CURRENT = "#f59e0b";
export const COLOR_CHOSEN = "#16a34a";
