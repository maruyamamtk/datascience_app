import { describe, expect, it } from "vitest";
import { silvermanBandwidth } from "@/lib/stats/kde";
import { KDE_DATA } from "@/lib/store/kernel-density-estimation";
import { buildBandwidthFrames } from "./frames";

describe("buildBandwidthFrames", () => {
  const silverman = silvermanBandwidth(KDE_DATA);
  // 小→大に広く振る（真の二峰性の最適は内側のどこか）。
  const bandwidths = [0.05, 0.15, 0.3, 0.5, 0.8, 1.5, 3];
  const frames = buildBandwidthFrames(KDE_DATA, bandwidths, silverman);

  it("帯域幅ぶんのフレーム", () => {
    expect(frames).toHaveLength(bandwidths.length);
  });

  it("ちょうど1つの good（ISE最小）フレームがあり、内側にある", () => {
    const goodIdx = frames.findIndex((f) => f.payload?.regime === "good");
    expect(frames.filter((f) => f.payload?.regime === "good")).toHaveLength(1);
    expect(goodIdx).toBeGreaterThan(0);
    expect(goodIdx).toBeLessThan(frames.length - 1);
  });

  it("good フレームの ISE が全体で最小", () => {
    const good = frames.find((f) => f.payload?.regime === "good")!;
    const minIse = Math.min(...frames.map((f) => f.payload!.ise));
    expect(good.payload!.ise).toBeCloseTo(minIse, 12);
  });

  it("最小より小さい帯域幅は under、大きいは over", () => {
    const goodIdx = frames.findIndex((f) => f.payload?.regime === "good");
    expect(frames[goodIdx - 1].payload?.regime).toBe("under");
    expect(frames[goodIdx + 1].payload?.regime).toBe("over");
  });

  it("各フレームに KDE 曲線と curve ハイライト", () => {
    frames.forEach((f) => {
      expect(f.payload?.curve.length ?? 0).toBeGreaterThan(10);
      expect(f.highlights).toContain("curve");
    });
  });
});
