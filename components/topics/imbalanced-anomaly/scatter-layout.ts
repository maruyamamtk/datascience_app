/**
 * 不均衡データ・異常検知トピックの散布図で共有する座標・配色ヘルパー（純関数）。
 * SmoteLab / CostSensitiveLab / AnomalyLab の3コンポーネントが同じ [0,1]² → SVG座標変換と
 * ヒートマップ配色を必要とするため、grid-layout.ts（reinforcement-learning, #78のレビューで
 * 「完全に同一の描画ロジックが2箇所以上で必要になった場合は共有ヘルパーに切り出す」という
 * 判断基準を採用）と同じ方針で共有モジュールへ切り出す。
 */

export const round2 = (v: number): number => Math.round(v * 100) / 100;

export const SCATTER_W = 300;
export const SCATTER_H = 300;
const PAD = 22;
const SCALE = SCATTER_W - 2 * PAD;

/** データ座標 x1∈[0,1] → SVG x座標。 */
export const px = (x1: number): number => round2(PAD + x1 * SCALE);
/** データ座標 x2∈[0,1] → SVG y座標（上下反転: x2が大きいほど上）。 */
export const py = (x2: number): number => round2(PAD + (1 - x2) * SCALE);

export const SCATTER_PAD = PAD;
export const SCATTER_SCALE = SCALE;

/**
 * 0〜1の異常/困難度スコアを白→オレンジ→濃い赤のヒートマップ色に変換する
 * （量子化してから配色するため hydration mismatch の心配がない, tasks/lessons.md #67）。
 */
export function scoreToHeatColor(normalized: number): string {
  const t = Math.max(0, Math.min(1, normalized));
  const bucket = Math.round(t * 20) / 20; // 0.05刻みに量子化
  // 白 (#ffffff) → アンバー (#fbbf24) → 濃い赤 (#7f1d1d) の2区間補間。
  const lerp = (a: number, b: number, u: number) => Math.round(a + (b - a) * u);
  if (bucket <= 0.5) {
    const u = bucket / 0.5;
    return `rgb(${lerp(255, 251, u)},${lerp(255, 191, u)},${lerp(255, 36, u)})`;
  }
  const u = (bucket - 0.5) / 0.5;
  return `rgb(${lerp(251, 127, u)},${lerp(191, 29, u)},${lerp(36, 29, u)})`;
}

/** スコア配列を [0,1] に正規化する（min-max、全て同値なら0.5固定）。 */
export function normalizeScores(scores: readonly number[]): number[] {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 1e-9) return scores.map(() => 0.5);
  return scores.map((s) => (s - min) / (max - min));
}
