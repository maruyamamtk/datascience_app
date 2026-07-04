import { power, requiredSampleSize, twoProportionTest } from "@/lib/stats/ab-test";
import { createTopicStore } from "./topicStore";

/** A/Bテスト計画ラボの操作値。 */
export type AbControls = {
  /** ベースライン（A群）のコンバージョン率 p0（%表示だが内部は割合）。 */
  baseline: number;
  /** 最小検出したい絶対リフト MDE（δ=p1−p0）。 */
  mde: number;
  /** 両側有意水準 α。 */
  alpha: number;
  /** 目標検出力（1−β）。 */
  targetPower: number;
  /** 実際に割り当てる1群あたりの標本サイズ。 */
  n: number;
};

/** A/Bテスト計画ラボの派生値。 */
export type AbDerived = {
  /** 処置群の想定率 p1=p0+MDE。 */
  p1: number;
  /** 相対リフト MDE/p0。 */
  relativeLift: number;
  /** 目標検出力を満たす必要標本サイズ（1群あたり）。 */
  requiredN: number;
  /** 実際の n での検出力。 */
  achievedPower: number;
  /** 実際の n が必要 n を満たすか。 */
  sufficient: boolean;
  /** 期待される観測（各群の想定成功数）での z 統計量（参考）。 */
  z: number;
};

/**
 * A/Bテスト実務（N-3）トピックの Zustand ストア（single source of truth）。
 * Control 層（baseline・MDE・α・目標検出力・実際のn）は action を呼び、Render 層
 * （AbTestLab の必要標本サイズ・検出力バー・強連動数式）は controls・derived を購読する。
 * «小さな効果を確実に検出するほど大量の標本が要る» «nが足りないと検出力が落ちる» を体感する。
 * frame は覗き見（peeking）ステッパーが使う。
 */
export const useAbStore = createTopicStore<AbControls, AbDerived>({
  initialControls: { baseline: 0.1, mde: 0.02, alpha: 0.05, targetPower: 0.8, n: 3000 },
  derive: ({ baseline, mde, alpha, targetPower, n }) => {
    const p1 = baseline + mde;
    const requiredN = requiredSampleSize({ p0: baseline, mde, alpha, power: targetPower });
    const achievedPower = power({ p0: baseline, mde, n, alpha });
    // 参考：想定率どおり観測された場合の z（各群 n 試行）。
    const { z } = twoProportionTest({
      x1: Math.round(baseline * n),
      n1: n,
      x2: Math.round(p1 * n),
      n2: n,
    });
    return {
      p1,
      relativeLift: baseline > 0 ? mde / baseline : Number.NaN,
      requiredN,
      achievedPower,
      sufficient: n >= requiredN,
      z,
    };
  },
});
