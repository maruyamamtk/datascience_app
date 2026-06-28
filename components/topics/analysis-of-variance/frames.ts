/**
 * 分散分析の «全変動 = 級間変動 + 級内変動» 分解をコマ送りで見せるフレーム列ビルダー（計算層・純関数）。
 * 全変動（総平均からのずれ）→ 級内（群平均からのずれ）→ 級間（群平均の総平均からのずれ）→ F比 と段階提示する。
 * 副作用なし（Vitest 対象）。描画（VarianceDecompStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import type { AnovaResult } from "@/lib/stats/anova";

/** 分解ステップの種類。 */
export type DecompStage = "total" | "within" | "between" | "ratio";

/** 各フレームのスナップショット。 */
export type DecompPayload = {
  stage: DecompStage;
  /** 強調する量（SS か F）。 */
  value: number;
};

/** 分散分析結果から4ステップ（全変動→級内→級間→F比）のフレーム列を作る。 */
export function buildDecompFrames(anova: AnovaResult): VizFrame<DecompPayload>[] {
  const { ssTotal, ssWithin, ssBetween, msBetween, msWithin, F, dfBetween, dfWithin } = anova;
  return [
    {
      payload: { stage: "total", value: ssTotal },
      highlights: ["total"],
      callout: {
        title: `① 全変動 SS_total = ${ssTotal.toFixed(1)}`,
        body: "すべての値の «総平均からのずれ²» の総和。データ全体の散らばり。",
        note: "これを «群間の差» と «群内のばらつき» の2つに分けるのが分散分析。",
        kind: "explain",
      },
    },
    {
      payload: { stage: "within", value: ssWithin },
      highlights: ["within"],
      callout: {
        title: `② 級内変動 SS_within = ${ssWithin.toFixed(1)}`,
        body: "各値の «自分の群平均からのずれ²» の総和。群の中の «偶然のばらつき»（誤差）。",
        note: `自由度 ${dfWithin}。平均平方 MS_within=${msWithin.toFixed(2)}（誤差分散の推定）。`,
        kind: "explain",
      },
    },
    {
      payload: { stage: "between", value: ssBetween },
      highlights: ["between"],
      callout: {
        title: `③ 級間変動 SS_between = ${ssBetween.toFixed(1)}`,
        body: "各群平均の «総平均からのずれ²» を群サイズ倍した総和。群の «位置の違い»。",
        note: `自由度 ${dfBetween}。平均平方 MS_between=${msBetween.toFixed(2)}。SS_total=SS_within+SS_between が成り立つ。`,
        kind: "explain",
      },
    },
    {
      payload: { stage: "ratio", value: F },
      highlights: ["ratio"],
      callout: {
        title: `④ F = MS_between / MS_within = ${F.toFixed(2)}`,
        body: "«群間の差» を «群内のばらつき» で割った比。群の差が誤差に比べて大きいほど F は大きい。",
        note: "帰無仮説（全群が同じ平均）なら F は1付近。大きければ «どれかの群は違う»。F 分布で p 値を出す。",
        kind: "supplement",
      },
    },
  ];
}
