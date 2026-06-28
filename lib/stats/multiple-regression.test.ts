import { describe, expect, it } from "vitest";
import { inverse, matMul, transpose } from "./linalg";
import { designMatrix, generateCollinearData, olsFit, vif } from "./multiple-regression";
import { mulberry32 } from "./random";

describe("linalg", () => {
  it("転置", () => {
    expect(transpose([[1, 2, 3]])).toEqual([[1], [2], [3]]);
  });
  it("行列積", () => {
    expect(
      matMul(
        [
          [1, 2],
          [3, 4],
        ],
        [
          [5, 6],
          [7, 8],
        ],
      ),
    ).toEqual([
      [19, 22],
      [43, 50],
    ]);
  });
  it("逆行列（2x2）", () => {
    const inv = inverse([
      [4, 7],
      [2, 6],
    ])!;
    // 1/(24-14) [[6,-7],[-2,4]]
    expect(inv[0][0]).toBeCloseTo(0.6, 10);
    expect(inv[0][1]).toBeCloseTo(-0.7, 10);
    expect(inv[1][0]).toBeCloseTo(-0.2, 10);
    expect(inv[1][1]).toBeCloseTo(0.4, 10);
  });
  it("特異行列は null", () => {
    expect(
      inverse([
        [1, 2],
        [2, 4],
      ]),
    ).toBeNull();
  });
});

describe("olsFit", () => {
  it("完全に当てはまる線形データは R²=1、係数を復元", () => {
    // y = 1 + 2 x1 + 3 x2（ノイズなし）
    const x1 = [0, 1, 2, 3, 1, 2];
    const x2 = [1, 0, 1, 2, 2, 0];
    const y = x1.map((v, i) => 1 + 2 * v + 3 * x2[i]);
    const fit = olsFit(designMatrix([x1, x2]), y);
    expect(fit.coefficients[0]).toBeCloseTo(1, 6);
    expect(fit.coefficients[1]).toBeCloseTo(2, 6);
    expect(fit.coefficients[2]).toBeCloseTo(3, 6);
    expect(fit.rSquared).toBeCloseTo(1, 8);
  });
  it("単回帰（説明変数1つ）に一致", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 5, 4, 6];
    const fit = olsFit(designMatrix([x]), y);
    // 既知の OLS: slope=0.8, intercept=ȳ−slope·x̄=4.2−2.4=1.8
    expect(fit.coefficients[1]).toBeCloseTo(0.8, 6);
    expect(fit.coefficients[0]).toBeCloseTo(1.8, 6);
  });
  it("変数を増やすと R² は上がるが調整済み R² は必ずしも上がらない", () => {
    const rng = mulberry32(1);
    const x1 = Array.from({ length: 30 }, (_, i) => i / 10);
    const x2 = Array.from({ length: 30 }, () => rng()); // y と無関係なノイズ変数
    const y = x1.map((v) => 2 * v + (rng() - 0.5));
    const fit1 = olsFit(designMatrix([x1]), y);
    const fit2 = olsFit(designMatrix([x1, x2]), y);
    expect(fit2.rSquared).toBeGreaterThanOrEqual(fit1.rSquared - 1e-9); // R²は単調非減少
    // 無意味な変数追加で調整済みR²は下がる（ことが多い）。
    expect(fit2.adjustedRSquared).toBeLessThan(fit1.adjustedRSquared + 0.05);
  });
});

describe("vif（多重共線性）", () => {
  it("相関の高い2変数は VIF が大きい", () => {
    const rng = mulberry32(42);
    const lo = generateCollinearData({
      n: 200,
      rho: 0.2,
      b1: 1,
      b2: 1,
      noise: 1,
      rng: mulberry32(1),
    });
    const hi = generateCollinearData({
      n: 200,
      rho: 0.95,
      b1: 1,
      b2: 1,
      noise: 1,
      rng: mulberry32(1),
    });
    void rng;
    const vifLo = vif([lo.x1, lo.x2], 0);
    const vifHi = vif([hi.x1, hi.x2], 0);
    expect(vifHi).toBeGreaterThan(vifLo);
    // rho=0.95 → VIF≈1/(1-0.95²)≈10.3（標本なので近似）。
    expect(vifHi).toBeGreaterThan(5);
  });
  it("無相関なら VIF≈1", () => {
    const d = generateCollinearData({ n: 400, rho: 0, b1: 1, b2: 1, noise: 1, rng: mulberry32(7) });
    expect(vif([d.x1, d.x2], 0)).toBeLessThan(1.3);
  });
});

describe("多重共線性は係数の標準誤差を膨らませる", () => {
  it("rho が高いほど係数SEが大きい（同じノイズ・n）", () => {
    const lo = generateCollinearData({
      n: 150,
      rho: 0.3,
      b1: 1,
      b2: 1,
      noise: 1,
      rng: mulberry32(3),
    });
    const hi = generateCollinearData({
      n: 150,
      rho: 0.97,
      b1: 1,
      b2: 1,
      noise: 1,
      rng: mulberry32(3),
    });
    const seLo = olsFit(designMatrix([lo.x1, lo.x2]), lo.y).standardErrors[1];
    const seHi = olsFit(designMatrix([hi.x1, hi.x2]), hi.y).standardErrors[1];
    expect(seHi).toBeGreaterThan(seLo);
  });
});
