import { describe, expect, it } from "vitest";
import {
  absError,
  bisect1D,
  centralDiff,
  classifyRegime,
  diffErrorScan,
  forwardDiff,
  linspace,
  MACHINE_EPS,
  optimalStep,
  relError,
  roundingError,
  simpson,
  trapezoid,
  truncationError,
} from "./numerical-computation";

// テスト対象: f(x)=sin x（f'(x)=cos x）を x=1 で数値微分。真値 cos(1)。
const f = Math.sin;
const X = 1;
const EXACT = Math.cos(1);

describe("計算機イプシロン", () => {
  it("倍精度の ε は 2⁻⁵² ≈ 2.22e-16", () => {
    expect(MACHINE_EPS).toBeCloseTo(2.220446e-16, 20);
    // «1 に足しても変わらない» 境目に近い量。ε/2 より大きい摂動は 1 を動かす。
    expect(1 + MACHINE_EPS).toBeGreaterThan(1);
  });
});

describe("数値微分", () => {
  it("前進差分は適度な h で真値に近い", () => {
    expect(forwardDiff(f, X, 1e-6)).toBeCloseTo(EXACT, 5);
  });
  it("中心差分は同じ h で前進差分より高精度（O(h²)）", () => {
    const h = 1e-4;
    const eCentral = absError(centralDiff(f, X, h), EXACT);
    const eForward = absError(forwardDiff(f, X, h), EXACT);
    expect(eCentral).toBeLessThan(eForward);
  });
  it("中心差分の誤差は h を 1/10 にすると約 1/100（2 次）", () => {
    const e1 = absError(centralDiff(f, X, 1e-2), EXACT);
    const e2 = absError(centralDiff(f, X, 1e-3), EXACT);
    // O(h²) なので比はおよそ 100。丸め誤差が効かない領域で確認。
    expect(e1 / e2).toBeGreaterThan(50);
    expect(e1 / e2).toBeLessThan(200);
  });
});

describe("絶対誤差 / 相対誤差", () => {
  it("absError = |approx − exact|", () => {
    expect(absError(2.1, 2)).toBeCloseTo(0.1, 12);
  });
  it("relError は真値で割る（exact=0 は絶対誤差）", () => {
    expect(relError(102, 100)).toBeCloseTo(0.02, 12);
    expect(relError(0.3, 0)).toBeCloseTo(0.3, 12);
  });
});

describe("誤差モデルと最適刻み幅", () => {
  it("打ち切り誤差は h² に比例、丸め誤差は 1/h に比例", () => {
    expect(truncationError(2e-2, 1) / truncationError(1e-2, 1)).toBeCloseTo(4, 6);
    expect(roundingError(1e-2, 1) / roundingError(2e-2, 1)).toBeCloseTo(2, 6);
  });
  it("最適刻み幅 h* は ε^{1/3} のオーダー（中心差分）", () => {
    const hOpt = optimalStep(Math.sin(1), -Math.cos(1));
    // ε^{1/3} ≈ 6e-6。オーダーが合っていること。
    expect(hOpt).toBeGreaterThan(1e-6);
    expect(hOpt).toBeLessThan(1e-4);
  });
  it("h* 近傍が実際に誤差最小になっている", () => {
    const hOpt = optimalStep(Math.sin(1), -Math.cos(1));
    const errAt = (h: number) => absError(centralDiff(f, X, h), EXACT);
    // 大きすぎ（打ち切り優勢）・小さすぎ（丸め優勢）より h* 近傍が小さい。
    expect(errAt(hOpt)).toBeLessThan(errAt(hOpt * 1000));
    expect(errAt(hOpt)).toBeLessThan(errAt(hOpt / 1000));
  });
});

describe("誤差領域の判定", () => {
  const hOpt = 1e-5;
  it("大きい h は打ち切り優勢、小さい h は丸め優勢、近傍は最適", () => {
    expect(classifyRegime(1e-2, hOpt)).toBe("truncation");
    expect(classifyRegime(1e-8, hOpt)).toBe("rounding");
    expect(classifyRegime(2e-5, hOpt)).toBe("optimal");
  });
});

describe("誤差スキャン（U 字）", () => {
  it("log₁₀h を等分し、最小誤差が両端より内側に来る", () => {
    const pts = diffErrorScan(f, X, EXACT, -12, 0, 40);
    expect(pts).toHaveLength(40);
    expect(pts[0].logh).toBeCloseTo(-12, 12);
    expect(pts[pts.length - 1].logh).toBeCloseTo(0, 12);
    // 最小誤差の点は両端のどちらでもない（谷が中にある = U 字）。
    let minI = 0;
    for (let i = 1; i < pts.length; i++) if (pts[i].err < pts[minI].err) minI = i;
    expect(minI).toBeGreaterThan(0);
    expect(minI).toBeLessThan(pts.length - 1);
  });
});

describe("二分法", () => {
  // f(x)=x²−2 の根 √2≈1.41421 を [1,2] で挟み撃ち。
  const g = (x: number) => x * x - 2;
  it("区間列は iters+1 本で、幅が毎回半分になる", () => {
    const bs = bisect1D(g, 1, 2, 10);
    expect(bs).toHaveLength(11);
    expect(bs[0].width).toBeCloseTo(1, 12);
    for (let i = 1; i < bs.length; i++) {
      expect(bs[i].width).toBeCloseTo(bs[i - 1].width / 2, 12);
    }
  });
  it("反復すると中点が √2 に収束する", () => {
    const bs = bisect1D(g, 1, 2, 40);
    expect(bs[bs.length - 1].mid).toBeCloseTo(Math.SQRT2, 8);
  });
  it("常に根を区間内に保つ（f(a)·f(b)≤0）", () => {
    const bs = bisect1D(g, 1, 2, 20);
    for (const b of bs) expect(g(b.a) * g(b.b)).toBeLessThanOrEqual(0);
  });
});

describe("数値積分", () => {
  // ∫_0^1 x² dx = 1/3。
  const sq = (x: number) => x * x;
  it("台形則は区間を増やすと 1/3 に近づく", () => {
    expect(trapezoid(sq, 0, 1, 100)).toBeCloseTo(1 / 3, 4);
  });
  it("シンプソン則は 2 次多項式を厳密に積分する", () => {
    // シンプソン則は 3 次以下の多項式を誤差 0 で積分できる。
    expect(simpson(sq, 0, 1, 2)).toBeCloseTo(1 / 3, 12);
  });
  it("シンプソン則は台形則より高精度（∫₀^π sin=2）", () => {
    const eTrap = Math.abs(trapezoid(Math.sin, 0, Math.PI, 8) - 2);
    const eSimp = Math.abs(simpson(Math.sin, 0, Math.PI, 8) - 2);
    expect(eSimp).toBeLessThan(eTrap);
  });
});

describe("linspace", () => {
  it("端点を含み n 等分する", () => {
    expect(linspace(0, 1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});
