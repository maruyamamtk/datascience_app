import { describe, expect, it } from "vitest";
import { buildDecisionTree, PRIMARY_PAYOFF_MATRIX } from "@/lib/stats/decision-analysis";
import { buildRegretFrames, buildTreeFrames } from "./frames";

describe("buildRegretFrames", () => {
  const frames = buildRegretFrames(PRIMARY_PAYOFF_MATRIX);

  it("フレーム総数 = states.length*2 + 1 (状態2つなので5)", () => {
    expect(frames).toHaveLength(5);
  });

  it("最初のフレームは好況列のhighlight-max", () => {
    expect(frames[0].payload?.phase).toBe("highlight-max");
    expect(frames[0].payload?.stateIndex).toBe(0);
    expect(frames[0].payload?.revealedStates).toEqual([]);
  });

  it("2番目のフレームは好況列のreveal-regret(revealedStatesに0を含む)", () => {
    expect(frames[1].payload?.phase).toBe("reveal-regret");
    expect(frames[1].payload?.revealedStates).toEqual([0]);
  });

  it("最後のフレームはfinalで、1台稼働(index1)を選ぶ", () => {
    const last = frames[frames.length - 1];
    expect(last.payload?.phase).toBe("final");
    expect(last.payload?.bestIndex).toBe(1);
    expect(last.payload?.maxRegrets).toEqual([800, 400, 600]);
  });

  it("各フレームにcalloutがある", () => {
    for (const f of frames) expect(f.callout?.body.length).toBeGreaterThan(0);
  });
});

describe("buildTreeFrames", () => {
  const tree = buildDecisionTree(PRIMARY_PAYOFF_MATRIX, [0.5, 0.5]);
  const frames = buildTreeFrames(tree);

  it("フレーム総数 = 確率ノード3 + 決定ノード1 + 初期フレーム1 = 5", () => {
    expect(frames).toHaveLength(5);
  });

  it("最初のフレームは何も計算されていない初期状態", () => {
    expect(frames[0].payload?.computedIds).toEqual([]);
    expect(frames[0].payload?.currentId).toBeNull();
  });

  it("最後のフレームは決定ノード(root)で、1台稼働(action-1)が選ばれる", () => {
    const last = frames[frames.length - 1];
    expect(last.payload?.currentId).toBe("root");
    expect(last.payload?.chosenBranchId).toBe("action-1");
  });

  it("computedIdsは1つ前までに計算済みのノードだけを含む(現フレームのcurrentIdは含まない)", () => {
    const secondToLast = frames[frames.length - 2];
    const last = frames[frames.length - 1];
    expect(last.payload?.computedIds).not.toContain(last.payload?.currentId);
    expect(last.payload?.computedIds).toContain(secondToLast.payload?.currentId);
  });
});
