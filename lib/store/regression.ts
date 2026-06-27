import {
  deriveRegression,
  makeSamplePoints,
  type RegressionControls,
  type RegressionDerived,
} from "@/lib/stats/regression";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/**
 * 初期データ点。決定的 PRNG（固定シード）で y=x+1+ノイズ を生成し、初回描画を再現可能にする
 * （描画層の「新しいデータを引く」ボタンは Date.now をシードに渡して引き直す）。
 */
const INITIAL_POINTS = makeSamplePoints({
  a: 1,
  b: 1,
  noise: 1.2,
  n: 9,
  xMin: 1,
  xMax: 9,
  rng: mulberry32(20240626),
});

/**
 * 単回帰（最小二乗法）トピックの Zustand ストア（single source of truth）。
 * Control 層（点ドラッグ・傾き/切片スライダー）は action を呼び、Render 層（散布図 / 残差縦線 / 数式 /
 * RSS・R² 表示）はこのストアの `controls`・`derived` を購読する。派生値は計算層 `deriveRegression` が
 * 再計算する。初期の手動直線（slope/intercept）は OLS 解からずらし、「手動 vs 最小二乗」を見せる。
 *
 * 使い方は docs/design/state-store.md（正規分布・区間推定・仮説検定の各ストアと同型）。
 */
export const useRegressionStore = createTopicStore<RegressionControls, RegressionDerived>({
  initialControls: { points: INITIAL_POINTS, slope: 0.5, intercept: 2 },
  derive: deriveRegression,
});
