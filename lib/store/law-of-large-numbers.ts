import { getDistribution, type DistKind } from "@/lib/stats/distributions";
import { createTopicStore } from "./topicStore";

/** 大数の法則ラボの操作値。 */
export type LlnControls = {
  /** 元分布（一様/指数/二項、いずれも母平均 μ=5）。 */
  distKind: DistKind;
  /** 累積平均を見せるために «開示する» 標本数 n。 */
  revealed: number;
};

/** 大数の法則ラボの派生値。 */
export type LlnDerived = {
  /** 母平均 μ（収束先）。 */
  mu: number;
  /** 母標準偏差 σ。 */
  sigma: number;
  /** 標本平均の標準誤差 σ/√n（n=revealed）。 */
  se: number;
};

/**
 * 大数の法則と正規近似（B-5）トピックの Zustand ストア（single source of truth）。
 * Control 層（元分布・開示数 n のスライダー）は action を呼び、Render 層（累積平均の折れ線 / μ±SE 帯 /
 * 数式）は controls・derived を購読する。frame は二項→正規近似ステッパー（de Moivre–Laplace）が使う。
 */
export const useLlnStore = createTopicStore<LlnControls, LlnDerived>({
  initialControls: { distKind: "exponential", revealed: 30 },
  derive: ({ distKind, revealed }) => {
    const d = getDistribution(distKind);
    const n = Math.max(1, revealed);
    return { mu: d.mean, sigma: d.sd, se: d.sd / Math.sqrt(n) };
  },
});
