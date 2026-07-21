/**
 * モデル選択基準トピック共通の表示フォーマッタ(純関数)。
 * CriteriaLab / CriteriaStepper / PenaltyLab / CvLab で共有する
 * (multiclass-metrics/format.ts と同じ役割分担)。
 */

/** 有限でない値は"—"にする小数表示。 */
export function num(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

/** SVG座標を2桁に丸める(hydration mismatch回避, tasks/lessons.md #67の教訓)。 */
export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
