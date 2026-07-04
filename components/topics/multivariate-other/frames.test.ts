import { describe, expect, it } from "vitest";
import { distanceMatrix } from "@/lib/stats/mds";
import { TRUE_CITIES } from "@/lib/store/multivariate-other";
import { buildMdsFrames } from "./frames";

describe("buildMdsFrames", () => {
  const D = distanceMatrix(TRUE_CITIES.map((c) => c.point));
  const frames = buildMdsFrames(D);

  it("3フレーム（距離のみ→1D→2D）", () => {
    expect(frames).toHaveLength(3);
    expect(frames.map((f) => f.payload?.dim)).toEqual([0, 1, 2]);
  });

  it("2次元復元のストレスは1次元より小さい", () => {
    const s1 = frames[1].payload?.stress ?? 1;
    const s2 = frames[2].payload?.stress ?? 1;
    expect(s2).toBeLessThan(s1);
  });

  it("2次元復元は歪みなしならストレス≈0", () => {
    expect(frames[2].payload?.stress ?? 1).toBeLessThan(1e-6);
  });

  it("復元座標の次元が段階と一致", () => {
    expect(frames[1].payload?.coords[0].length).toBe(1);
    expect(frames[2].payload?.coords[0].length).toBe(2);
  });
});
