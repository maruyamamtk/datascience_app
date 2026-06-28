/**
 * 「指数分布を k 個足すとガンマ分布になる」を形状 k=1,2,3,… と増やして見せるコマ送りのフレーム列
 * ビルダー（計算層・純関数）。Gamma(k,θ) は独立な Exp(1/θ) を k 個足した分布。
 * 副作用なし（Vitest 対象）。描画（GammaBuildStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { CONTINUOUS_SPECS, gammaPdf } from "@/lib/stats/continuous";

/** 各フレーム（形状 k での Gamma 曲線）のスナップショット。 */
export type GammaBuildPayload = {
  /** 形状パラメータ k（=足し合わせた指数の個数）。 */
  k: number;
  /** 尺度 θ。 */
  theta: number;
  /** Gamma(k,θ) の曲線点列。 */
  curve: { x: number; y: number }[];
  /** 平均 kθ。 */
  mean: number;
};

/**
 * θ を固定し、形状 k を 1,2,…,maxK と増やしながら Gamma(k,θ) の曲線を作るフレーム列。
 * k=1 は指数分布（右肩下がり）、k を増やすと «山» ができて左右対称に近づく（CLT の芽）。
 */
export function buildGammaFrames(
  theta: number,
  maxK: number,
  samples = 120,
): VizFrame<GammaBuildPayload>[] {
  const frames: VizFrame<GammaBuildPayload>[] = [];
  for (let k = 1; k <= maxK; k++) {
    const hi = Math.max(8, k * theta + 4 * Math.sqrt(k) * theta);
    const curve: { x: number; y: number }[] = [];
    for (let i = 0; i <= samples; i++) {
      const x = (i / samples) * hi;
      const y = gammaPdf(x, k, theta);
      curve.push({ x, y: Number.isFinite(y) ? y : 0 });
    }
    const mean = CONTINUOUS_SPECS.gamma.mean({ lambda: 1, k, theta, mu: 0, sigma: 1 });
    frames.push({
      payload: { k, theta, curve, mean },
      highlights: [`k-${k}`],
      callout: {
        title: `k = ${k}：指数分布を ${k} 個足す`,
        body:
          k === 1
            ? `k=1 は指数分布そのもの（右肩下がり、x=0 で最大）。平均 ${mean.toFixed(1)}。`
            : `独立な指数分布を ${k} 個足した和が Gamma(${k}, θ)。山ができ、k が増えるほど左右対称に近づく。平均 ${mean.toFixed(
                1,
              )}。`,
        note:
          k >= maxK
            ? `指数（歪んだ分布）の和でも、個数を増やすと釣鐘型へ——中心極限定理の芽。`
            : `平均は kθ で k に比例して右へ動く。`,
        kind: k >= maxK ? "supplement" : "explain",
      },
    });
  }
  return frames;
}
