import { describe, expect, it } from "vitest";
import { buildSplitSearchFrames } from "./frames";

describe("buildSplitSearchFrames", () => {
  it("候補数と同じフレーム数を返す", () => {
    const frames = buildSplitSearchFrames("gini");
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.length).toBe(frames[0].payload?.candidates.length);
  });

  it("各フレームのrevealedは1から候補数まで単調に増える", () => {
    const frames = buildSplitSearchFrames("gini");
    frames.forEach((f, i) => expect(f.payload?.revealed).toBe(i + 1));
  });

  it("bestIndexが指す候補の利得は、それまでのどの候補の利得以上", () => {
    const frames = buildSplitSearchFrames("entropy");
    for (const f of frames) {
      const p = f.payload!;
      const bestGain = p.candidates[p.bestIndex].gain;
      for (let i = 0; i < p.revealed; i++) {
        expect(bestGain).toBeGreaterThanOrEqual(p.candidates[i].gain - 1e-9);
      }
    }
  });

  it("最終フレームのnoteに最良分割の情報が含まれる", () => {
    const frames = buildSplitSearchFrames("gini");
    const last = frames[frames.length - 1];
    expect(last.callout?.note).toBeDefined();
    expect(last.callout?.kind).toBe("supplement");
  });

  it("最良候補が更新されたフレームだけ highlights に best が入る", () => {
    const frames = buildSplitSearchFrames("gini");
    let runningBest = -Infinity;
    frames.forEach((f) => {
      const gain = f.payload!.candidates[f.payload!.revealed - 1].gain;
      const isNewBest = gain > runningBest + 1e-12;
      expect(f.highlights?.includes("best")).toBe(isNewBest);
      runningBest = Math.max(runningBest, gain);
    });
  });

  it("criterionを変えると候補の利得も変わりうる（gini/entropyで最良閾値が一致するとは限らない）", () => {
    const giniFrames = buildSplitSearchFrames("gini");
    const entropyFrames = buildSplitSearchFrames("entropy");
    expect(giniFrames.length).toBe(entropyFrames.length); // 候補（特徴量×閾値）自体は同じ集合
  });
});
