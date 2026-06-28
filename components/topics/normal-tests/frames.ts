/**
 * 2標本 t 検定の «手順» を 1 ステップずつ組み立てるコマ送りのフレーム列ビルダー（計算層・純関数）。
 * 平均差 → プール標準偏差 → 標準誤差 → t 統計量 → p 値 と段階的に提示する。
 * 副作用なし（Vitest 対象）。描画（TtestStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { tTestPValue, twoSampleT } from "@/lib/stats/normal-tests";

/** 各ステップのスナップショット。 */
export type TtestStepPayload = {
  /** ステップ識別子。 */
  step: "diff" | "pooled" | "se" | "t" | "p";
  /** ステップ見出し。 */
  label: string;
  /** その時点で確定した主要数値。 */
  value: number;
};

const f = (x: number) => x.toFixed(3);

/** 2標本 t 検定の手順フレーム列（平均差→プールSD→SE→t→p）を作る。 */
export function buildTtestFrames(params: {
  meanDiff: number;
  sd: number;
  n: number;
}): VizFrame<TtestStepPayload>[] {
  const { meanDiff, sd, n } = params;
  const { t, df, pooledSd, se } = twoSampleT({
    mean1: meanDiff,
    mean2: 0,
    s1: sd,
    s2: sd,
    n1: n,
    n2: n,
  });
  const p = tTestPValue(t, df);

  const defs: {
    step: TtestStepPayload["step"];
    label: string;
    value: number;
    body: string;
    note: string;
  }[] = [
    {
      step: "diff",
      label: "① 平均差 Δ = x̄₁ − x̄₂",
      value: meanDiff,
      body: `2群の平均差 Δ = ${f(meanDiff)}。これが «効果» の大きさ。`,
      note: "差そのものでは «偶然か» 判断できない。ばらつきと標本数で割る必要がある。",
    },
    {
      step: "pooled",
      label: "② プール標準偏差 sₚ",
      value: pooledSd,
      body: `等分散を仮定し2群の分散をまとめる sₚ = ${f(pooledSd)}。`,
      note: "2群の «共通のばらつき» を推定。自由度 df = 2n−2 = " + df + "。",
    },
    {
      step: "se",
      label: "③ 標準誤差 SE = sₚ√(1/n₁+1/n₂)",
      value: se,
      body: `平均差の標準誤差 SE = ${f(se)}。n が大きいほど SE は小さい。`,
      note: "«平均差がどれだけぶれるか» の尺度。これで Δ を割る。",
    },
    {
      step: "t",
      label: "④ t 統計量 = Δ / SE",
      value: t,
      body: `t = Δ/SE = ${f(meanDiff)}/${f(se)} = ${f(t)}。«効果がSEの何個分離れたか»。`,
      note: "自由度 " + df + " の t 分布と比べる。|t| が大きいほど偶然とは考えにくい。",
    },
    {
      step: "p",
      label: "⑤ p 値 = 2·P(T≥|t|)",
      value: p,
      body: `両側 p 値 = ${f(p)}。H0（差なし）でこれ以上の差が出る確率。`,
      note:
        p < 0.05
          ? `p<0.05 なので有意水準5%で «差あり» と判断。`
          : `p≥0.05 なので «差があるとは言えない»（有意でない）。`,
    },
  ];

  return defs.map((d) => ({
    payload: { step: d.step, label: d.label, value: d.value },
    highlights: [`step-${d.step}`],
    callout: {
      title: d.label,
      body: d.body,
      note: d.note,
      kind: d.step === "p" ? "supplement" : "explain",
    },
  }));
}
