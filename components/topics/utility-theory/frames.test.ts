import { describe, expect, it } from "vitest";
import { buildRiskAttitudeFrames, buildStPetersburgFrames, RISK_ATTITUDE_ALPHAS } from "./frames";

describe("buildStPetersburgFrames", () => {
  const frames = buildStPetersburgFrames(10);

  it("フレーム数 = maxN(10) + 1(まとめ) = 11", () => {
    expect(frames).toHaveLength(11);
  });

  it("先頭フレームはn=1、payload.phase=termで、部分和が1", () => {
    expect(frames[0].payload?.phase).toBe("term");
    expect(frames[0].payload?.n).toBe(1);
    expect(frames[0].payload?.partialExpectedValue).toBeCloseTo(1, 9);
  });

  it("n番目のフレームの期待金額部分和はnに一致する(各項がちょうど1)", () => {
    expect(frames[4].payload?.n).toBe(5);
    expect(frames[4].payload?.partialExpectedValue).toBeCloseTo(5, 9);
  });

  it("最終フレームはphase=summaryでnがnull", () => {
    const last = frames[frames.length - 1];
    expect(last.payload?.phase).toBe("summary");
    expect(last.payload?.n).toBeNull();
  });

  it("期待効用の部分和はフレームが進むほど増え、2に近づく", () => {
    const eus = frames
      .filter((f) => f.payload?.phase === "term")
      .map((f) => f.payload?.partialExpectedUtility ?? 0);
    for (let i = 1; i < eus.length; i++) {
      expect(eus[i]).toBeGreaterThanOrEqual(eus[i - 1]);
    }
    expect(eus[eus.length - 1]).toBeLessThan(2);
    expect(eus[eus.length - 1]).toBeGreaterThan(1.5);
  });

  it("各フレームにcalloutが付与されている", () => {
    for (const f of frames) {
      expect(f.callout).toBeDefined();
      expect(f.callout?.body.length).toBeGreaterThan(0);
    }
  });
});

describe("buildRiskAttitudeFrames", () => {
  const outcomes = [700, -300];
  const probabilities = [0.5, 0.5];
  const frames = buildRiskAttitudeFrames(outcomes, probabilities);

  it("フレーム数 = 3分類 + 1(まとめ) = 4", () => {
    expect(frames).toHaveLength(4);
  });

  it("フレーム0はrisk-averseでCE<E[X](RP>0)", () => {
    const p = frames[0].payload;
    expect(p?.attitude).toBe("risk-averse");
    expect(p?.certaintyEquivalent).toBeLessThan(p?.expectedValue ?? 0);
    expect(p?.riskPremium).toBeGreaterThan(0);
  });

  it("フレーム1はrisk-neutralでCE=E[X](RP=0)", () => {
    const p = frames[1].payload;
    expect(p?.attitude).toBe("risk-neutral");
    expect(p?.certaintyEquivalent).toBeCloseTo(p?.expectedValue ?? 0, 6);
    expect(p?.riskPremium).toBeCloseTo(0, 6);
  });

  it("フレーム2はrisk-lovingでCE>E[X](RP<0)", () => {
    const p = frames[2].payload;
    expect(p?.attitude).toBe("risk-loving");
    expect(p?.certaintyEquivalent).toBeGreaterThan(p?.expectedValue ?? 0);
    expect(p?.riskPremium).toBeLessThan(0);
  });

  it("最終フレームはphase=summaryでattitudeIndexがnull", () => {
    const last = frames[frames.length - 1];
    expect(last.payload?.phase).toBe("summary");
    expect(last.payload?.attitudeIndex).toBeNull();
  });

  it("RISK_ATTITUDE_ALPHASは回避的→中立→受容的の順で3件", () => {
    expect(RISK_ATTITUDE_ALPHAS).toHaveLength(3);
    expect(RISK_ATTITUDE_ALPHAS.map((a) => a.attitude)).toEqual([
      "risk-averse",
      "risk-neutral",
      "risk-loving",
    ]);
  });

  it("各フレームにcalloutが付与されている", () => {
    for (const f of frames) {
      expect(f.callout).toBeDefined();
      expect(f.callout?.body.length).toBeGreaterThan(0);
    }
  });
});
