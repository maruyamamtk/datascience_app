import { describe, expect, it } from "vitest";
import { buildConsistencyFrames } from "./frames";

describe("buildConsistencyFrames", () => {
  const frames = buildConsistencyFrames([5, 20, 100], 2, 1200);

  it("n のリストぶんフレーム", () => {
    expect(frames).toHaveLength(3);
    expect(frames.map((f) => f.payload?.n)).toEqual([5, 20, 100]);
  });

  it("n が増えると推定量の分散は小さくなる（一致性）", () => {
    const vars = frames.map((f) => f.payload?.variance ?? 1);
    expect(vars[1]).toBeLessThan(vars[0]);
    expect(vars[2]).toBeLessThan(vars[1]);
  });

  it("真値 σ² は 4", () => {
    expect(frames[0].payload?.trueVar).toBe(4);
  });

  it("各フレームにハイライト", () => {
    frames.forEach((f, i) => expect(f.highlights).toContain(`n-${[5, 20, 100][i]}`));
  });
});
