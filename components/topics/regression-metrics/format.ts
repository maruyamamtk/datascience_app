/**
 * 回帰の評価指標トピック共通の表示フォーマッタ(純関数)。
 * MetricsLab / MetricsStepper で共有し、来店者数の丸め・単位表示ロジックを1箇所に集約する
 * (metrics-and-kpi.mdx の format.ts と同じ役割分担)。
 */
export function people(v: number): string {
  return `${Math.round(v * 10) / 10}人`;
}
