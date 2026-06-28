import { describe, expect, it } from "vitest";
import { buildThreeTestFrames } from "./frames";

describe("buildThreeTestFrames", () => {
  const frames = buildThreeTestFrames({ xbar: 0.5, mu0: 0, sigma: 1, n: 16 });

  it("3検定のフレーム（wald/score/lrt）", () => {
    expect(frames).toHaveLength(3);
    expect(frames.map((f) => f.payload?.kind)).toEqual(["wald", "score", "lrt"]);
  });

  it("正規モデルでは3検定の統計量が一致（z²）", () => {
    const vals = frames.map((f) => f.payload?.value);
    expect(vals[0]).toBeCloseTo(vals[1] as number, 12);
    expect(vals[1]).toBeCloseTo(vals[2] as number, 12);
    // z=(0.5-0)/(1/4)=2 → z²=4
    expect(vals[0]).toBeCloseTo(4, 12);
  });

  it("各フレームにハイライト", () => {
    expect(frames[0].highlights).toContain("test-wald");
    expect(frames[2].highlights).toContain("test-lrt");
  });
});
