import { describe, expect, it } from "vitest";
import {
  evolve,
  isStochastic,
  samplePath,
  stationaryDistribution,
  step,
  totalVariationToStationary,
  type TransitionMatrix,
} from "./markov";
import { mulberry32 } from "./random";

// 2状態の天気連鎖（晴/雨）。
const WEATHER: TransitionMatrix = [
  [0.8, 0.2],
  [0.4, 0.6],
];

describe("step", () => {
  it("π' = πP（行ベクトル×行列）", () => {
    const next = step([1, 0], WEATHER);
    expect(next[0]).toBeCloseTo(0.8, 10);
    expect(next[1]).toBeCloseTo(0.2, 10);
  });
  it("分布の和は保存される（1のまま）", () => {
    const next = step([0.3, 0.7], WEATHER);
    expect(next.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
});

describe("isStochastic", () => {
  it("各行の和が1なら true", () => {
    expect(isStochastic(WEATHER)).toBe(true);
  });
  it("行和が1でないと false", () => {
    expect(
      isStochastic([
        [0.5, 0.2],
        [0.4, 0.6],
      ]),
    ).toBe(false);
  });
});

describe("stationaryDistribution", () => {
  it("既知の2状態連鎖の定常分布（π=[2/3,1/3]）", () => {
    // π_晴 = 0.4/(0.2+0.4) = 2/3
    const pi = stationaryDistribution(WEATHER);
    expect(pi[0]).toBeCloseTo(2 / 3, 6);
    expect(pi[1]).toBeCloseTo(1 / 3, 6);
  });
  it("定常分布は πP=π を満たす", () => {
    const pi = stationaryDistribution(WEATHER);
    const next = step(pi, WEATHER);
    expect(next[0]).toBeCloseTo(pi[0], 8);
    expect(next[1]).toBeCloseTo(pi[1], 8);
  });
  it("和は1", () => {
    const pi = stationaryDistribution(WEATHER);
    expect(pi.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
});

describe("evolve", () => {
  it("初期分布に関わらず定常分布へ収束（既約・非周期）", () => {
    const seq = evolve(WEATHER, [1, 0], 50);
    const last = seq[seq.length - 1];
    expect(last[0]).toBeCloseTo(2 / 3, 5);
    // 別の初期分布でも同じ定常へ。
    const seq2 = evolve(WEATHER, [0, 1], 50);
    expect(seq2[seq2.length - 1][0]).toBeCloseTo(2 / 3, 5);
  });
  it("π_0 は初期分布そのもの、列長は steps+1", () => {
    const seq = evolve(WEATHER, [0.5, 0.5], 10);
    expect(seq[0]).toEqual([0.5, 0.5]);
    expect(seq).toHaveLength(11);
  });
});

describe("totalVariationToStationary", () => {
  it("総変動距離は単調に0へ近づく（混合）", () => {
    const tv = totalVariationToStationary(WEATHER, [1, 0], 30);
    expect(tv[0]).toBeGreaterThan(tv[tv.length - 1]);
    expect(tv[tv.length - 1]).toBeLessThan(1e-3);
  });
});

describe("samplePath", () => {
  it("経路は length+1、各状態は有効インデックス", () => {
    const path = samplePath(WEATHER, 0, 100, mulberry32(1));
    expect(path).toHaveLength(101);
    path.forEach((s) => expect(s === 0 || s === 1).toBe(true));
  });
  it("長い経路の滞在割合は定常分布に近い", () => {
    const path = samplePath(WEATHER, 0, 5000, mulberry32(3));
    const frac0 = path.filter((s) => s === 0).length / path.length;
    expect(frac0).toBeCloseTo(2 / 3, 1);
  });
});
