/**
 * 3 つの検定（ワルド型・スコア・尤度比）の «対数尤度曲線上での幾何» を 1 つずつ見せるコマ送りの
 * フレーム列ビルダー（計算層・純関数）。正規モデルでは3つとも z² に一致するが、«測り方» が異なる。
 * 副作用なし（Vitest 対象）。描画（ThreeTestsStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { threeTestStatistics } from "@/lib/stats/test-derivation";

/** 各フレーム（ある検定）のスナップショット。 */
export type ThreeTestPayload = {
  /** 検定の種類。 */
  kind: "wald" | "score" | "lrt";
  /** 表示名。 */
  label: string;
  /** 統計量の値（正規では3つとも z²）。 */
  value: number;
  /** 観測の標準化 z=(x̄−μ0)/se。 */
  z: number;
};

/**
 * 観測（xbar, mu0, sigma, n）から3検定の幾何を1つずつ提示するフレーム列を作る。
 * - Wald: MLE x̄ から μ0 までの «水平距離»（推定値の離れ）。
 * - Score: μ0 での対数尤度の «傾き»（勾配の急さ）。
 * - 尤度比(LRT): MLE と μ0 の対数尤度の «高さの差» −2logΛ。
 */
export function buildThreeTestFrames(params: {
  xbar: number;
  mu0: number;
  sigma: number;
  n: number;
}): VizFrame<ThreeTestPayload>[] {
  const s = threeTestStatistics(params);
  const defs: { kind: ThreeTestPayload["kind"]; label: string; value: number; note: string }[] = [
    {
      kind: "wald",
      label: "ワルド型検定",
      value: s.wald,
      note: "MLE x̄ が μ0 から «どれだけ離れたか»（水平距離）を曲率で測る。推定値ベース。",
    },
    {
      kind: "score",
      label: "スコア検定",
      value: s.score,
      note: "μ0 での対数尤度の «傾き»（スコア）の大きさで測る。H0 だけで計算でき MLE 不要。",
    },
    {
      kind: "lrt",
      label: "尤度比検定（LRT）",
      value: s.lrt,
      note: "MLE と μ0 の対数尤度の «高さの差» −2logΛ で測る。ネイマン・ピアソンの最強力検定の一般化。",
    },
  ];
  return defs.map((d) => ({
    payload: { kind: d.kind, label: d.label, value: d.value, z: s.z },
    highlights: [`test-${d.kind}`],
    callout: {
      title: `${d.label}：統計量 = ${d.value.toFixed(2)}`,
      body: d.note,
      note: "正規モデル（σ既知）では3つとも厳密に z²＝同じ値。一般の分布では漸近的に等価だが有限標本で異なる。",
      kind: d.kind === "lrt" ? "supplement" : "explain",
    },
  }));
}
