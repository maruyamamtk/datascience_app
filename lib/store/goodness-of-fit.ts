import {
  chiSquareGof,
  chiSquareGofPValue,
  uniformExpected,
  type CellContribution,
} from "@/lib/stats/goodness-of-fit";
import { createTopicStore } from "./topicStore";

/** 適合度検定ラボの操作値（サイコロ6面の観測度数）。 */
export type GofControls = {
  /** カテゴリ別の観測度数（6面サイコロ）。 */
  observed: number[];
};

/** 適合度検定ラボの派生値。 */
export type GofDerived = {
  /** 期待度数（一様＝総数/6）。 */
  expected: number[];
  /** カイ二乗統計量。 */
  chi2: number;
  /** 自由度 = カテゴリ数−1。 */
  df: number;
  /** 右片側 p 値。 */
  p: number;
  /** セルごとの寄与 (O−E)²/E。 */
  cells: CellContribution[];
  /** 総観測数。 */
  total: number;
};

/** 初期は «ほぼ一様だが少し偏った» サイコロ（合計60）。 */
const INITIAL = [12, 8, 10, 11, 9, 10];

/**
 * 一般の分布に関する検定（E-4）トピックの Zustand ストア（single source of truth）。
 * Control 層（各目の観測度数スライダー）は action を呼び、Render 層（観測 vs 期待の棒・χ²・p 値・数式）は
 * controls・derived を購読する。frame は χ² を項ごとに積み上げるステッパーが使う。
 */
export const useGofStore = createTopicStore<GofControls, GofDerived>({
  initialControls: { observed: INITIAL },
  derive: ({ observed }) => {
    const total = observed.reduce((a, b) => a + b, 0);
    const expected = uniformExpected(total, observed.length);
    const { chi2, df, cells } = chiSquareGof(observed, expected);
    return { expected, chi2, df, p: chiSquareGofPValue(chi2, df), cells, total };
  },
});
