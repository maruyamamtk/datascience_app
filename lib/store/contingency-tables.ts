import {
  chiSquareStatistic,
  cramersV,
  degreesOfFreedom,
  expectedTable,
  grandTotal,
  independencePValue,
  oddsRatio2x2,
  standardizedResiduals,
  type Table,
} from "@/lib/stats/contingency";
import { createTopicStore } from "./topicStore";

/** 分割表ラボの操作値（2×2 の4セル：治療×改善 を想定）。 */
export type ContingencyControls = {
  /** 治療あり×改善 a。 */
  a: number;
  /** 治療あり×非改善 b。 */
  b: number;
  /** 治療なし×改善 c。 */
  c: number;
  /** 治療なし×非改善 d。 */
  d: number;
};

/** 分割表ラボの派生値。 */
export type ContingencyDerived = {
  table: Table;
  expected: Table;
  residuals: Table;
  n: number;
  chi2: number;
  df: number;
  pValue: number;
  cramersV: number;
  oddsRatio: number;
};

/**
 * 分割表の解析（N-5）トピックの Zustand ストア（single source of truth）。
 * Control 層（4セルのスライダー）は action を呼び、Render 層（観測/期待表・残差ヒートマップ・χ²・p値・
 * Cramér's V・オッズ比・数式）は controls・derived を購読する。対角を増やすと連関が強まり χ² が増える。
 * frame は独立性の検定手順のステッパーが使う。
 */
export const useContingencyStore = createTopicStore<ContingencyControls, ContingencyDerived>({
  initialControls: { a: 40, b: 20, c: 20, d: 40 },
  derive: ({ a, b, c, d }) => {
    const table: Table = [
      [a, b],
      [c, d],
    ];
    return {
      table,
      expected: expectedTable(table),
      residuals: standardizedResiduals(table),
      n: grandTotal(table),
      chi2: chiSquareStatistic(table),
      df: degreesOfFreedom(table),
      pValue: independencePValue(table),
      cramersV: cramersV(table),
      oddsRatio: oddsRatio2x2(table),
    };
  },
});
