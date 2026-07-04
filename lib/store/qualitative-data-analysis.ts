import {
  fitQuantification1,
  generateQuantData,
  predictQuant1,
  type Quant1Fit,
  type QuantItem,
} from "@/lib/stats/quantification";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 固定シナリオ：天気×曜日 → アイスの売上（万円）。 */
export const ITEMS: QuantItem[] = [
  { name: "天気", categories: ["晴", "曇", "雨"] },
  { name: "曜日", categories: ["平日", "週末"] },
];
/** 真のカテゴリ数量（各アイテム平均0）。 */
export const TRUE_SCORES = [
  [4, 0, -4],
  [-3, 3],
];
export const TRUE_CONSTANT = 20;

/** 質的データ解析ラボの操作値。 */
export type QualControls = {
  /** 雑音の大きさ（説明力に影響）。 */
  noise: number;
  /** 標本サイズ。 */
  n: number;
  /** 予測する «天気» カテゴリ index。 */
  weather: number;
  /** 予測する «曜日» カテゴリ index。 */
  day: number;
};

/** 質的データ解析ラボの派生値。 */
export type QualDerived = {
  fit: Quant1Fit;
  /** 選択した組合せの予測値。 */
  prediction: number;
  /** 予測の内訳（定数・天気スコア・曜日スコア）。 */
  parts: { constant: number; weather: number; day: number };
};

/**
 * 質的データ解析（N-6）トピックの Zustand ストア（single source of truth）。
 * Control 層（雑音・標本サイズ・予測する天気/曜日）は action を呼び、Render 層（QuantLab の
 * カテゴリ数量バー・予測の内訳・強連動数式）は controls・derived を購読する。
 * 数量化I類が真のカテゴリ数量を回復すること、雑音で説明力 R² が落ちることを体感する。
 * frame は数量化手順ステッパーが使う。
 */
export const useQualStore = createTopicStore<QualControls, QualDerived>({
  initialControls: { noise: 2, n: 1500, weather: 0, day: 1 },
  derive: ({ noise, n, weather, day }) => {
    const rows = generateQuantData({
      items: ITEMS,
      trueScores: TRUE_SCORES,
      constant: TRUE_CONSTANT,
      noise,
      n,
      rng: mulberry32(20250066),
    });
    const fit = fitQuantification1(rows, ITEMS);
    return {
      fit,
      prediction: predictQuant1(fit, [weather, day]),
      parts: {
        constant: fit.constant,
        weather: fit.scores[0][weather],
        day: fit.scores[1][day],
      },
    };
  },
});
