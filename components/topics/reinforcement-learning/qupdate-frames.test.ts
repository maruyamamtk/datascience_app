import { describe, expect, it } from "vitest";
import { buildQUpdateDemoSteps, buildQUpdateFrames, Q_STEPPER_DEMO_STEPS } from "./qupdate-frames";

describe("buildQUpdateDemoSteps", () => {
  it("決定的（同じ結果を毎回返す）", () => {
    expect(buildQUpdateDemoSteps()).toEqual(buildQUpdateDemoSteps());
  });

  it("Q_STEPPER_DEMO_STEPS 以下のステップ数を返す（途中で終端に達したら短くなる）", () => {
    const steps = buildQUpdateDemoSteps();
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.length).toBeLessThanOrEqual(Q_STEPPER_DEMO_STEPS);
  });

  it("最後のステップ以外は done=false（途中で終わっていない）", () => {
    const steps = buildQUpdateDemoSteps();
    for (let i = 0; i < steps.length - 1; i++) {
      expect(steps[i].done).toBe(false);
    }
  });

  it("各ステップの nextState は次のステップの state と一致する（連続した1本道）", () => {
    const steps = buildQUpdateDemoSteps();
    for (let i = 0; i < steps.length - 1; i++) {
      expect(steps[i].nextState).toBe(steps[i + 1].state);
    }
  });

  it("ウォームアップ済みなので、更新前のQ値がすべて0ということはない（学習が反映されている）", () => {
    const steps = buildQUpdateDemoSteps();
    const anyNonZero = steps.some((s) => s.update.qBefore !== 0 || s.update.maxNextQ !== 0);
    expect(anyNonZero).toBe(true);
  });
});

describe("buildQUpdateFrames", () => {
  it("ステップ数と同じ数のフレームを作る", () => {
    const steps = buildQUpdateDemoSteps();
    const frames = buildQUpdateFrames(steps);
    expect(frames.length).toBe(steps.length);
  });

  it("各フレームは explore か exploit のどちらかをハイライトする", () => {
    const frames = buildQUpdateFrames();
    for (const f of frames) {
      expect(f.highlights).toHaveLength(1);
      expect(["explore", "exploit"]).toContain(f.highlights?.[0]);
    }
  });

  it("すべてのフレームに callout がある", () => {
    const frames = buildQUpdateFrames();
    for (const f of frames) {
      expect(f.callout).toBeDefined();
      expect(f.callout?.body.length).toBeGreaterThan(0);
    }
  });
});
