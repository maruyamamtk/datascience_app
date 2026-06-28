/**
 * 標本調査の «分散低減» をコマ送りで見せるフレーム列ビルダー（計算層・純関数）。
 * 単純無作為抽出 → 層化（比例配分）→ 層化（ネイマン配分）と、標準誤差が下がる過程を段階提示する。
 * 副作用なし（Vitest 対象）。描画（VarianceReductionStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import {
  neymanAllocation,
  proportionalAllocation,
  srsVariance,
  stratifiedVariance,
  type Stratum,
} from "@/lib/stats/sampling-survey";

/** 各フレーム（ある抽出法）のスナップショット。 */
export type ReductionPayload = {
  method: "srs" | "proportional" | "neyman";
  label: string;
  /** 標準誤差。 */
  se: number;
};

const sqrt = (v: number) => Math.sqrt(Math.max(0, v));

/** 3つの抽出法（SRS→比例→ネイマン）の標準誤差を段階提示するフレーム列を作る。 */
export function buildReductionFrames(
  strata: readonly Stratum[],
  n: number,
): VizFrame<ReductionPayload>[] {
  const seSrs = sqrt(srsVariance(strata, n));
  const seProp = sqrt(stratifiedVariance(strata, proportionalAllocation(strata, n)));
  const seNeyman = sqrt(stratifiedVariance(strata, neymanAllocation(strata, n)));

  return [
    {
      payload: { method: "srs", label: "① 単純無作為抽出（SRS）", se: seSrs },
      highlights: ["srs"],
      callout: {
        title: `① 単純無作為抽出：SE=${seSrs.toFixed(3)}`,
        body: "母集団全体から無作為に n 個。層を区別しないので «層間の差» もばらつきに含まれ、SE が大きい。",
        note: "母分散 = 層内 + 層間。SRS はこの全部を背負う。",
        kind: "explain",
      },
    },
    {
      payload: { method: "proportional", label: "② 層化・比例配分", se: seProp },
      highlights: ["proportional"],
      callout: {
        title: `② 層化（比例配分）：SE=${seProp.toFixed(3)}`,
        body: "層ごとにサイズ比 N_h/N で配分して抽出。各層内だけのばらつきになり «層間» が消えて SE が下がる。",
        note: `SRS=${seSrs.toFixed(3)} → ${seProp.toFixed(3)}。層が «均質» なほど効果大。`,
        kind: "explain",
      },
    },
    {
      payload: { method: "neyman", label: "③ 層化・ネイマン配分", se: seNeyman },
      highlights: ["neyman"],
      callout: {
        title: `③ 層化（ネイマン配分）：SE=${seNeyman.toFixed(3)}`,
        body: "n_h ∝ N_h σ_h。ばらつきの大きい層に多く配分し、与えられた n で SE を最小化する最適配分。",
        note: `比例=${seProp.toFixed(3)} → ${seNeyman.toFixed(3)}。同じ標本数でも «配り方» で精度が変わる。`,
        kind: "supplement",
      },
    },
  ];
}
