import { describe, expect, it } from "vitest";
import {
  correlationRatio,
  fitQuantification1,
  generateQuantData,
  predictQuant1,
  type QuantItem,
} from "./quantification";
import { mulberry32 } from "./random";

const ITEMS: QuantItem[] = [
  { name: "天気", categories: ["晴", "曇", "雨"] },
  { name: "曜日", categories: ["平日", "週末"] },
];
// 真のカテゴリ数量（各アイテム平均0）。
const TRUE_SCORES = [
  [4, 0, -4], // 天気：晴+4, 曇0, 雨−4
  [-3, 3], // 曜日：平日−3, 週末+3
];
const CONSTANT = 20;

describe("fitQuantification1（数量化I類）", () => {
  const rows = generateQuantData({
    items: ITEMS,
    trueScores: TRUE_SCORES,
    constant: CONSTANT,
    noise: 1,
    n: 4000,
    rng: mulberry32(51),
  });
  const fit = fitQuantification1(rows, ITEMS);

  it("定数が真のグランド平均に近い", () => {
    expect(fit.constant).toBeCloseTo(CONSTANT, 0);
  });

  it("各アイテムのカテゴリ数量は平均0（中心化）", () => {
    for (const s of fit.scores) {
      const m = s.reduce((a, b) => a + b, 0) / s.length;
      expect(Math.abs(m)).toBeLessThan(1e-9);
    }
  });

  it("推定カテゴリ数量が真の値を回復", () => {
    fit.scores.forEach((s, item) => {
      s.forEach((v, c) => {
        expect(v).toBeCloseTo(TRUE_SCORES[item][c], 0);
      });
    });
  });

  it("予測は 定数+スコア和、高い説明力（R²大）", () => {
    // 晴(0)×週末(1) → 20 + 4 + 3 = 27
    expect(predictQuant1(fit, [0, 1])).toBeCloseTo(27, 0);
    // 雨(2)×平日(0) → 20 − 4 − 3 = 13
    expect(predictQuant1(fit, [2, 0])).toBeCloseTo(13, 0);
    expect(fit.rSquared).toBeGreaterThan(0.9);
  });

  it("レンジは効きの目安（天気=8, 曜日=6）", () => {
    expect(fit.ranges[0]).toBeCloseTo(8, 0);
    expect(fit.ranges[1]).toBeCloseTo(6, 0);
  });
});

describe("ノイズと説明力", () => {
  it("ノイズが大きいほど R² は下がる", () => {
    const low = fitQuantification1(
      generateQuantData({ items: ITEMS, trueScores: TRUE_SCORES, constant: CONSTANT, noise: 1, n: 3000, rng: mulberry32(52) }),
      ITEMS,
    );
    const high = fitQuantification1(
      generateQuantData({ items: ITEMS, trueScores: TRUE_SCORES, constant: CONSTANT, noise: 10, n: 3000, rng: mulberry32(52) }),
      ITEMS,
    );
    expect(high.rSquared).toBeLessThan(low.rSquared);
  });
});

describe("correlationRatio（相関比 η²）", () => {
  it("群平均が大きく散らばれば η² は1に近い", () => {
    const values = [10, 11, 9, 30, 31, 29];
    const groups = [0, 0, 0, 1, 1, 1];
    expect(correlationRatio(values, groups)).toBeGreaterThan(0.95);
  });
  it("群で差がなければ（両群同平均）η² は0に近い", () => {
    const values = [10, 20, 10, 20];
    const groups = [0, 0, 1, 1]; // 群0={10,20}平均15, 群1={10,20}平均15
    expect(correlationRatio(values, groups)).toBeLessThan(0.05);
  });
});
