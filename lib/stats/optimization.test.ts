import { describe, expect, it } from "vitest";
import {
  classifyTrajectory,
  gdStep,
  gradientDescent1D,
  isDiverging,
  isOscillating,
  linspace,
  newton1D,
  newtonStep1D,
  sampleCurve,
} from "./optimization";

// テスト対象の凸2次関数 f(x)=½x²、f'(x)=x、f''(x)=1（最小点 x=0）。
const df = (x: number) => x;
const ddf = (_x: number) => 1;

describe("gdStep", () => {
  it("x_{k+1} = x − η·f'(x)", () => {
    // f'(x)=x なので x ← x(1−η)
    expect(gdStep(df, 2, 0.5)).toBeCloseTo(1, 12); // 2·(1−0.5)
    expect(gdStep(df, 2, 1)).toBeCloseTo(0, 12); // 1歩で最小点
    expect(gdStep(df, 2, 1.5)).toBeCloseTo(-1, 12); // 行き過ぎて反対側
  });
});

describe("gradientDescent1D", () => {
  it("軌跡は長さ steps+1 で x0 から始まる", () => {
    const xs = gradientDescent1D(df, 3, 0.5, 4);
    expect(xs).toHaveLength(5);
    expect(xs[0]).toBe(3);
  });
  it("小さい学習率 η=0.5 では単調に最小点 0 へ収束", () => {
    const xs = gradientDescent1D(df, 4, 0.5, 20);
    // x_k = 4·0.5^k → 0、常に正で単調減少
    expect(xs[xs.length - 1]).toBeCloseTo(0, 4);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeLessThan(xs[i - 1]);
    for (const x of xs) expect(x).toBeGreaterThanOrEqual(0);
  });
  it("学習率 η=1 では1歩でちょうど最小点に届く", () => {
    const xs = gradientDescent1D(df, 2.5, 1, 3);
    expect(xs[1]).toBeCloseTo(0, 12);
  });
  it("1<η<2 では符号を変えながら（振動しつつ）収束", () => {
    const xs = gradientDescent1D(df, 2, 1.5, 20);
    expect(xs[xs.length - 1]).toBeCloseTo(0, 3);
    // x ← x·(1−1.5)=x·(−0.5)：符号が交互
    expect(Math.sign(xs[1])).toBe(-Math.sign(xs[2]));
  });
  it("η>2 では発散する（誤差が増大）", () => {
    const xs = gradientDescent1D(df, 0.5, 2.2, 15);
    // x ← x·(−1.2)：絶対値が毎回 1.2 倍
    expect(Math.abs(xs[xs.length - 1])).toBeGreaterThan(Math.abs(xs[0]));
  });
});

describe("newtonStep1D / newton1D", () => {
  it("凸2次関数はニュートン法1歩で最小点へ届く", () => {
    // x − f'/f'' = x − x/1 = 0
    expect(newtonStep1D(df, ddf, 5)).toBeCloseTo(0, 12);
    const xs = newton1D(df, ddf, 5, 3);
    expect(xs[1]).toBeCloseTo(0, 12);
  });
  it("非2次関数でも2次収束で速く近づく（f(x)=x⁴/4, f'=x³, f''=3x²）", () => {
    const xs = newton1D((x) => x ** 3, (x) => 3 * x * x, 1, 8);
    expect(Math.abs(xs[xs.length - 1])).toBeLessThan(0.05);
    expect(Math.abs(xs[xs.length - 1])).toBeLessThan(Math.abs(xs[0]));
  });
});

describe("収束挙動の分類", () => {
  it("単調収束は converged", () => {
    const xs = gradientDescent1D(df, 4, 0.5, 20);
    expect(isDiverging(xs, 0)).toBe(false);
    expect(isOscillating(xs, 0)).toBe(false);
    expect(classifyTrajectory(xs, 0)).toBe("converged");
  });
  it("振動しながら収束は oscillating", () => {
    const xs = gradientDescent1D(df, 2, 1.5, 20);
    expect(isDiverging(xs, 0)).toBe(false);
    expect(isOscillating(xs, 0)).toBe(true);
    expect(classifyTrajectory(xs, 0)).toBe("oscillating");
  });
  it("発散は diverged", () => {
    const xs = gradientDescent1D(df, 0.5, 2.2, 15);
    expect(isDiverging(xs, 0)).toBe(true);
    expect(classifyTrajectory(xs, 0)).toBe("diverged");
  });
  it("非有限値は発散扱い", () => {
    expect(isDiverging([1, 10, Infinity], 0)).toBe(true);
  });
});

describe("linspace / sampleCurve", () => {
  it("端点を含み n 等分する", () => {
    expect(linspace(0, 1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
  it("関数値をサンプルする", () => {
    expect(sampleCurve((x) => x * x, 0, 2, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
    ]);
  });
});
