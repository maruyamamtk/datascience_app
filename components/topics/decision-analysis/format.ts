/**
 * 決定分析トピック共通の表示フォーマッタ(純関数)。
 * PayoffMatrixLab / RegretMatrixStepper / ExpectedValueLab / DecisionTreeStepper で共有する。
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

export const CRITERION_LABEL: Record<string, string> = {
  maximax: "Maximax(楽観的)",
  maximin: "Maximin(悲観的)",
  hurwicz: "Hurwicz",
  "minimax-regret": "Minimax regret",
  laplace: "Laplace",
};
