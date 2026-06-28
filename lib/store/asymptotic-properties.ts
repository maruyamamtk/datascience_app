import { exponentialFisherInfo, mleAsymptoticVariance } from "@/lib/stats/asymptotics";
import { createTopicStore } from "./topicStore";

/** 漸近的性質ラボの真の率 λ（固定）。 */
export const TRUE_LAMBDA = 1.5;

/** 漸近的性質ラボの操作値。 */
export type AsymptoticControls = {
  /** 各標本のサイズ n。 */
  n: number;
};

/** 漸近的性質ラボの派生値。 */
export type AsymptoticDerived = {
  /** 真の率 λ。 */
  trueLambda: number;
  /** フィッシャー情報量 I(λ)=1/λ²。 */
  fisherInfo: number;
  /** 漸近分散 λ²/n。 */
  asymptoticVar: number;
  /** 漸近標準偏差 √(λ²/n)。 */
  asymptoticSd: number;
};

/**
 * 推定量の漸近的性質（D-4）トピックの Zustand ストア（single source of truth）。
 * Control 層（n スライダー）は action を呼び、Render 層（MLE の標本分布・漸近正規の数式）は controls・
 * derived を購読する。frame は «n を増やすと MLE が正規へ» のステッパーが使う。
 */
export const useAsymptoticStore = createTopicStore<AsymptoticControls, AsymptoticDerived>({
  initialControls: { n: 10 },
  derive: ({ n }) => {
    const asymptoticVar = mleAsymptoticVariance(TRUE_LAMBDA, n);
    return {
      trueLambda: TRUE_LAMBDA,
      fisherInfo: exponentialFisherInfo(TRUE_LAMBDA),
      asymptoticVar,
      asymptoticSd: Math.sqrt(asymptoticVar),
    };
  },
});
