import { describe, expect, it } from "vitest";
import {
  censoredFraction,
  generateSurvival,
  kaplanMeier,
  logRankTest,
  medianSurvival,
  survivalAt,
  trueExponentialSurvival,
  type SurvObs,
} from "./survival";
import { mulberry32 } from "./random";

describe("kaplanMeier（手計算の小例）", () => {
  it("打ち切りを含む古典的な例で積・極限を再現", () => {
    // 時刻: 2(死), 3(打切), 4(死), 6(死)
    const obs: SurvObs[] = [
      { time: 2, event: true },
      { time: 3, event: false },
      { time: 4, event: true },
      { time: 6, event: true },
    ];
    const steps = kaplanMeier(obs);
    // t=2: n=4,d=1 → S=3/4=0.75
    // t=3: 打切のみ → 段差なし
    // t=4: n=2(4,6),d=1 → S=0.75·(1/2)=0.375
    // t=6: n=1,d=1 → S=0
    expect(steps.map((s) => s.time)).toEqual([2, 4, 6]);
    expect(steps[0].survival).toBeCloseTo(0.75, 10);
    expect(steps[1].survival).toBeCloseTo(0.375, 10);
    expect(steps[2].survival).toBeCloseTo(0, 10);
    // t=4 のリスク集合は 2（打切された 3 は除外済み）
    expect(steps[1].atRisk).toBe(2);
  });
});

describe("survivalAt / medianSurvival", () => {
  const obs: SurvObs[] = [
    { time: 2, event: true },
    { time: 4, event: true },
    { time: 6, event: true },
    { time: 8, event: true },
  ];
  const steps = kaplanMeier(obs);
  it("階段関数として右連続に評価", () => {
    expect(survivalAt(steps, 1)).toBeCloseTo(1, 10);
    expect(survivalAt(steps, 2)).toBeCloseTo(0.75, 10);
    expect(survivalAt(steps, 3)).toBeCloseTo(0.75, 10);
    expect(survivalAt(steps, 5)).toBeCloseTo(0.5, 10);
  });
  it("中央値は S が 0.5 以下になる最初の時刻", () => {
    expect(medianSurvival(steps)).toBe(4); // S(4)=0.5 ≤ 0.5
  });
});

describe("指数分布との整合（大標本）", () => {
  it("打ち切りありでも KM は真の指数生存に近い", () => {
    const hazard = 0.5;
    const obs = generateSurvival({ n: 5000, hazard, censorRate: 0.2, maxTime: 20, rng: mulberry32(81) });
    const steps = kaplanMeier(obs);
    // 真の中央値 ln2/hazard ≈ 1.386。KM 中央値も近いはず
    const trueMedian = Math.log(2) / hazard;
    expect(medianSurvival(steps)).toBeGreaterThan(trueMedian - 0.3);
    expect(medianSurvival(steps)).toBeLessThan(trueMedian + 0.3);
    // 時刻2での KM と 真の S(2)=exp(-1) の一致
    expect(survivalAt(steps, 2)).toBeCloseTo(trueExponentialSurvival(2, hazard), 1);
  });
  it("打ち切りが多いほど censoredFraction が上がる", () => {
    const low = generateSurvival({ n: 3000, hazard: 0.5, censorRate: 0.1, rng: mulberry32(82) });
    const high = generateSurvival({ n: 3000, hazard: 0.5, censorRate: 1.0, rng: mulberry32(82) });
    expect(censoredFraction(high)).toBeGreaterThan(censoredFraction(low));
  });
});

describe("logRankTest", () => {
  it("ハザードが違う2群では有意差（χ²大・p小）", () => {
    const a = generateSurvival({ n: 800, hazard: 0.3, censorRate: 0.1, maxTime: 30, rng: mulberry32(83) });
    const b = generateSurvival({ n: 800, hazard: 0.9, censorRate: 0.1, maxTime: 30, rng: mulberry32(84) });
    const { chi2, pValue } = logRankTest(a, b);
    expect(chi2).toBeGreaterThan(10);
    expect(pValue).toBeLessThan(0.01);
  });
  it("同じハザードの2群では有意差なし（p大）", () => {
    const a = generateSurvival({ n: 800, hazard: 0.5, censorRate: 0.1, maxTime: 30, rng: mulberry32(85) });
    const b = generateSurvival({ n: 800, hazard: 0.5, censorRate: 0.1, maxTime: 30, rng: mulberry32(86) });
    const { pValue } = logRankTest(a, b);
    expect(pValue).toBeGreaterThan(0.05);
  });
});
