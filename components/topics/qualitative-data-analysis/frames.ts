/**
 * 数量化I類の «生データ→ダミー符号化→カテゴリ数量を最小二乗で推定→予測» をコマ送りで見せる
 * フレーム列ビルダー（計算層・純関数）。固定シードのフィットで «質的変数を数量に変換して予測する»
 * 手順を追う（アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。描画は Quant1Stepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import {
  fitQuantification1,
  generateQuantData,
  predictQuant1,
} from "@/lib/stats/quantification";
import { mulberry32 } from "@/lib/stats/random";
import { ITEMS, TRUE_CONSTANT, TRUE_SCORES } from "@/lib/store/qualitative-data-analysis";

/** 表示用の小さなデモ行（天気index, 曜日index, 売上）。 */
export const DEMO_ROWS: { cats: [number, number]; y: number }[] = [
  { cats: [0, 0], y: 21 }, // 晴・平日
  { cats: [0, 1], y: 27 }, // 晴・週末
  { cats: [1, 0], y: 17 }, // 曇・平日
  { cats: [2, 1], y: 19 }, // 雨・週末
  { cats: [2, 0], y: 13 }, // 雨・平日
  { cats: [1, 1], y: 23 }, // 曇・週末
];

/** 固定シードの安定フィット（スコア表示用）。 */
const FIT = fitQuantification1(
  generateQuantData({ items: ITEMS, trueScores: TRUE_SCORES, constant: TRUE_CONSTANT, noise: 2, n: 1500, rng: mulberry32(20250661) }),
  ITEMS,
);
/** 予測例：晴(0)×週末(1)。 */
export const PRED_CATS: [number, number] = [0, 1];
export const PRED_VALUE = predictQuant1(FIT, PRED_CATS);

export type Quant1Stage = "raw" | "dummy" | "scores" | "predict";

export type Quant1FramePayload = {
  stage: Quant1Stage;
  constant: number;
  scores: number[][];
  rSquared: number;
  ranges: number[];
  predValue: number;
};

/** 数量化I類の手順フレーム列を作る。 */
export function buildQuant1Frames(): VizFrame<Quant1FramePayload>[] {
  const base = {
    constant: FIT.constant,
    scores: FIT.scores,
    rSquared: FIT.rSquared,
    ranges: FIT.ranges,
    predValue: PRED_VALUE,
  };
  return [
    {
      payload: { ...base, stage: "raw" },
      highlights: ["data"],
      callout: {
        title: "① 生データ：質的な説明変数 × 量的な目的変数",
        body: "天気（晴/曇/雨）と曜日（平日/週末）という «カテゴリ» からアイスの売上（万円）を予測したい。カテゴリは数値でないので、そのままでは回帰にかけられない。",
        note: "質的変数を «数量» に変換して量的予測につなぐのが数量化I類。",
        kind: "explain",
      },
    },
    {
      payload: { ...base, stage: "dummy" },
      highlights: ["dummy"],
      callout: {
        title: "② ダミー符号化：カテゴリを 0/1 の列に",
        body: "各カテゴリを «そのカテゴリなら1» のダミー変数にする（基準カテゴリは他が全部0で表現）。これで質的変数が数値の計画行列になり、重回帰の形に持ち込める。",
        note: "アイテムごとに1つのカテゴリを基準に落とすと、完全な多重共線性を避けられる。",
        kind: "supplement",
      },
    },
    {
      payload: { ...base, stage: "scores" },
      highlights: ["scores"],
      callout: {
        title: `③ 最小二乗でカテゴリ数量を推定（R²=${FIT.rSquared.toFixed(2)}）`,
        body: "ダミー回帰の係数から各カテゴリの «カテゴリ数量»（スコア）が決まる。各アイテムで平均0に中心化して «偏差» として読む：晴は売上を押し上げ、雨は押し下げる。レンジ（max−min）が大きいアイテムほど «効く»。",
        note: "1アイテムなら相関比 η² に一致。全体の説明力は R² で測る。",
        kind: "supplement",
      },
    },
    {
      payload: { ...base, stage: "predict" },
      highlights: ["predict"],
      callout: {
        title: `④ 予測：定数 + カテゴリ数量の和 = ${PRED_VALUE.toFixed(1)} 万円`,
        body: `晴×週末なら ŷ = 定数 ${FIT.constant.toFixed(1)} + 天気(晴) ${FIT.scores[0][0].toFixed(1)} + 曜日(週末) ${FIT.scores[1][1].toFixed(1)} = ${PRED_VALUE.toFixed(1)}。カテゴリを数量に置き換え、足し合わせるだけで予測できる。`,
        note: "各カテゴリの寄与が加法的に分解されるので «どの条件がどれだけ効くか» が読みやすい（説明性の高さ）。",
        kind: "explain",
      },
    },
  ];
}
