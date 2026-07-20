/**
 * 二値分類の評価指標トピック共通の表示フォーマッタ(純関数)。
 * ScoreLab / RocStepper で共有する(regression-metrics/format.ts と同じ役割分担)。
 */

/** null許容の比率を%表示にする(未定義の指標は"—"で表す)。 */
export function pct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

/** 0〜1の値を小数表示(未定義は"—")。 */
export function ratio(v: number | null | undefined, digits = 3): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

/** SVG座標を2桁に丸める(hydration mismatch回避, tasks/lessons.md #67の教訓)。 */
export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
