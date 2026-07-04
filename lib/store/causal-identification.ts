import {
  didCounterfactual,
  didEstimate,
  generateDidCells,
  type DidCells,
} from "@/lib/stats/identification";
import { createTopicStore } from "./topicStore";

/** DID ラボの操作値。 */
export type DidControls = {
  /** 真の処置効果（介入が処置群後にもたらす上乗せ）。 */
  trueEffect: number;
  /** 共通の時間トレンド（両群に共通して起きる前→後の変化）。 */
  commonTrend: number;
  /** 平行トレンド仮定の破れ（処置群だけの別の時間変化）＝ DID のバイアス源。 */
  parallelViolation: number;
};

/** DID ラボの派生値。 */
export type DidDerived = {
  cells: DidCells;
  /** DID 推定量＝（処置群の変化）−（対照群の変化）。 */
  did: number;
  /** 処置群の反事実後（平行トレンドで外挿）。 */
  counterfactual: number;
  /** 推定バイアス（DID − 真の効果）＝ 平行トレンドの破れ分。 */
  bias: number;
};

const TREATED_BEFORE = 20;
const CONTROL_BEFORE = 10;

/**
 * 識別戦略（N-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（真の効果・共通トレンド・平行トレンドの破れ）は action を呼び、Render 層
 * （DidLab の2×2折れ線・反事実の破線・DID の強連動数式）は controls・derived を購読する。
 * 平行トレンドが成り立つ間は DID=真の効果、破れを入れるとそのままバイアスになる «識別の仮定» を体感する。
 * frame は RDD のジャンプ・ステッパーが使う。
 */
export const useDidStore = createTopicStore<DidControls, DidDerived>({
  initialControls: { trueEffect: 3, commonTrend: 4, parallelViolation: 0 },
  derive: ({ trueEffect, commonTrend, parallelViolation }) => {
    const cells = generateDidCells({
      trueEffect,
      commonTrend,
      treatedBefore: TREATED_BEFORE,
      controlBefore: CONTROL_BEFORE,
      parallelViolation,
    });
    const did = didEstimate(cells);
    return {
      cells,
      did,
      counterfactual: didCounterfactual(cells),
      bias: did - trueEffect,
    };
  },
});
