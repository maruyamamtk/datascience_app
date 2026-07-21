/**
 * 事後分布更新ステッパー(Level0の中核可視化)のフレーム構築(純関数・Vitest対象)。
 * データを1つずつ観測するたびに事前分布→事後分布が更新されていく過程を、
 * コマ送り(StepPlayer)の1コマずつのcallout付きVizFrameへ変換する。
 */
import type { CalloutContent, VizFrame } from "@/components/viz";
import type { UpdateStep } from "@/lib/stats/bayesian-basics";
import { betaMean } from "@/lib/stats/bayesian-basics";

function calloutFor(step: UpdateStep, priorAlpha: number, priorBeta: number): CalloutContent {
  if (step.index === 0) {
    return {
      title: "観測前(事前分布のみ)",
      body: `事前分布 Beta(${priorAlpha}, ${priorBeta})。平均は${(
        betaMean({ alpha: priorAlpha, beta: priorBeta }) * 100
      ).toFixed(0)}%——まだデータを見ていないので、この曲線はあなたの「事前の信念」そのもの。`,
      note: "▶ 再生でコインを1枚ずつ投げ、結果を見るたびに曲線がどう動くか観察しよう。",
      kind: "explain",
    };
  }
  const face = step.observation === 1 ? "表" : "裏";
  return {
    title: `${step.index}投目: ${face}が出た`,
    body: `これまで${step.index}投中、表${step.successesSoFar}回・裏${step.failuresSoFar}回。事後分布は Beta(${step.posterior.alpha}, ${step.posterior.beta}) に更新され、平均は${(
      betaMean(step.posterior) * 100
    ).toFixed(0)}%になった。`,
    note:
      step.index <= 3
        ? "投げ始めは1回の観測が曲線を大きく動かす——事前分布の情報がまだ相対的に強いため。"
        : "観測が増えるほど、1回あたりの曲線の動きは小さくなっていく(尤度の影響が相対的に強まるため)。",
    kind: step.index <= 3 ? "explain" : "supplement",
  };
}

/** 事後分布更新ステッパーのフレーム列(長さ = observations.length + 1)を構築する。 */
export function buildPosteriorFrames(
  steps: readonly UpdateStep[],
  priorAlpha: number,
  priorBeta: number,
): VizFrame<UpdateStep>[] {
  return steps.map((step) => ({
    highlights: step.index === 0 ? ["alpha0", "beta0"] : ["alpha", "beta", "n", "k"],
    callout: calloutFor(step, priorAlpha, priorBeta),
    payload: step,
  }));
}
