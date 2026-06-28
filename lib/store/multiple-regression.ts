import { designMatrix, generateCollinearData, olsFit, vif } from "@/lib/stats/multiple-regression";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 多重共線性デモの固定設定。 */
const N = 80;
const B1 = 1;
const B2 = 1;
const NOISE = 1.5;

/** 重回帰ラボの操作値。 */
export type MultiRegControls = {
  /** 2つの説明変数の相関 ρ（大きいほど多重共線性が強い）。 */
  rho: number;
};

/** 重回帰ラボの派生値。 */
export type MultiRegDerived = {
  /** 係数 [切片, β1, β2]。 */
  coefficients: number[];
  /** 係数の標準誤差 [SE切片, SE1, SE2]。 */
  standardErrors: number[];
  /** R²。 */
  rSquared: number;
  /** x1 の VIF=1/(1−ρ²)（標本）。 */
  vif1: number;
};

/**
 * 重回帰分析（F-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（相関 ρ スライダー）は action を呼び、Render 層（係数±SE・VIF・数式）は controls・derived を購読する。
 * 真の係数は β1=β2=1 固定で、ρ を上げると «同じ真値» でも係数推定が不安定（SE 増大）になる様子を見せる。
 * データは固定シードの決定的生成で、ρ にのみ依存して再現可能。
 */
export const useMultiRegStore = createTopicStore<MultiRegControls, MultiRegDerived>({
  initialControls: { rho: 0.3 },
  derive: ({ rho }) => {
    const { x1, x2, y } = generateCollinearData({
      n: N,
      rho,
      b1: B1,
      b2: B2,
      noise: NOISE,
      rng: mulberry32(20240801),
    });
    const fit = olsFit(designMatrix([x1, x2]), y);
    return {
      coefficients: fit.coefficients,
      standardErrors: fit.standardErrors,
      rSquared: fit.rSquared,
      vif1: vif([x1, x2], 0),
    };
  },
});
