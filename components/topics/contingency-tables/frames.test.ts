import { describe, expect, it } from "vitest";
import { buildIndependenceFrames, DEMO_TABLE } from "./frames";
import { chiSquareStatistic, grandTotal } from "@/lib/stats/contingency";

describe("buildIndependenceFrames", () => {
  const frames = buildIndependenceFrames();

  it("5段階（観測→周辺和→期待→寄与→判定）", () => {
    expect(frames.map((f) => f.payload?.stage)).toEqual([
      "observed",
      "marginals",
      "expected",
      "contributions",
      "decision",
    ]);
  });

  it("expected は stage=expected 以降で登場", () => {
    expect(frames[0].payload?.expected).toBeNull();
    expect(frames[1].payload?.expected).toBeNull();
    expect(frames[2].payload?.expected).not.toBeNull();
    expect(frames[4].payload?.expected).not.toBeNull();
  });

  it("contributions は stage=contributions 以降で登場", () => {
    expect(frames[2].payload?.contributions).toBeNull();
    expect(frames[3].payload?.contributions).not.toBeNull();
  });

  it("total は DEMO_TABLE の総和", () => {
    expect(frames[0].payload?.total).toBe(grandTotal(DEMO_TABLE));
  });

  it("chi2 は計算層と一致、df=2", () => {
    expect(frames[4].payload?.chi2).toBeCloseTo(chiSquareStatistic(DEMO_TABLE), 8);
    expect(frames[4].payload?.df).toBe(2);
  });

  it("この表は有意（p<0.05）", () => {
    expect(frames[4].payload?.pValue).toBeLessThan(0.05);
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
