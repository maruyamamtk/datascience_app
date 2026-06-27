import { linearTransformMoments } from "@/lib/stats/transform";
import { createTopicStore } from "./topicStore";

/** 変数変換ラボの操作値（X~N(muX,sigmaX²) に Y=aX+b を施す）。 */
export type TransformControls = {
  /** 元 X の平均。 */
  muX: number;
  /** 元 X の標準偏差。 */
  sigmaX: number;
  /** 倍率 a（スケール）。 */
  a: number;
  /** 平行移動 b（シフト）。 */
  b: number;
};

/** 変数変換ラボの派生値。 */
export type TransformDerived = {
  /** Y の平均 aμ+b。 */
  muY: number;
  /** Y の分散 a²σ²。 */
  varY: number;
  /** Y の標準偏差 |a|σ。 */
  sigmaY: number;
  /** ヤコビアン係数 1/|a|（密度の高さの倍率）。 */
  jacobian: number;
};

/**
 * 変数変換と確率変数の線形結合（B-4）トピックの Zustand ストア（single source of truth）。
 * Control 層（μ_X・σ_X・a・b のスライダー）は action を呼び、Render 層（元/変換後の密度曲線 /
 * 数式 E[aX+b]・Var[aX+b] / ヤコビアン）はこのストアの `controls`・`derived` を購読する。
 */
export const useTransformStore = createTopicStore<TransformControls, TransformDerived>({
  initialControls: { muX: 0, sigmaX: 1, a: 2, b: 1 },
  derive: ({ muX, sigmaX, a, b }) => {
    const { mean, variance } = linearTransformMoments(muX, sigmaX * sigmaX, a, b);
    return {
      muY: mean,
      varY: variance,
      sigmaY: Math.abs(a) * sigmaX,
      jacobian: a === 0 ? Number.NaN : 1 / Math.abs(a),
    };
  },
});
