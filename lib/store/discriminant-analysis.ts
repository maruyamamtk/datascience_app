import {
  classify,
  fisherLda,
  generateTwoClasses,
  type Confusion,
  type LdaResult,
} from "@/lib/stats/discriminant";
import type { Point2 } from "@/lib/stats/pca";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

const N_PER_CLASS = 60;
const SPREAD = 1.4;

/** 判別分析ラボの操作値。 */
export type LdaControls = {
  /** 2クラスの重心の隔たり separation（大きいほど分けやすい）。 */
  separation: number;
};

/** 判別分析ラボの派生値。 */
export type LdaDerived = {
  /** クラス1・2のデータ。 */
  g1: Point2[];
  g2: Point2[];
  /** フィッシャー線形判別の結果。 */
  lda: LdaResult;
  /** 混同行列・誤判別率。 */
  confusion: Confusion;
};

/**
 * 判別分析（H-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（隔たり separation スライダー）は action を呼び、Render 層（2クラスの散布図・判別境界・
 * 判別軸・混同行列・誤判別率・数式）は controls・derived を購読する。隔たりを増やすと誤判別率が下がる。
 * データは固定シードの決定的生成で separation にのみ依存して再現可能。frame は判別軸探索のステッパーが使う。
 */
export const useLdaStore = createTopicStore<LdaControls, LdaDerived>({
  initialControls: { separation: 4 },
  derive: ({ separation }) => {
    const { g1, g2 } = generateTwoClasses({
      nPerClass: N_PER_CLASS,
      separation,
      spread: SPREAD,
      rng: mulberry32(20241201),
    });
    const lda = fisherLda(g1, g2);
    return { g1, g2, lda, confusion: classify(g1, g2, lda) };
  },
});
