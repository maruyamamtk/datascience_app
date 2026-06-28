import { tTestPValue, twoSampleT } from "@/lib/stats/normal-tests";
import { createTopicStore } from "./topicStore";

/** 2標本 t 検定ラボの操作値（2群は等分散・等 n を仮定）。 */
export type NormalTestControls = {
  /** 2群の平均差 Δ=x̄1−x̄2。 */
  meanDiff: number;
  /** 各群の標本標準偏差 s（共通）。 */
  sd: number;
  /** 各群の標本サイズ n（共通）。 */
  n: number;
};

/** 2標本 t 検定ラボの派生値。 */
export type NormalTestDerived = {
  /** t 統計量。 */
  t: number;
  /** 自由度 df=2n−2。 */
  df: number;
  /** 標準誤差 se。 */
  se: number;
  /** 両側 p 値。 */
  p: number;
};

/**
 * 正規分布に関する検定（E-3）トピックの Zustand ストア（single source of truth）。
 * Control 層（平均差・s・n スライダー）は action を呼び、Render 層（t 分布・観測 t・p 値・数式）は
 * controls・derived を購読する。frame は2標本 t 検定の手順ステッパーが使う。
 */
export const useNormalTestStore = createTopicStore<NormalTestControls, NormalTestDerived>({
  initialControls: { meanDiff: 1.2, sd: 2, n: 15 },
  derive: ({ meanDiff, sd, n }) => {
    const { t, df, se } = twoSampleT({
      mean1: meanDiff,
      mean2: 0,
      s1: sd,
      s2: sd,
      n1: n,
      n2: n,
    });
    return { t, df, se, p: tTestPValue(t, df) };
  },
});
