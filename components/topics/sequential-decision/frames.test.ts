import { describe, expect, it } from "vitest";
import { PRIMARY_PAYOFF_MATRIX } from "@/lib/stats/decision-analysis";
import { economyTransition, type SequentialDecisionProblem } from "@/lib/stats/sequential-decision";
import { buildBackwardInductionFrames } from "./frames";

const problem: SequentialDecisionProblem = {
  matrix: PRIMARY_PAYOFF_MATRIX,
  transition: economyTransition(0.7),
  periods: 2,
  discount: 0.9,
};

describe("buildBackwardInductionFrames", () => {
  it("総フレーム数 = periods*states.length + 1", () => {
    const frames = buildBackwardInductionFrames(problem);
    expect(frames).toHaveLength(2 * PRIMARY_PAYOFF_MATRIX.states.length + 1);
  });

  it("フレーム0は何も計算していない初期状態", () => {
    const frames = buildBackwardInductionFrames(problem);
    expect(frames[0].payload?.computed).toEqual([]);
    expect(frames[0].payload?.current).toBeNull();
    expect(frames[0].callout?.kind).toBe("explain");
  });

  it("フレームが進むごとにcomputedが1つずつ増える(post-order: t=T→1)", () => {
    const frames = buildBackwardInductionFrames(problem);
    // frame1: t=2,state0を計算中、computedはまだ空
    expect(frames[1].payload?.current).toEqual(
      expect.objectContaining({ period: 2, stateIndex: 0 }),
    );
    expect(frames[1].payload?.computed).toEqual([]);

    // frame2: t=2,state1を計算中、computedに{period:2,stateIndex:0}が入る
    expect(frames[2].payload?.current).toEqual(
      expect.objectContaining({ period: 2, stateIndex: 1 }),
    );
    expect(frames[2].payload?.computed).toEqual([{ period: 2, stateIndex: 0 }]);

    // frame3: t=1,state0を計算中、computedに t=2 の2セルが入っている
    expect(frames[3].payload?.current).toEqual(
      expect.objectContaining({ period: 1, stateIndex: 0 }),
    );
    expect(frames[3].payload?.computed).toEqual([
      { period: 2, stateIndex: 0 },
      { period: 2, stateIndex: 1 },
    ]);
  });

  it("最終フレームは最初の期(t=1)の最後の状態(不況)を計算し、V=678(手計算値)と一致する", () => {
    const frames = buildBackwardInductionFrames(problem);
    const last = frames[frames.length - 1];
    expect(last.payload?.current?.period).toBe(1);
    expect(last.payload?.current?.stateIndex).toBe(1);
    expect(last.payload?.current?.value).toBeCloseTo(678, 10);
    expect(last.payload?.current?.actionIndex).toBe(1);
  });

  it("各フレームにcalloutがある(近傍コールアウト)", () => {
    const frames = buildBackwardInductionFrames(problem);
    for (const f of frames) {
      expect(f.callout?.body).toBeTruthy();
    }
  });
});
