/**
 * カイ二乗独立性検定の «観測→周辺和→期待度数→セル寄与→合計と判定» をコマ送りで見せる
 * フレーム列ビルダー（計算層・純関数）。3×2 の固定表（学年×志望）で手順を追う（アルゴリズム図鑑スタイル）。
 * 副作用なし（Vitest 対象）。描画は IndependenceStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import {
  chiSquareContributions,
  chiSquareStatistic,
  colSums,
  degreesOfFreedom,
  expectedTable,
  grandTotal,
  independencePValue,
  rowSums,
  type Table,
} from "@/lib/stats/contingency";

/** 手順を追う固定の分割表（3グループ×2カテゴリ）。 */
export const DEMO_TABLE: Table = [
  [30, 10],
  [20, 20],
  [10, 30],
];
export const ROW_LABELS = ["A群", "B群", "C群"];
export const COL_LABELS = ["賛成", "反対"];

/** 手順のステージ。 */
export type IndepStage = "observed" | "marginals" | "expected" | "contributions" | "decision";

/** 各フレームのスナップショット。 */
export type IndepFramePayload = {
  stage: IndepStage;
  table: Table;
  rowSums: number[];
  colSums: number[];
  total: number;
  /** 期待度数（expected 以降で表示）。 */
  expected: Table | null;
  /** セル寄与 (O−E)²/E（contributions 以降）。 */
  contributions: Table | null;
  chi2: number;
  df: number;
  pValue: number;
};

/** 独立性の検定手順のフレーム列を作る。 */
export function buildIndependenceFrames(): VizFrame<IndepFramePayload>[] {
  const table = DEMO_TABLE;
  const rs = rowSums(table);
  const cs = colSums(table);
  const n = grandTotal(table);
  const e = expectedTable(table);
  const contrib = chiSquareContributions(table);
  const chi2 = chiSquareStatistic(table);
  const df = degreesOfFreedom(table);
  const p = independencePValue(table);

  const base = {
    table,
    rowSums: rs,
    colSums: cs,
    total: n,
    chi2,
    df,
    pValue: p,
  };

  return [
    {
      payload: { ...base, stage: "observed", expected: null, contributions: null },
      highlights: ["observed"],
      callout: {
        title: "① 観測度数（クロス集計）",
        body: `3つの群 × 賛否の観測度数。A群は賛成が多く、C群は反対が多い «ように見える»。この «見た目の偏り» が偶然か、群と意見に本当に関係があるのかを検定する。`,
        note: "帰無仮説 H0：群と意見は独立（無関係）。対立仮説 H1：関連がある。",
        kind: "explain",
      },
    },
    {
      payload: { ...base, stage: "marginals", expected: null, contributions: null },
      highlights: ["marginals"],
      callout: {
        title: "② 周辺和（行和・列和・総和）を出す",
        body: `各行の合計＝群ごとの人数、各列の合計＝賛否ごとの人数、総和 N=${n}。期待度数はこの周辺和«だけ»から決まる。`,
        note: "独立なら «全体の賛成率» が全群で同じはず。周辺和はその «基準の割合» を与える。",
        kind: "explain",
      },
    },
    {
      payload: { ...base, stage: "expected", expected: e, contributions: null },
      highlights: ["expected"],
      callout: {
        title: "③ 独立を仮定した期待度数 E = 行和·列和 / N",
        body: `«もし群と意見が無関係なら» 各セルはこの度数になるはず。例えば A群×賛成は (${rs[0]}×${cs[0]})/${n}=${e[0][0].toFixed(1)}。全群で賛否比が同じになる «偏りゼロ» の表。`,
        note: "観測と期待の «ズレ» が大きいほど、独立という仮定が疑わしい。",
        kind: "explain",
      },
    },
    {
      payload: { ...base, stage: "contributions", expected: e, contributions: contrib },
      highlights: ["contributions"],
      callout: {
        title: "④ セルごとのズレ (O−E)² / E を足し上げる",
        body: `各セルで «観測と期待の差» を二乗して期待で割る。E で割るのは «期待が大きいセルほど多少のズレは当然» だから相対化するため。全セルの和がカイ二乗統計量 χ²=${chi2.toFixed(2)}。`,
        note: "大きく外れているセル（濃い）が独立からのズレの主因。標準化残差で向きも分かる。",
        kind: "supplement",
      },
    },
    {
      payload: { ...base, stage: "decision", expected: e, contributions: contrib },
      highlights: ["decision"],
      callout: {
        title: `⑤ 判定：χ²=${chi2.toFixed(2)}, df=(3−1)(2−1)=${df}, p=${p.toFixed(4)}`,
        body: `自由度 (r−1)(c−1)=${df} のカイ二乗分布と比べて p 値を出す。p=${p.toFixed(4)} は有意水準0.05より小さいので H0（独立）を棄却＝«群と意見には関連がある»。`,
        note: "自由度が (r−1)(c−1) なのは、周辺和を固定すると自由に決められるセルがその数だけだから。関連の «強さ» は Cramér's V で別途測る（有意でも弱いことがある）。",
        kind: "supplement",
      },
    },
  ];
}
