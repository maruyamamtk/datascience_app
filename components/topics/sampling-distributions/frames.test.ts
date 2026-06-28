import { describe, expect, it } from "vitest";
import { buildTtoNormalFrames } from "./frames";

describe("buildTtoNormalFrames", () => {
  const frames = buildTtoNormalFrames([1, 3, 10, 30, 200]);

  it("自由度リストぶんのフレーム", () => {
    expect(frames).toHaveLength(5);
    expect(frames.map((f) => f.payload?.nu)).toEqual([1, 3, 10, 30, 200]);
  });

  it("ν が増えると中心の差は単調に縮む", () => {
    const gaps = frames.map((f) => f.payload?.centerGap ?? 1);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThanOrEqual(gaps[i - 1]);
  });

  it("最終フレーム（ν大）は標準正規にほぼ一致", () => {
    expect(frames[4].payload?.centerGap ?? 1).toBeLessThan(0.002);
  });

  it("各フレームに ν のハイライト", () => {
    frames.forEach((f, i) => expect(f.highlights).toContain(`nu-${[1, 3, 10, 30, 200][i]}`));
  });
});
