import { describe, expect, it } from "vitest";
import type { NetParams } from "@/lib/stats/neural-network-basics";
import { buildBackpropFrames } from "./frames";

const PARAMS: NetParams = {
  w1: [
    [0.5, -0.3],
    [0.4, 0.6],
  ],
  b1: [0.1, -0.2],
  w2: [0.8, -0.5],
  b2: 0.05,
};

describe("buildBackpropFrames", () => {
  const frames = buildBackpropFrames(1, 0.5, 1, "sigmoid", PARAMS);

  it("順伝播5コマ + 逆伝播4コマ = 9コマを返す", () => {
    expect(frames).toHaveLength(9);
    expect(frames.filter((f) => f.payload?.phase === "forward")).toHaveLength(5);
    expect(frames.filter((f) => f.payload?.phase === "backward")).toHaveLength(4);
  });

  it("前半5コマはforward、後半4コマはbackward の順に並ぶ", () => {
    const phases = frames.map((f) => f.payload?.phase);
    expect(phases).toEqual([
      "forward",
      "forward",
      "forward",
      "forward",
      "forward",
      "backward",
      "backward",
      "backward",
      "backward",
    ]);
  });

  it("全フレームに highlights と callout がある", () => {
    for (const f of frames) {
      expect(f.highlights && f.highlights.length).toBeGreaterThan(0);
      expect(f.callout?.body).toBeTruthy();
    }
  });

  it("最初のフレームは入力ノードだけをハイライトする", () => {
    expect(frames[0].highlights).toEqual(["x0", "x1"]);
  });

  it("最後のフレームは入力層の重み勾配（callout本文にW1という語）を含む", () => {
    expect(frames[8].callout?.body).toContain("W1");
  });

  it("活性化関数を変えると隠れ層の値（コールアウト本文）が変わる", () => {
    const sigFrames = buildBackpropFrames(1, 0.5, 1, "sigmoid", PARAMS);
    const reluFrames = buildBackpropFrames(1, 0.5, 1, "relu", PARAMS);
    expect(sigFrames[1].callout?.body).not.toBe(reluFrames[1].callout?.body);
  });
});
