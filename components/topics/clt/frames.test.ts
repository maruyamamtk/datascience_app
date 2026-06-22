import { describe, expect, it } from "vitest";
import { buildDrawFrames } from "./frames";

describe("buildDrawFrames", () => {
  it("観測 1 つにつき 1 フレームを作る", () => {
    const frames = buildDrawFrames([2, 4, 6]);
    expect(frames).toHaveLength(3);
  });

  it("各フレームで revealed が 1 つずつ増え、暫定平均が正しい", () => {
    const frames = buildDrawFrames([2, 4, 6]);
    expect(frames[0].payload?.revealed).toEqual([2]);
    expect(frames[0].payload?.partialMean).toBe(2);
    expect(frames[1].payload?.partialMean).toBe(3); // (2+4)/2
    expect(frames[2].payload?.partialMean).toBe(4); // (2+4+6)/3
    expect(frames[2].payload?.step).toBe(3);
  });

  it("いま引いた観測と平均項をハイライトする", () => {
    const frames = buildDrawFrames([1, 2]);
    expect(frames[1].highlights).toContain("obs-1");
    expect(frames[1].highlights).toContain("partial-mean");
  });

  it("最終フレームは explain で標本平均が点になることを述べる", () => {
    const frames = buildDrawFrames([1, 2, 3]);
    const last = frames[2];
    expect(last.callout?.kind).toBe("explain");
    expect(last.callout?.body).toContain("標本平均");
  });

  it("空入力では空配列", () => {
    expect(buildDrawFrames([])).toEqual([]);
  });
});
