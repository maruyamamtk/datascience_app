import { describe, expect, it } from "vitest";
import type { SimInterval } from "@/lib/stats/interval";
import { buildCoverageFrames } from "./frames";

const iv = (lower: number, upper: number, contains: boolean): SimInterval => ({
  lower,
  upper,
  mean: (lower + upper) / 2,
  contains,
});

describe("buildCoverageFrames", () => {
  const intervals = [iv(-1, 1, true), iv(2, 3, false), iv(-2, 0.5, true), iv(0.2, 4, true)];

  it("区間 1 本につき 1 フレームを作る", () => {
    const frames = buildCoverageFrames(intervals, 0.95);
    expect(frames).toHaveLength(4);
  });

  it("各フレームで revealed が 1 本ずつ増える", () => {
    const frames = buildCoverageFrames(intervals, 0.95);
    expect(frames[0].payload?.revealed).toHaveLength(1);
    expect(frames[3].payload?.revealed).toHaveLength(4);
    expect(frames[2].payload?.latest).toEqual(intervals[2]);
  });

  it("hits と被覆率 rate が累積で正しい", () => {
    const frames = buildCoverageFrames(intervals, 0.95);
    // contains の並び: true, false, true, true → 累積 hits = 1,1,2,3
    expect(frames.map((f) => f.payload?.hits)).toEqual([1, 1, 2, 3]);
    expect(frames[0].payload?.rate).toBeCloseTo(1, 12);
    expect(frames[1].payload?.rate).toBeCloseTo(0.5, 12);
    expect(frames[3].payload?.rate).toBeCloseTo(0.75, 12);
  });

  it("いま提示した区間をハイライトする", () => {
    const frames = buildCoverageFrames(intervals, 0.95);
    expect(frames[1].highlights).toEqual(["ci-1"]);
  });

  it("含む/外すでコールアウト種別が変わる", () => {
    const frames = buildCoverageFrames(intervals, 0.95);
    expect(frames[0].callout?.kind).toBe("supplement"); // 含む
    expect(frames[1].callout?.kind).toBe("explain"); // 外す
  });

  it("空配列なら空のフレーム列", () => {
    expect(buildCoverageFrames([], 0.95)).toEqual([]);
  });
});
