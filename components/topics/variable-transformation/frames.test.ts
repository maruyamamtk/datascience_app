import { describe, expect, it } from "vitest";
import { convolve, fairDie } from "@/lib/stats/transform";
import { buildConvolutionFrames } from "./frames";

describe("buildConvolutionFrames", () => {
  const conv = convolve(fairDie(6), fairDie(6));
  const frames = buildConvolutionFrames(conv, 6);

  it("和 2..12 の 11 フレーム", () => {
    expect(frames).toHaveLength(11);
    expect(frames[0].payload?.sum).toBe(2);
    expect(frames[10].payload?.sum).toBe(12);
  });

  it("和7のフレームは6通りの組を列挙し最頻", () => {
    const f7 = frames[5].payload;
    expect(f7?.sum).toBe(7);
    expect(f7?.pairs).toHaveLength(6);
    expect(f7?.prob).toBeCloseTo(6 / 36, 12);
  });

  it("端（和2・和12）は1通り", () => {
    expect(frames[0].payload?.pairs).toHaveLength(1);
    expect(frames[10].payload?.pairs).toHaveLength(1);
  });

  it("各フレームにセルのハイライト", () => {
    frames.forEach((fr, k) => expect(fr.highlights).toContain(`cell-${k}`));
  });
});
