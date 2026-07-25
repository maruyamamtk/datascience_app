import { describe, expect, it } from "vitest";
import { gibbsChain } from "@/lib/stats/mcmc-methods";
import { mulberry32 } from "@/lib/stats/random";
import { buildGibbsFrames } from "./gibbs-frames";

describe("buildGibbsFrames", () => {
  const start = { x: 0, y: 0 };
  const steps = gibbsChain(start, 0.8, 12, mulberry32(2));
  const frames = buildGibbsFrames(start, steps, 0.8);

  it("フレーム数はsteps.length+1(先頭が初期状態)", () => {
    expect(frames.length).toBe(steps.length + 1);
  });

  it("先頭フレームはstep=nullでtrailが開始点のみ", () => {
    expect(frames[0].payload?.step).toBeNull();
    expect(frames[0].payload?.trail).toEqual([start]);
    expect(frames[0].callout?.title).toContain("初期状態");
  });

  it("各フレームのtrailは1つずつ増え、末尾がそのステップのafterと一致する", () => {
    for (let i = 1; i < frames.length; i++) {
      const payload = frames[i].payload;
      expect(payload?.trail.length).toBe(i + 1);
      expect(payload?.trail[payload.trail.length - 1]).toEqual(steps[i - 1].after);
    }
  });

  it("x更新フレームとy更新フレームが交互に並ぶ", () => {
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].payload?.step?.updated).toBe(i % 2 === 1 ? "x" : "y");
    }
  });

  it("x更新フレームのhighlightsはcondValX/drawnX、y更新はcondValY/drawnY", () => {
    for (let i = 1; i < frames.length; i++) {
      const updated = frames[i].payload?.step?.updated;
      expect(frames[i].highlights).toEqual(updated === "x" ? ["condValX", "drawnX"] : ["condValY", "drawnY"]);
    }
  });

  it("すべてのフレームで棄却は存在しない(常に受理というcallout文言がx/y更新時に含まれる)", () => {
    for (let i = 1; i < frames.length; i++) {
      const step = steps[i - 1];
      expect(step.after).not.toBeNull();
    }
  });
});
