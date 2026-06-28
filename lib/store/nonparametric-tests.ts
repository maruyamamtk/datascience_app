import { meanDiff, permutationNull, permutationPValue } from "@/lib/stats/nonparametric";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 並べ替え検定ラボの基準データ（群Bは固定、群Aは shift だけ底上げ）。 */
const BASE_A = [4, 5, 6, 5, 7, 6];
const GROUP_B = [4, 5, 4, 6, 5, 5];
/** 帰無分布のシャッフル回数（決定的 PRNG で再現可能）。 */
const SHUFFLES = 1200;

/** ノンパラメトリック法ラボの操作値。 */
export type NonparamControls = {
  /** 群Aの底上げ量 shift（大きいほど2群の差が明確）。 */
  shift: number;
};

/** ノンパラメトリック法ラボの派生値。 */
export type NonparamDerived = {
  /** 群A（base + shift）。 */
  groupA: number[];
  /** 群B（固定）。 */
  groupB: number[];
  /** 観測平均差 mean(A)−mean(B)。 */
  observedDiff: number;
  /** 並べ替え帰無分布。 */
  nullDist: number[];
  /** 並べ替え両側 p 値。 */
  p: number;
};

/**
 * ノンパラメトリック法（E-5）トピックの Zustand ストア（single source of truth）。
 * Control 層（shift スライダー）は action を呼び、Render 層（2群の点・帰無分布・観測差・p値・数式）は
 * controls・derived を購読する。frame は並べ替えで帰無分布を組み立てるステッパーが使う。
 * 帰無分布は固定シードの決定的シャッフルで、shift にのみ依存して再現可能。
 */
export const useNonparamStore = createTopicStore<NonparamControls, NonparamDerived>({
  initialControls: { shift: 1.5 },
  derive: ({ shift }) => {
    const groupA = BASE_A.map((x) => x + shift);
    const observedDiff = meanDiff(groupA, GROUP_B);
    const nullDist = permutationNull(groupA, GROUP_B, SHUFFLES, mulberry32(20240701));
    return {
      groupA,
      groupB: GROUP_B,
      observedDiff,
      nullDist,
      p: permutationPValue(observedDiff, nullDist),
    };
  },
});
