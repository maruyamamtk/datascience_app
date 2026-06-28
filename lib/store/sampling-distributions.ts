import {
  SAMPLING_SPECS,
  samplingCurve,
  type SamplingKind,
  type SamplingParams,
} from "@/lib/stats/sampling-distributions";
import { createTopicStore } from "./topicStore";

/** 標本分布ラボの操作値（種別＋自由度）。 */
export type SamplingControls = {
  kind: SamplingKind;
} & SamplingParams;

/** 標本分布ラボの派生値。 */
export type SamplingDerived = {
  curve: { x: number; y: number }[];
  mean: number;
  variance: number;
  paramText: string;
};

/**
 * 標本分布（C-3）トピックの Zustand ストア（single source of truth）。
 * Control 層（種別ボタン・自由度スライダー）は action を呼び、Render 層（PDF 曲線 / 平均・分散の数式）は
 * controls・derived を購読する。frame は t 分布 → 正規分布の収束ステッパーが使う。
 */
export const useSamplingStore = createTopicStore<SamplingControls, SamplingDerived>({
  initialControls: { kind: "t", df1: 3, df2: 10 },
  derive: ({ kind, df1, df2 }) => {
    const params: SamplingParams = { df1, df2 };
    const spec = SAMPLING_SPECS[kind];
    return {
      curve: samplingCurve(kind, params),
      mean: spec.mean(params),
      variance: spec.variance(params),
      paramText: spec.paramText(params),
    };
  },
});
