/**
 * KPI分解ステッパー（Level2）の純粋なフレームビルダー。
 * 売上 = トラフィック × 転換率 × 客単価 という乗法分解を1要素ずつ辿り、それぞれを
 * +10% 改善したときの売上インパクトを見せる（付録A.2「KPIの分解」）。
 * どの要素でも相対%インパクトが売上に対して対称であることを示すのがねらい。
 */
import type { VizFrame } from "@/components/viz";
import { decomposeRevenue, factorSensitivity, type FactorKey, type RevenueFactors } from "@/lib/stats/metrics-and-kpi";
import { yen } from "./format";

export const DEMO_FACTORS: RevenueFactors = { traffic: 50000, conversionRate: 0.02, aov: 8000 };
export const DEMO_DELTA_PCT = 10;

export type KpiDecompositionPayload = {
  step: "overview" | FactorKey;
  factors: RevenueFactors;
  baseRevenue: number;
  factor?: FactorKey;
  before?: number;
  after?: number;
  revenueAfter?: number;
  revenueDeltaPct?: number;
};

const FACTOR_LABEL: Record<FactorKey, string> = {
  traffic: "トラフィック（訪問数）",
  conversionRate: "転換率（購入に至る割合）",
  aov: "客単価（1件あたりの購入額）",
};

/**
 * フレーム0: 全体像（売上=トラフィック×転換率×客単価）。
 * フレーム1〜3: 各要素を+10%したときの売上インパクトを1つずつ見せる。
 */
export function buildKpiDecompositionFrames(
  factors: RevenueFactors = DEMO_FACTORS,
  deltaPct: number = DEMO_DELTA_PCT,
): VizFrame<KpiDecompositionPayload>[] {
  const baseRevenue = decomposeRevenue(factors);
  const overview: VizFrame<KpiDecompositionPayload> = {
    highlights: ["revenue", "traffic", "conversionRate", "aov"],
    callout: {
      title: "売上を3つの要素に分解する",
      body: "売上は «トラフィック × 転換率 × 客単価» という掛け算に分解できる。それぞれの要素は施策で個別に動かせるので、どこに注力すべきかを考える出発点になる。",
      kind: "explain",
    },
    payload: { step: "overview", factors, baseRevenue },
  };

  const factorFrames: VizFrame<KpiDecompositionPayload>[] = (["traffic", "conversionRate", "aov"] as const).map((factor) => {
    const s = factorSensitivity(factors, factor, deltaPct);
    return {
      highlights: ["revenue", factor],
      callout: {
        title: `${FACTOR_LABEL[factor]} を+${deltaPct}%改善すると`,
        body: `売上は ${yen(baseRevenue)} → ${yen(s.revenueAfter)}（${s.revenueDeltaPct >= 0 ? "+" : ""}${s.revenueDeltaPct.toFixed(1)}%）に動く。`,
        note: "乗法分解では、どの要素を+10%改善しても売上への相対インパクトは同じ+10%——«どこが伸ばしやすいか»という実現可能性の違いが、実務での優先順位を決める。",
        kind: "supplement",
      },
      payload: {
        step: factor,
        factors,
        baseRevenue,
        factor,
        before: s.before,
        after: s.after,
        revenueAfter: s.revenueAfter,
        revenueDeltaPct: s.revenueDeltaPct,
      },
    };
  });

  return [overview, ...factorFrames];
}
