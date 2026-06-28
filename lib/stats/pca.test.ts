import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random";
import {
  covariance2,
  eigenDecomposition2,
  explainedVarianceRatio,
  generateCorrelatedData,
  projectToPC,
  type Point2,
} from "./pca";

describe("covariance2", () => {
  it("既知データの共分散", () => {
    const pts: Point2[] = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
    ];
    const c = covariance2(pts);
    // x:1,2,3 var=1, y:2,4,6 var=4, cov=2（完全相関）
    expect(c.sxx).toBeCloseTo(1, 10);
    expect(c.syy).toBeCloseTo(4, 10);
    expect(c.sxy).toBeCloseTo(2, 10);
  });
});

describe("eigenDecomposition2", () => {
  it("対角行列の固有値は対角成分（降順）、固有ベクトルは軸", () => {
    const [pc1, pc2] = eigenDecomposition2({ sxx: 4, syy: 1, sxy: 0 });
    expect(pc1.eigenvalue).toBeCloseTo(4, 10);
    expect(pc2.eigenvalue).toBeCloseTo(1, 10);
    expect(Math.abs(pc1.vector[0])).toBeCloseTo(1, 10); // x 軸方向
    expect(Math.abs(pc1.vector[1])).toBeCloseTo(0, 10);
  });

  it("固有ベクトルは単位ベクトルで直交する", () => {
    const [pc1, pc2] = eigenDecomposition2({ sxx: 3, syy: 2, sxy: 1.5 });
    expect(Math.hypot(...pc1.vector)).toBeCloseTo(1, 10);
    expect(Math.hypot(...pc2.vector)).toBeCloseTo(1, 10);
    const dot = pc1.vector[0] * pc2.vector[0] + pc1.vector[1] * pc2.vector[1];
    expect(dot).toBeCloseTo(0, 8);
  });

  it("固有値の和=トレース、積=行列式", () => {
    const cov = { sxx: 3, syy: 5, sxy: 1.2 };
    const [pc1, pc2] = eigenDecomposition2(cov);
    expect(pc1.eigenvalue + pc2.eigenvalue).toBeCloseTo(cov.sxx + cov.syy, 10);
    expect(pc1.eigenvalue * pc2.eigenvalue).toBeCloseTo(cov.sxx * cov.syy - cov.sxy ** 2, 10);
  });

  it("第1主成分の固有値が第2以上", () => {
    const [pc1, pc2] = eigenDecomposition2({ sxx: 2, syy: 8, sxy: 2 });
    expect(pc1.eigenvalue).toBeGreaterThanOrEqual(pc2.eigenvalue);
  });
});

describe("explainedVarianceRatio", () => {
  it("寄与率の和は1、降順", () => {
    const pcs = eigenDecomposition2({ sxx: 9, syy: 1, sxy: 0 });
    const r = explainedVarianceRatio(pcs);
    expect(r[0] + r[1]).toBeCloseTo(1, 10);
    expect(r[0]).toBeCloseTo(0.9, 10);
  });
});

describe("projectToPC", () => {
  it("射影スコアの分散は固有値に一致", () => {
    const pts = generateCorrelatedData({ n: 500, corr: 0.8, sx: 2, sy: 1, rng: mulberry32(1) });
    const cov = covariance2(pts);
    const [pc1] = eigenDecomposition2(cov);
    const scores = projectToPC(pts, pc1);
    const m = scores.reduce((a, b) => a + b, 0) / scores.length;
    const v = scores.reduce((a, b) => a + (b - m) ** 2, 0) / (scores.length - 1);
    expect(v).toBeCloseTo(pc1.eigenvalue, 5);
  });
});

describe("generateCorrelatedData", () => {
  it("相関が高いと第1主成分の寄与率が大きい", () => {
    const hi = generateCorrelatedData({ n: 600, corr: 0.95, sx: 1, sy: 1, rng: mulberry32(2) });
    const lo = generateCorrelatedData({ n: 600, corr: 0.1, sx: 1, sy: 1, rng: mulberry32(2) });
    const rHi = explainedVarianceRatio(eigenDecomposition2(covariance2(hi)))[0];
    const rLo = explainedVarianceRatio(eigenDecomposition2(covariance2(lo)))[0];
    expect(rHi).toBeGreaterThan(rLo);
  });
});
