import {
  acDependence,
  dSeparated,
  generateTriples,
  type Structure,
  type Triple,
} from "@/lib/stats/graphical";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

export const N = 4000;

/** グラフィカルモデル・ラボの操作値。 */
export type GraphControls = {
  /** 基本構造（連鎖・分岐・合流）。 */
  structure: Structure;
  /** 各辺の強さ w。 */
  w: number;
  /** B（中間ノード）を条件づける（観測する）か。 */
  conditionOnB: boolean;
};

/** グラフィカルモデル・ラボの派生値。 */
export type GraphDerived = {
  triples: Triple[];
  /** 周辺相関 corr(A,C)。 */
  marginal: number;
  /** B を条件づけた偏相関 corr(A,C·B)。 */
  partialGivenB: number;
  /** 現在の «条件づけ» 設定で A,C が d分離されるか（理論）。 */
  dsep: boolean;
  /** 現在の設定で実際に効いている（条件付き）相関。 */
  effective: number;
};

/**
 * グラフィカルモデリング（N-4）トピックの Zustand ストア（single source of truth）。
 * Control 層（構造・辺の強さ・B の条件づけトグル）は action を呼び、Render 層（GraphLab の
 * DAG 図・周辺/偏相関バー・d分離の判定・強連動数式）は controls・derived を購読する。
 * 連鎖/分岐は条件づけで遮断、合流は条件づけで開く «d分離» を実測相関で体感する。
 * frame は3構造ステッパーが使う。
 */
export const useGraphStore = createTopicStore<GraphControls, GraphDerived>({
  initialControls: { structure: "chain", w: 0.9, conditionOnB: false },
  derive: ({ structure, w, conditionOnB }) => {
    const triples = generateTriples({ structure, n: N, w, rng: mulberry32(20250065) });
    const { marginal, partialGivenB } = acDependence(triples);
    return {
      triples,
      marginal,
      partialGivenB,
      dsep: dSeparated(structure, conditionOnB),
      effective: conditionOnB ? partialGivenB : marginal,
    };
  },
});
