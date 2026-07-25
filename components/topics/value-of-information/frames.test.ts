import { describe, expect, it } from "vitest";
import { PRIMARY_PAYOFF_MATRIX } from "@/lib/stats/decision-analysis";
import {
  evpi,
  perfectInfoBestActionPerState,
  perfectInformationEsv,
} from "@/lib/stats/value-of-information";
import { buildEvpiFrames } from "./frames";

describe("buildEvpiFrames", () => {
  const probabilities = [0.5, 0.5];
  const priorBestIndex = 1; // 1台稼働(ESV=300が最善)
  const priorBestScore = 300;
  const perfectInfoBestAction = perfectInfoBestActionPerState(PRIMARY_PAYOFF_MATRIX);
  const perfectInfoEsvValue = perfectInformationEsv(PRIMARY_PAYOFF_MATRIX, probabilities);
  const evpiValue = evpi(PRIMARY_PAYOFF_MATRIX, probabilities);

  const frames = buildEvpiFrames(
    PRIMARY_PAYOFF_MATRIX,
    probabilities,
    priorBestIndex,
    priorBestScore,
    perfectInfoBestAction,
    perfectInfoEsvValue,
    evpiValue,
  );

  it("フレーム数 = 1(事前情報) + states.length(2) + 1(最終) = 4", () => {
    expect(frames).toHaveLength(4);
  });

  it("先頭フレームはphase=priorでrevealedStatesが空", () => {
    expect(frames[0].payload?.phase).toBe("prior");
    expect(frames[0].payload?.revealedStates).toEqual([]);
  });

  it("中間フレームはphase=stateで状態が1つずつ明らかになる", () => {
    expect(frames[1].payload?.phase).toBe("state");
    expect(frames[1].payload?.stateIndex).toBe(0);
    expect(frames[1].payload?.revealedStates).toEqual([0]);

    expect(frames[2].payload?.phase).toBe("state");
    expect(frames[2].payload?.stateIndex).toBe(1);
    expect(frames[2].payload?.revealedStates).toEqual([0, 1]);
  });

  it("最終フレームはphase=finalで全状態が明らかになっている", () => {
    const last = frames[frames.length - 1];
    expect(last.payload?.phase).toBe("final");
    expect(last.payload?.revealedStates).toEqual([0, 1]);
  });

  it("各フレームにcalloutが付与されている", () => {
    for (const f of frames) {
      expect(f.callout).toBeDefined();
      expect(f.callout?.body.length).toBeGreaterThan(0);
    }
  });

  it("最終フレームのcalloutにEVPIの値(200)が含まれる", () => {
    const last = frames[frames.length - 1];
    expect(last.callout?.body).toContain("200");
  });
});
