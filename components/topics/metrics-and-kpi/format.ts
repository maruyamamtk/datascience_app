/**
 * 評価指標とKPI設計トピック共通の表示フォーマッタ（純関数）。
 * BusinessImpactLab / KpiDecompositionStepper / kpi-decomposition-frames.ts で共有し、
 * 円表示のロジック（丸め・桁区切り）を1箇所に集約する。
 */
export function yen(v: number): string {
  return `${Math.round(v).toLocaleString("ja-JP")}円`;
}
