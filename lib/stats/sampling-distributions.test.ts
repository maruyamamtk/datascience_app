import { describe, expect, it } from "vitest";
import { normalPdf } from "./normal";
import { SAMPLING_SPECS, chiSquarePdf, fPdf, samplingCurve, tPdf } from "./sampling-distributions";

function integrate(f: (x: number) => number, lo: number, hi: number, n = 6000): number {
  const h = (hi - lo) / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const x = lo + i * h;
    const w = i === 0 || i === n ? 0.5 : 1;
    s += w * f(x);
  }
  return s * h;
}

describe("各 PDF は総和≈1（台形則）", () => {
  it("t(ν=5)", () => {
    expect(integrate((x) => tPdf(x, 5), -40, 40)).toBeCloseTo(1, 3);
  });
  it("χ²(k=4)", () => {
    expect(integrate((x) => chiSquarePdf(x, 4), 0, 80)).toBeCloseTo(1, 3);
  });
  it("F(5,10)", () => {
    expect(integrate((x) => fPdf(x, 5, 10), 0, 200)).toBeCloseTo(1, 2);
  });
});

describe("t 分布", () => {
  it("対称で t(x)=t(-x)", () => {
    expect(tPdf(1.3, 7)).toBeCloseTo(tPdf(-1.3, 7), 12);
  });
  it("自由度を上げると標準正規に近づく（ν=500, x=1）", () => {
    expect(tPdf(1, 500)).toBeCloseTo(normalPdf(1, 0, 1), 3);
    // 低自由度では一致しない（裾が重い）ことも確認。
    expect(Math.abs(tPdf(1, 3) - normalPdf(1, 0, 1))).toBeGreaterThan(0.005);
  });
  it("低自由度は正規より裾が重い（中心は低い）", () => {
    expect(tPdf(0, 3)).toBeLessThan(normalPdf(0, 0, 1));
    expect(tPdf(3, 3)).toBeGreaterThan(normalPdf(3, 0, 1));
  });
});

describe("カイ二乗分布", () => {
  it("平均=k, 分散=2k", () => {
    const pr = { df1: 6, df2: 10 };
    expect(SAMPLING_SPECS.chiSquare.mean(pr)).toBe(6);
    expect(SAMPLING_SPECS.chiSquare.variance(pr)).toBe(12);
  });
});

describe("F 分布", () => {
  it("平均は d2/(d2-2)（d2>2）", () => {
    const pr = { df1: 5, df2: 10 };
    expect(SAMPLING_SPECS.f.mean(pr)).toBeCloseTo(10 / 8, 12);
  });
  it("d2≤2 は平均が存在しない（NaN）", () => {
    expect(SAMPLING_SPECS.f.mean({ df1: 5, df2: 2 })).toBeNaN();
  });
});

describe("t 分布のモーメント存在条件", () => {
  it("ν≤1 は平均なし、ν≤2 は分散なし", () => {
    expect(SAMPLING_SPECS.t.mean({ df1: 1, df2: 1 })).toBeNaN();
    expect(SAMPLING_SPECS.t.variance({ df1: 2, df2: 1 })).toBeNaN();
    expect(SAMPLING_SPECS.t.variance({ df1: 5, df2: 1 })).toBeCloseTo(5 / 3, 12);
  });
});

describe("samplingCurve", () => {
  it("点列を返し非有限を0に丸める", () => {
    const c = samplingCurve("f", { df1: 1, df2: 1 });
    expect(c.length).toBe(161);
    expect(c.every((p) => Number.isFinite(p.y))).toBe(true);
  });
});
