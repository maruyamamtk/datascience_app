/**
 * A/B観測ステッパー(Level1の中核可視化)のフレーム構築(純関数・Vitest対象)。
 * 観測を1件ずつ反映するたびにA/Bそれぞれの事後分布とモンテカルロP(B>A)が更新される過程を、
 * コマ送り(StepPlayer)の1コマずつのcallout付きVizFrameへ変換する。
 */
import type { CalloutContent, VizFrame } from "@/components/viz";
import type { AbSequentialStep } from "@/lib/stats/bayesian-applications";
import { pct } from "./format";

function calloutFor(step: AbSequentialStep): CalloutContent {
  if (step.index === 0) {
    return {
      title: "観測前(事前分布のみ)",
      body: "A・Bとも無情報事前分布Beta(1,1)からスタート。まだデータが無いので、どちらが優れているかは五分五分(P(B>A)=50%)。",
      note: "▶ 再生で観測を1件ずつ追加し、P(B>A)がどう動くか見てみよう。",
      kind: "explain",
    };
  }
  const obs = step.observation;
  const variant = obs?.variant ?? "A";
  const converted = obs?.converted === 1;
  const data = variant === "A" ? step.dataA : step.dataB;
  return {
    title: `${step.index}件目: ${variant}案で${converted ? "コンバージョン" : "コンバージョンなし"}`,
    body: `${variant}案はここまで${data.visitors}件中${data.conversions}件成功(下の曲線が事後分布)。モンテカルロ推定 P(B>A)=${pct(
      step.comparison.probBBeatsA,
      1,
    )}、Aを選んだ場合の期待損失=${step.comparison.expectedLossChooseA.toFixed(4)}。`,
    note:
      step.index <= 4
        ? "観測が少ないうちはP(B>A)が大きく揺れる——不確実性がまだ大きいため。"
        : "観測が増えるほど事後分布が痩せていき、P(B>A)の動きも落ち着いていく。",
    kind: step.index <= 4 ? "explain" : "supplement",
  };
}

/** A/B観測ステッパーのフレーム列(長さ = observations.length + 1)を構築する。 */
export function buildAbObservationFrames(
  steps: readonly AbSequentialStep[],
): VizFrame<AbSequentialStep>[] {
  return steps.map((step) => ({
    highlights: ["stepAA", "stepBA", "stepAB", "stepBB", "stepPHat"],
    callout: calloutFor(step),
    payload: step,
  }));
}
