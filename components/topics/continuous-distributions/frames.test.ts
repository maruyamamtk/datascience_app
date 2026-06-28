import { describe, expect, it } from "vitest";
import { exponentialPdf } from "@/lib/stats/continuous";
import { buildGammaFrames } from "./frames";

describe("buildGammaFrames", () => {
  const frames = buildGammaFrames(1, 5);

  it("k=1..maxK のフレーム", () => {
    expect(frames).toHaveLength(5);
    expect(frames.map((f) => f.payload?.k)).toEqual([1, 2, 3, 4, 5]);
  });

  it("平均は kθ で単調増加", () => {
    const means = frames.map((f) => f.payload?.mean ?? 0);
    expect(means).toEqual([1, 2, 3, 4, 5]);
  });

  it("k=1 のガンマは指数分布（x=0 付近が最大）", () => {
    const c = frames[0].payload?.curve ?? [];
    // 単調減少（指数）なので先頭が最大付近
    expect(c[0].y).toBeGreaterThan(c[c.length - 1].y);
    // 値が指数 Exp(λ=1/θ=1) と整合（x≈1）
    const near1 = c.reduce((best, p) => (Math.abs(p.x - 1) < Math.abs(best.x - 1) ? p : best));
    expect(near1.y).toBeCloseTo(exponentialPdf(near1.x, 1), 1);
  });

  it("各フレームに k のハイライト", () => {
    frames.forEach((f, i) => expect(f.highlights).toContain(`k-${i + 1}`));
  });
});
