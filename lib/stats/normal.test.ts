import { describe, expect, it } from "vitest";
import {
  areaWithin,
  deriveNormal,
  normalCdf,
  normalCurve,
  normalPdf,
  normalSample,
  standardize,
  standardNormalCdf,
  zQuantile,
} from "./normal";
import { mulberry32 } from "./random";

describe("normalPdf", () => {
  it("標準正規のピーク f(0)=1/√(2π)", () => {
    expect(normalPdf(0, 0, 1)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 10);
  });

  it("平均に関して対称", () => {
    expect(normalPdf(3, 5, 2)).toBeCloseTo(normalPdf(7, 5, 2), 12);
  });

  it("σ が小さいほどピークが高い（縮むと尖る）", () => {
    expect(normalPdf(5, 5, 1)).toBeGreaterThan(normalPdf(5, 5, 2));
  });

  it("sigma<=0 では 0", () => {
    expect(normalPdf(1, 0, 0)).toBe(0);
    expect(normalPdf(1, 0, -1)).toBe(0);
  });
});

describe("standardNormalCdf", () => {
  it("Φ(0)=0.5", () => {
    expect(standardNormalCdf(0)).toBe(0.5);
  });

  it("対称性 Φ(-z)=1-Φ(z)", () => {
    expect(standardNormalCdf(-1.3)).toBeCloseTo(1 - standardNormalCdf(1.3), 6);
  });

  it("既知の分位（標準正規表と一致）", () => {
    expect(standardNormalCdf(1)).toBeCloseTo(0.8413, 4);
    expect(standardNormalCdf(1.96)).toBeCloseTo(0.975, 4);
    expect(standardNormalCdf(2.576)).toBeCloseTo(0.995, 4);
  });

  it("単調増加", () => {
    expect(standardNormalCdf(0.5)).toBeGreaterThan(standardNormalCdf(0.4));
    expect(standardNormalCdf(2)).toBeGreaterThan(standardNormalCdf(1));
  });
});

describe("normalCdf", () => {
  it("一般の N(μ,σ²) は標準化と一致", () => {
    expect(normalCdf(7, 5, 2)).toBeCloseTo(standardNormalCdf(1), 10);
  });

  it("sigma<=0 はステップ関数", () => {
    expect(normalCdf(4, 5, 0)).toBe(0);
    expect(normalCdf(6, 5, 0)).toBe(1);
  });
});

describe("areaWithin（68-95-99.7 則）", () => {
  it("±1σ ≈ 0.6827", () => {
    expect(areaWithin(1)).toBeCloseTo(0.6827, 4);
  });
  it("±2σ ≈ 0.9545", () => {
    expect(areaWithin(2)).toBeCloseTo(0.9545, 4);
  });
  it("±3σ ≈ 0.9973", () => {
    expect(areaWithin(3)).toBeCloseTo(0.9973, 4);
  });
  it("k<=0 では 0", () => {
    expect(areaWithin(0)).toBe(0);
    expect(areaWithin(-1)).toBe(0);
  });
});

describe("standardize", () => {
  it("z=(x-μ)/σ", () => {
    expect(standardize(7, 5, 2)).toBe(1);
    expect(standardize(5, 5, 2)).toBe(0);
  });
  it("sigma<=0 では NaN", () => {
    expect(standardize(1, 0, 0)).toBeNaN();
  });
});

describe("deriveNormal", () => {
  it("分散 = σ²、±kσ 確率は 68-95-99.7", () => {
    const d = deriveNormal({ mu: 3, sigma: 2 });
    expect(d.variance).toBe(4);
    expect(d.p1).toBeCloseTo(0.6827, 4);
    expect(d.p2).toBeCloseTo(0.9545, 4);
    expect(d.p3).toBeCloseTo(0.9973, 4);
  });
  it("±kσ 確率は μ・σ に依存しない（スケール不変）", () => {
    const a = deriveNormal({ mu: 0, sigma: 1 });
    const b = deriveNormal({ mu: 100, sigma: 50 });
    expect(a.p1).toBeCloseTo(b.p1, 12);
    expect(a.p2).toBeCloseTo(b.p2, 12);
  });
});

describe("zQuantile（標準正規の分位点 = Φ の逆）", () => {
  it("既知の臨界値（標準正規表と一致）", () => {
    expect(zQuantile(0.5)).toBeCloseTo(0, 6);
    expect(zQuantile(0.975)).toBeCloseTo(1.95996, 4);
    expect(zQuantile(0.995)).toBeCloseTo(2.57583, 4);
    expect(zQuantile(0.95)).toBeCloseTo(1.64485, 4);
  });

  it("対称性 Φ⁻¹(1-p) = -Φ⁻¹(p)", () => {
    expect(zQuantile(0.025)).toBeCloseTo(-zQuantile(0.975), 5);
    expect(zQuantile(0.1)).toBeCloseTo(-zQuantile(0.9), 5);
  });

  it("standardNormalCdf の逆（往復で戻る）", () => {
    expect(standardNormalCdf(zQuantile(0.8))).toBeCloseTo(0.8, 4);
    expect(zQuantile(standardNormalCdf(1.23))).toBeCloseTo(1.23, 4);
  });

  it("単調増加・端点は ±∞", () => {
    expect(zQuantile(0.6)).toBeGreaterThan(zQuantile(0.55));
    expect(zQuantile(0)).toBe(-Infinity);
    expect(zQuantile(1)).toBe(Infinity);
  });
});

describe("normalSample（正規母集団からの 1 観測）", () => {
  it("同じシードなら再現する（決定的）", () => {
    const a = normalSample(5, 2, mulberry32(42));
    const b = normalSample(5, 2, mulberry32(42));
    expect(a).toBe(b);
  });

  it("多数の標本平均が μ に近づく（大数の法則の素朴な確認）", () => {
    const rng = mulberry32(123);
    const N = 5000;
    let sum = 0;
    for (let i = 0; i < N; i++) sum += normalSample(10, 3, rng);
    expect(sum / N).toBeCloseTo(10, 0);
  });
});

describe("normalCurve", () => {
  it("既定で 121 点・端点は μ±4σ", () => {
    const c = normalCurve(5, 2);
    expect(c).toHaveLength(121);
    expect(c[0].x).toBeCloseTo(5 - 8, 10);
    expect(c[c.length - 1].x).toBeCloseTo(5 + 8, 10);
  });

  it("点数とレンジを指定できる", () => {
    const c = normalCurve(0, 1, { min: -3, max: 3, points: 7 });
    expect(c).toHaveLength(7);
    expect(c[0].x).toBe(-3);
    expect(c[6].x).toBe(3);
    expect(c[3].x).toBeCloseTo(0, 10);
    expect(c[3].y).toBeCloseTo(normalPdf(0, 0, 1), 12);
  });

  it("sigma<=0 や points<2 では空配列", () => {
    expect(normalCurve(0, 0)).toEqual([]);
    expect(normalCurve(0, 1, { points: 1 })).toEqual([]);
  });
});
