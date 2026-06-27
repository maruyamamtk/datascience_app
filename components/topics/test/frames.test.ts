import { describe, expect, it } from "vitest";
import { power } from "@/lib/stats/test";
import { buildPowerFrames } from "./frames";

const OPTS = { effectSize: 0.5, alpha: 0.05, alternative: "two-sided" as const };

describe("buildPowerFrames", () => {
  const nValues = [5, 10, 20, 40, 80];

  it("n 1 つにつき 1 フレームを作る", () => {
    const frames = buildPowerFrames(nValues, OPTS);
    expect(frames).toHaveLength(nValues.length);
  });

  it("各フレームで revealed が 1 点ずつ増える", () => {
    const frames = buildPowerFrames(nValues, OPTS);
    expect(frames[0].payload?.revealed).toHaveLength(1);
    expect(frames[4].payload?.revealed).toHaveLength(5);
    expect(frames[2].payload?.n).toBe(20);
  });

  it("各点の検出力は power() と一致し、n とともに単調増加", () => {
    const frames = buildPowerFrames(nValues, OPTS);
    frames.forEach((f, i) => {
      expect(f.payload?.power).toBeCloseTo(
        power({ effectSize: 0.5, n: nValues[i], alpha: 0.05, alternative: "two-sided" }),
        12,
      );
    });
    const powers = frames.map((f) => f.payload?.power ?? 0);
    for (let i = 1; i < powers.length; i++) {
      expect(powers[i]).toBeGreaterThan(powers[i - 1]);
    }
  });

  it("β = 1 − 検出力", () => {
    const frames = buildPowerFrames(nValues, OPTS);
    frames.forEach((f) => {
      expect(f.payload?.beta).toBeCloseTo(1 - (f.payload?.power ?? 0), 12);
    });
  });

  it("いま開示した点をハイライトする", () => {
    const frames = buildPowerFrames(nValues, OPTS);
    expect(frames[3].highlights).toEqual(["pt-3"]);
  });

  it("検出力 0.8 以上のフレームは補足、未満は解説", () => {
    const frames = buildPowerFrames(nValues, OPTS);
    frames.forEach((f) => {
      const expected = (f.payload?.power ?? 0) >= 0.8 ? "supplement" : "explain";
      expect(f.callout?.kind).toBe(expected);
    });
  });

  it("空配列なら空のフレーム列", () => {
    expect(buildPowerFrames([], OPTS)).toEqual([]);
  });
});
