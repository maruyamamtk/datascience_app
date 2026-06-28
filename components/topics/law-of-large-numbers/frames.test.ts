import { describe, expect, it } from "vitest";
import { buildNormalApproxFrames } from "./frames";

describe("buildNormalApproxFrames", () => {
  const frames = buildNormalApproxFrames(0.5, [5, 10, 30, 100]);

  it("n のリストぶんフレームを作る", () => {
    expect(frames).toHaveLength(4);
    expect(frames.map((f) => f.payload?.n)).toEqual([5, 10, 30, 100]);
  });

  it("n が増えると CDF 近似の最大誤差は小さくなる", () => {
    const errs = frames.map((f) => f.payload?.maxError ?? 1);
    for (let i = 1; i < errs.length; i++) expect(errs[i]).toBeLessThanOrEqual(errs[i - 1]);
  });

  it("μ=np, σ=√(np(1-p))", () => {
    const f = frames[2].payload; // n=30
    expect(f?.mu).toBeCloseTo(15, 12);
    expect(f?.sigma).toBeCloseTo(Math.sqrt(30 * 0.5 * 0.5), 12);
  });

  it("PMF は確率（総和≈1）", () => {
    const sum = (frames[1].payload?.pmf ?? []).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});
