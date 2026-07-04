import {
  ate,
  confoundingBias,
  covariateBalance,
  generateUnits,
  naiveDifference,
  stratifiedAte,
  type Unit,
} from "@/lib/stats/causal";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 個体数は固定。 */
export const N = 600;

/** 因果推論ラボの操作値。 */
export type CausalControls = {
  /** 真の処置効果 τ（＝真の ATE）。 */
  tau: number;
  /** 交絡の強さ：交絡変数 x が結果に与える影響。 */
  confounderEffect: number;
  /** 割り当ての偏り：x が処置の受けやすさに与える影響（非無作為時）。 */
  selection: number;
  /** 無作為割り当てにするか（true で交絡が切れる）。 */
  randomized: boolean;
};

/** 因果推論ラボの派生値。 */
export type CausalDerived = {
  units: Unit[];
  /** 真の ATE（＝τ）。 */
  trueAte: number;
  /** 素朴比較 E[Y|T=1]−E[Y|T=0]。 */
  naive: number;
  /** 交絡バイアス（素朴−真）。 */
  bias: number;
  /** 層別調整した ATE 推定。 */
  adjusted: number;
  /** 共変量バランス（処置群・対照群の x 平均）。 */
  balance: { treatedX: number; controlX: number };
};

/**
 * 因果推論の枠組み（N-1）トピックの Zustand ストア（single source of truth）。
 * Control 層（真の効果・交絡・割り当ての偏り・無作為化トグル）は action を呼び、Render 層（素朴比較 vs
 * 真の ATE vs 層別調整のバー・共変量バランス・バイアス・数式）は controls・derived を購読する。
 * 非無作為＋交絡ありで素朴比較が真値からズレ、無作為化または層別調整で一致する «相関≠因果» を体感する。
 * frame は潜在的結果のステッパーが使う。
 */
export const useCausalStore = createTopicStore<CausalControls, CausalDerived>({
  initialControls: { tau: 2, confounderEffect: 6, selection: 0.8, randomized: false },
  derive: ({ tau, confounderEffect, selection, randomized }) => {
    const units = generateUnits({
      n: N,
      tau,
      confounderEffect,
      selection,
      randomized,
      rng: mulberry32(20250062),
    });
    return {
      units,
      trueAte: ate(units),
      naive: naiveDifference(units),
      bias: confoundingBias(units),
      adjusted: stratifiedAte(units),
      balance: covariateBalance(units),
    };
  },
});
