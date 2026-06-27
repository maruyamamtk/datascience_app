import { describe, expect, it } from "vitest";
import {
  deriveRegression,
  makeSamplePoints,
  olsFit,
  residualSumOfSquares,
  type Point,
} from "./regression";
import { mulberry32 } from "./random";

// 手計算しやすい 5 点（x̄=3, ȳ=4, Sxy=9, Sxx=10 → 傾き0.9・切片1.3・RSS1.9・R²0.81）。
const PTS: Point[] = [
  { x: 1, y: 2 },
  { x: 2, y: 3 },
  { x: 3, y: 5 },
  { x: 4, y: 4 },
  { x: 5, y: 6 },
];

describe("olsFit（正規方程式の閉形式）", () => {
  it("傾き・切片・R²・RSS が手計算と一致", () => {
    const f = olsFit(PTS);
    expect(f.sxy).toBeCloseTo(9, 12);
    expect(f.sxx).toBeCloseTo(10, 12);
    expect(f.slope).toBeCloseTo(0.9, 12);
    expect(f.intercept).toBeCloseTo(1.3, 12);
    expect(f.rss).toBeCloseTo(1.9, 12);
    expect(f.r2).toBeCloseTo(0.81, 12);
    expect(f.meanX).toBeCloseTo(3, 12);
    expect(f.meanY).toBeCloseTo(4, 12);
  });

  it("残差の和は ≈0（最小二乗解の性質）", () => {
    const f = olsFit(PTS);
    const sum = f.residuals.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0, 10);
  });

  it("完全に直線上の点なら R²=1・RSS=0", () => {
    const line: Point[] = [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ]; // y=2x+1
    const f = olsFit(line);
    expect(f.slope).toBeCloseTo(2, 12);
    expect(f.intercept).toBeCloseTo(1, 12);
    expect(f.rss).toBeCloseTo(0, 12);
    expect(f.r2).toBeCloseTo(1, 12);
  });

  it("x が一点に縮退すると傾きは NaN（Sxx=0）", () => {
    const f = olsFit([
      { x: 2, y: 1 },
      { x: 2, y: 5 },
    ]);
    expect(f.slope).toBeNaN();
  });
});

describe("residualSumOfSquares（任意直線の RSS）", () => {
  it("最小二乗解の RSS が任意の直線より小さい", () => {
    const f = olsFit(PTS);
    const rssOls = residualSumOfSquares(PTS, { slope: f.slope, intercept: f.intercept });
    expect(rssOls).toBeCloseTo(f.rss, 12);
    // 別の（最適でない）直線。
    expect(residualSumOfSquares(PTS, { slope: 1, intercept: 1 })).toBeGreaterThan(rssOls);
    expect(residualSumOfSquares(PTS, { slope: 0.5, intercept: 2 })).toBeGreaterThan(rssOls);
  });

  it("傾き1・切片1 の RSS は 2.0", () => {
    expect(residualSumOfSquares(PTS, { slope: 1, intercept: 1 })).toBeCloseTo(2, 12);
  });
});

describe("makeSamplePoints（決定的サンプル生成）", () => {
  it("同じシードなら再現する", () => {
    const args = { a: 2, b: 1, noise: 1, n: 10, xMin: 0, xMax: 9 };
    const a = makeSamplePoints({ ...args, rng: mulberry32(42) });
    const b = makeSamplePoints({ ...args, rng: mulberry32(42) });
    expect(a).toEqual(b);
    expect(a).toHaveLength(10);
  });

  it("x は等間隔・ノイズ0なら完全に直線上", () => {
    const pts = makeSamplePoints({ a: 3, b: -1, noise: 0, n: 4, xMin: 0, xMax: 3, rng: mulberry32(1) });
    expect(pts.map((p) => p.x)).toEqual([0, 1, 2, 3]);
    pts.forEach((p) => expect(p.y).toBeCloseTo(3 * p.x - 1, 10));
    expect(olsFit(pts).r2).toBeCloseTo(1, 10);
  });

  it("ノイズを入れても OLS 推定は真値の近傍（大標本）", () => {
    const pts = makeSamplePoints({ a: 2, b: 5, noise: 1, n: 500, xMin: 0, xMax: 50, rng: mulberry32(7) });
    const f = olsFit(pts);
    expect(f.slope).toBeCloseTo(2, 1);
    expect(f.intercept).toBeCloseTo(5, 0);
  });
});

describe("deriveRegression（ストアの派生値）", () => {
  it("OLS 解・R²・公式の分子分母・手動 RSS を返す", () => {
    const d = deriveRegression({ points: PTS, slope: 1, intercept: 1 });
    expect(d.olsSlope).toBeCloseTo(0.9, 12);
    expect(d.olsIntercept).toBeCloseTo(1.3, 12);
    expect(d.olsRss).toBeCloseTo(1.9, 12);
    expect(d.r2).toBeCloseTo(0.81, 12);
    expect(d.sxy).toBeCloseTo(9, 12);
    expect(d.sxx).toBeCloseTo(10, 12);
    expect(d.manualRss).toBeCloseTo(2, 12);
    expect(d.manualResiduals).toHaveLength(5);
  });

  it("手動直線を OLS 解に合わせると manualRss=olsRss が最小", () => {
    const f = olsFit(PTS);
    const d = deriveRegression({ points: PTS, slope: f.slope, intercept: f.intercept });
    expect(d.manualRss).toBeCloseTo(d.olsRss, 10);
  });

  it("外れ値を動かすと OLS の傾きが変わる（外れ値が係数を引っ張る）", () => {
    const base = deriveRegression({ points: PTS, slope: 0.9, intercept: 1.3 });
    const moved = PTS.map((p, i) => (i === 4 ? { x: 5, y: 20 } : p)); // 最後の点を大きく上へ
    const after = deriveRegression({ points: moved, slope: 0.9, intercept: 1.3 });
    expect(after.olsSlope).toBeGreaterThan(base.olsSlope);
  });
});
