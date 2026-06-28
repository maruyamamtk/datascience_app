import { describe, expect, it } from "vitest";
import { covariance2, eigenDecomposition2, generateCorrelatedData } from "@/lib/stats/pca";
import { mulberry32 } from "@/lib/stats/random";
import { buildMaxVarianceFrames } from "./frames";

describe("buildMaxVarianceFrames", () => {
  const points = generateCorrelatedData({
    n: 200,
    corr: 0.85,
    sx: 2.4,
    sy: 1.1,
    rng: mulberry32(5),
  });
  const [pc1] = eigenDecomposition2(covariance2(points));
  const frames = buildMaxVarianceFrames(points, 19, pc1.angle);

  it("steps ぶんのフレーム", () => {
    expect(frames).toHaveLength(19);
  });

  it("ちょうど1つの isBest フレームがある", () => {
    expect(frames.filter((f) => f.payload?.isBest).length).toBe(1);
  });

  it("最大分散フレームの分散は第1主成分の固有値に近い", () => {
    const best = frames.find((f) => f.payload?.isBest)!;
    // 19分割の格子なので緩い許容。
    expect(best.payload!.variance).toBeGreaterThan(pc1.eigenvalue * 0.9);
  });

  it("最大分散の角度は第1主成分の角度に近い（mod π）", () => {
    const best = frames.find((f) => f.payload?.isBest)!;
    const norm = (a: number) => ((a % Math.PI) + Math.PI) % Math.PI;
    const diff = Math.abs(norm(best.payload!.angle) - norm(pc1.angle));
    const d = Math.min(diff, Math.PI - diff);
    expect(d).toBeLessThan(0.2); // 約11°以内
  });
});
