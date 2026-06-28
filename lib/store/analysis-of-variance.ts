import { oneWayAnova, type AnovaResult } from "@/lib/stats/anova";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 各群のサイズと «群内ノイズ» の基準（separation=0 でも群はこのばらつきを持つ）。 */
const GROUP_SIZE = 6;
const NUM_GROUPS = 3;
const BASE = 10;
/** 群内ノイズ（固定シードで決定的）。3群×6個の標準正規。 */
const NOISE: number[][] = (() => {
  const rng = mulberry32(20241001);
  return Array.from({ length: NUM_GROUPS }, () =>
    Array.from({ length: GROUP_SIZE }, () => (rng() - 0.5) * 4),
  );
})();

/** 分散分析ラボの操作値。 */
export type AnovaControls = {
  /** 群平均の «隔たり» separation（大きいほど群間の差が明確）。 */
  separation: number;
};

/** 分散分析ラボの派生値。 */
export type AnovaDerived = {
  /** 各群のデータ。 */
  groups: number[][];
  /** 一元配置分散分析の結果。 */
  anova: AnovaResult;
};

/**
 * 分散分析（G-1）トピックの Zustand ストア（single source of truth）。
 * Control 層（隔たり separation スライダー）は action を呼び、Render 層（群の点・級間/級内変動・F・p・数式）は
 * controls・derived を購読する。群平均を separation だけ離し、«群間の差 vs 群内のばらつき» の比で F が動く。
 * データは固定ノイズ＋separation の決定的生成で再現可能。frame は変動分解のステッパーが使う。
 */
export const useAnovaStore = createTopicStore<AnovaControls, AnovaDerived>({
  initialControls: { separation: 1 },
  derive: ({ separation }) => {
    // 群平均を BASE を中心に −sep, 0, +sep に置く。
    const centers = [BASE - separation, BASE, BASE + separation];
    const groups = NOISE.map((g, j) => g.map((e) => centers[j] + e));
    return { groups, anova: oneWayAnova(groups) };
  },
});
