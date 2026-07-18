import { describe, expect, it } from "vitest";
import { ADABOOST_ROUNDS, buildAdaBoostFrames } from "./boosting-frames";

describe("buildAdaBoostFrames", () => {
  it("既定でADABOOST_ROUNDS個のフレームを返す", () => {
    const frames = buildAdaBoostFrames();
    expect(frames).toHaveLength(ADABOOST_ROUNDS);
  });

  it("nRoundsを指定するとその数だけフレームを返す", () => {
    expect(buildAdaBoostFrames(3)).toHaveLength(3);
  });

  it("各フレームのroundは0からnRounds-1まで単調に増える", () => {
    const frames = buildAdaBoostFrames(4);
    frames.forEach((f, i) => expect(f.payload?.round).toBe(i));
  });

  it("各フレームは決定境界グリッドを持つ", () => {
    const frames = buildAdaBoostFrames(2);
    for (const f of frames) {
      expect(f.payload?.boundary.length).toBeGreaterThan(0);
    }
  });

  it("最終フレームだけnoteが付き、kindがsupplementになる", () => {
    const frames = buildAdaBoostFrames(3);
    frames.slice(0, -1).forEach((f) => {
      expect(f.callout?.note).toBeUndefined();
      expect(f.callout?.kind).toBe("explain");
    });
    const last = frames[frames.length - 1];
    expect(last.callout?.note).toBeDefined();
    expect(last.callout?.kind).toBe("supplement");
  });

  it("すべてのフレームでstumpハイライトが立つ", () => {
    const frames = buildAdaBoostFrames(3);
    for (const f of frames) expect(f.highlights).toContain("stump");
  });
});
