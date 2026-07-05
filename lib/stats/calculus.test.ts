import { describe, expect, it } from "vitest";
import {
  linspace,
  numDerivative,
  riemannRects,
  riemannSum,
  sampleCurve,
  secantSlope,
  tangentAt,
  trapezoidSum,
} from "./calculus";

describe("linspace", () => {
  it("端点を含み n 等分する", () => {
    expect(linspace(0, 1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(linspace(-2, 2, 3)).toEqual([-2, 0, 2]);
  });
  it("n<2 は始点のみ", () => {
    expect(linspace(3, 9, 1)).toEqual([3]);
  });
});

describe("sampleCurve", () => {
  it("関数値をサンプルする", () => {
    const pts = sampleCurve((x) => x * x, 0, 2, 3);
    expect(pts).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
    ]);
  });
});

describe("secantSlope", () => {
  it("平均変化率＝(f(x+h)−f(x))/h", () => {
    // f(x)=x²: [1, 1+h] の平均変化率は 2+h
    expect(secantSlope((x) => x * x, 1, 0.5)).toBeCloseTo(2.5, 12);
    expect(secantSlope((x) => x * x, 1, 0.1)).toBeCloseTo(2.1, 12);
  });
  it("h→0 で微分係数に近づく（誤差が単調に減る）", () => {
    // f(x)=x² の x=1 では割線の傾き 2+h → f'(1)=2。前方差分の誤差は h に比例。
    const err = [1, 0.1, 0.01].map((h) => Math.abs(secantSlope((x) => x * x, 1, h) - 2));
    expect(err[0]).toBeGreaterThan(err[1]);
    expect(err[1]).toBeGreaterThan(err[2]);
    expect(err[2]).toBeCloseTo(0.01, 6); // 誤差 = h
  });
});

describe("numDerivative", () => {
  it("べき関数 f(x)=x² の微分は 2x", () => {
    expect(numDerivative((x) => x * x, 3)).toBeCloseTo(6, 6);
    expect(numDerivative((x) => x * x, -2)).toBeCloseTo(-4, 6);
  });
  it("sin の微分は cos", () => {
    expect(numDerivative(Math.sin, 0)).toBeCloseTo(1, 6);
    expect(numDerivative(Math.sin, Math.PI / 2)).toBeCloseTo(0, 6);
  });
  it("三次関数 f(x)=x³/3−x の微分は x²−1（極値 ±1 で 0）", () => {
    const df = (x: number) => numDerivative((t) => t ** 3 / 3 - t, x);
    expect(df(1)).toBeCloseTo(0, 5);
    expect(df(-1)).toBeCloseTo(0, 5);
    expect(df(2)).toBeCloseTo(3, 5); // 2²−1
  });
});

describe("tangentAt", () => {
  it("接線の傾き＝f'(x0)、切片は接点を通る", () => {
    // f(x)=x² の x0=2 での接線 y=4x−4
    const { slope, intercept } = tangentAt((x) => x * x, 2);
    expect(slope).toBeCloseTo(4, 6);
    expect(intercept).toBeCloseTo(-4, 5);
    // 接点 (2,4) を通る
    expect(slope * 2 + intercept).toBeCloseTo(4, 5);
  });
});

describe("riemannRects / riemannSum", () => {
  it("短冊は n 本、底辺の総和が区間幅", () => {
    const rects = riemannRects((x) => x, 0, 2, 4, "mid");
    expect(rects).toHaveLength(4);
    const width = rects.reduce((s, r) => s + (r.x1 - r.x0), 0);
    expect(width).toBeCloseTo(2, 12);
  });
  it("中点則は ∫₀¹ x² dx = 1/3 に収束する", () => {
    const f = (x: number) => x * x;
    const coarse = riemannSum(f, 0, 1, 2, "mid");
    const fine = riemannSum(f, 0, 1, 100, "mid");
    expect(Math.abs(fine - 1 / 3)).toBeLessThan(Math.abs(coarse - 1 / 3));
    expect(fine).toBeCloseTo(1 / 3, 4);
  });
  it("左端則は増加関数で過小評価、右端則で過大評価", () => {
    const f = (x: number) => x; // ∫₀¹ = 0.5
    expect(riemannSum(f, 0, 1, 4, "left")).toBeLessThan(0.5);
    expect(riemannSum(f, 0, 1, 4, "right")).toBeGreaterThan(0.5);
  });
});

describe("trapezoidSum", () => {
  it("1次関数は台形則で厳密", () => {
    // ∫₀² (2x+1) dx = [x²+x]₀² = 6
    expect(trapezoidSum((x) => 2 * x + 1, 0, 2, 1)).toBeCloseTo(6, 12);
  });
  it("∫₀¹ x² dx = 1/3 に収束", () => {
    expect(trapezoidSum((x) => x * x, 0, 1, 200)).toBeCloseTo(1 / 3, 4);
  });
});
