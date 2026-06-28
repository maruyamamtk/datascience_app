/**
 * 勾配上昇法で対数尤度を «1 ステップずつ» 登って最尤推定量に到達する過程のフレーム列ビルダー
 * （計算層・純関数）。各ステップで λ が勾配の向きに動き、頂上（MLE）で勾配 0 になる。
 * 副作用なし（Vitest 対象）。描画（GradientAscentStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { exponentialMle, gradientAscentSteps } from "@/lib/stats/estimation";

/** 各ステップのスナップショット。 */
export type AscentPayload = {
  /** ステップ番号。 */
  step: number;
  /** その時点の λ。 */
  lambda: number;
  /** 勾配（スコア）。頂上で 0。 */
  score: number;
  /** 対数尤度。 */
  logLik: number;
  /** 最尤推定量 λ̂（参照線）。 */
  mle: number;
};

/**
 * 勾配上昇法のフレーム列を作る。出発点 start から学習率 lr で iters 回登る。
 * 学習率は安定領域 lr<2/n に取ること（n=標本数）。各フレームで現在地と勾配を提示する。
 */
export function buildAscentFrames(
  samples: readonly number[],
  start: number,
  lr: number,
  iters: number,
): VizFrame<AscentPayload>[] {
  const mle = exponentialMle(samples);
  const steps = gradientAscentSteps(samples, start, lr, iters);
  return steps.map((s, i) => ({
    payload: { step: i, lambda: s.lambda, score: s.score, logLik: s.logLik, mle },
    highlights: [`step-${i}`],
    callout: {
      title: `ステップ ${i}: λ = ${s.lambda.toFixed(3)}`,
      body: `勾配 d/dλ logL = ${s.score.toFixed(2)}。${
        s.score > 0 ? "正なので λ を増やす" : s.score < 0 ? "負なので λ を減らす" : "勾配 0＝頂上"
      }。`,
      note:
        Math.abs(s.score) < 0.1
          ? `勾配がほぼ 0＝対数尤度の頂上。ここが最尤推定量 λ̂=${mle.toFixed(3)}（=1/x̄）。`
          : `勾配の «向き» に λ を動かすと対数尤度が増える。頂上で勾配が 0 になる。`,
      kind: Math.abs(s.score) < 0.1 ? "supplement" : "explain",
    },
  }));
}
