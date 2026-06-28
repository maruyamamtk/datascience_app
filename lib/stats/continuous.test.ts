import { describe, expect, it } from "vitest";
import {
  CONTINUOUS_SPECS,
  betaPdf,
  continuousCurve,
  exponentialPdf,
  gammaFn,
  gammaPdf,
  halfNormalPdf,
  lnGamma,
  lognormalPdf,
} from "./continuous";

// 台形則で密度を積分（総和≈1 の確認用）。
function integrate(f: (x: number) => number, lo: number, hi: number, n = 4000): number {
  const h = (hi - lo) / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const x = lo + i * h;
    const w = i === 0 || i === n ? 0.5 : 1;
    s += w * f(x);
  }
  return s * h;
}

describe("gamma 関数", () => {
  it("Γ(1)=1, Γ(5)=4!=24, Γ(1/2)=√π", () => {
    expect(gammaFn(1)).toBeCloseTo(1, 8);
    expect(gammaFn(5)).toBeCloseTo(24, 6);
    expect(gammaFn(0.5)).toBeCloseTo(Math.sqrt(Math.PI), 8);
  });
  it("lnΓ(10)=ln(9!)", () => {
    expect(lnGamma(10)).toBeCloseTo(Math.log(362880), 8);
  });
});

describe("各 PDF は総和≈1（台形則）", () => {
  it("指数 Exp(λ=1)", () => {
    expect(integrate((x) => exponentialPdf(x, 1), 0, 40)).toBeCloseTo(1, 3);
  });
  it("ガンマ Gamma(k=3,θ=1)", () => {
    expect(integrate((x) => gammaPdf(x, 3, 1), 0, 40)).toBeCloseTo(1, 3);
  });
  it("ベータ Beta(2,3)", () => {
    expect(integrate((x) => betaPdf(x, 2, 3), 0, 1)).toBeCloseTo(1, 3);
  });
  it("対数正規 LogN(0,1)", () => {
    expect(integrate((x) => lognormalPdf(x, 0, 1), 0, 80)).toBeCloseTo(1, 2);
  });
  it("半正規 σ=1", () => {
    expect(integrate((x) => halfNormalPdf(x, 1), 0, 30)).toBeCloseTo(1, 3);
  });
});

describe("理論平均・分散", () => {
  it("指数: 平均=1/λ, 分散=1/λ²", () => {
    const pr = { lambda: 2, k: 3, theta: 1, mu: 0, sigma: 1 };
    expect(CONTINUOUS_SPECS.exponential.mean(pr)).toBeCloseTo(0.5, 12);
    expect(CONTINUOUS_SPECS.exponential.variance(pr)).toBeCloseTo(0.25, 12);
  });
  it("ガンマ: 平均=kθ, 分散=kθ²", () => {
    const pr = { lambda: 2, k: 3, theta: 2, mu: 0, sigma: 1 };
    expect(CONTINUOUS_SPECS.gamma.mean(pr)).toBeCloseTo(6, 12);
    expect(CONTINUOUS_SPECS.gamma.variance(pr)).toBeCloseTo(12, 12);
  });
  it("ベータ: 平均=α/(α+β)", () => {
    const pr = { lambda: 2, k: 2, theta: 3, mu: 0, sigma: 1 };
    expect(CONTINUOUS_SPECS.beta.mean(pr)).toBeCloseTo(0.4, 12);
  });
  it("コーシー: 平均・分散は存在しない（NaN）", () => {
    const pr = { lambda: 1, k: 1, theta: 1, mu: 0, sigma: 1 };
    expect(CONTINUOUS_SPECS.cauchy.mean(pr)).toBeNaN();
    expect(CONTINUOUS_SPECS.cauchy.variance(pr)).toBeNaN();
  });
  it("半正規: 平均=σ√(2/π)", () => {
    const pr = { lambda: 1, k: 1, theta: 1, mu: 0, sigma: 2 };
    expect(CONTINUOUS_SPECS.halfNormal.mean(pr)).toBeCloseTo(2 * Math.sqrt(2 / Math.PI), 12);
  });
});

describe("ガンマ k=1 は指数分布に一致", () => {
  it("Gamma(1,θ) = Exp(1/θ)", () => {
    for (const x of [0.5, 1, 2, 4]) {
      expect(gammaPdf(x, 1, 2)).toBeCloseTo(exponentialPdf(x, 0.5), 10);
    }
  });
});

describe("continuousCurve", () => {
  it("レンジ内のサンプル点を返し、非有限は0に丸める", () => {
    const c = continuousCurve("beta", { lambda: 1, k: 0.5, theta: 0.5, mu: 0, sigma: 1 });
    expect(c.length).toBe(161);
    expect(c.every((p) => Number.isFinite(p.y))).toBe(true);
  });
});
