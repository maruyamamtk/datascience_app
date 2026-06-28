import { describe, expect, it } from "vitest";
import {
  bernoulliLogLikelihood,
  bernoulliMle,
  bernoulliSuccesses,
  likelihoodCurve,
  orderStatistic,
  orderStatistics,
  sampleMedian,
} from "./sufficiency";

describe("bernoulliSuccesses（十分統計量）", () => {
  it("成功数＝1の個数、順序に依らない", () => {
    expect(bernoulliSuccesses([1, 0, 1, 1, 0])).toBe(3);
    expect(bernoulliSuccesses([0, 1, 1, 0, 1])).toBe(3); // 並べ替えても同じ
  });
});

describe("尤度はデータに T と n を通してしか依存しない（ネイマン分解）", () => {
  it("同じ T・n なら対数尤度は並びに依らず一致", () => {
    const a = [1, 1, 1, 0, 0];
    const b = [0, 1, 0, 1, 1];
    expect(bernoulliSuccesses(a)).toBe(bernoulliSuccesses(b));
    for (const p of [0.2, 0.5, 0.7]) {
      const la = bernoulliLogLikelihood(p, bernoulliSuccesses(a), a.length);
      const lb = bernoulliLogLikelihood(p, bernoulliSuccesses(b), b.length);
      expect(la).toBeCloseTo(lb, 12);
    }
  });
});

describe("bernoulliMle", () => {
  it("p̂=T/n が対数尤度を最大化する", () => {
    const T = 3;
    const n = 5;
    const mle = bernoulliMle(T, n);
    expect(mle).toBeCloseTo(0.6, 12);
    const atMle = bernoulliLogLikelihood(mle, T, n);
    // 近傍より大きい。
    expect(atMle).toBeGreaterThan(bernoulliLogLikelihood(0.5, T, n));
    expect(atMle).toBeGreaterThan(bernoulliLogLikelihood(0.7, T, n));
  });
  it("n=0 は NaN", () => {
    expect(bernoulliMle(0, 0)).toBeNaN();
  });
});

describe("likelihoodCurve", () => {
  it("尤度の最大は p=T/n 付近で 1（正規化済み）", () => {
    const curve = likelihoodCurve(6, 10, 100);
    const max = curve.reduce((m, c) => (c.lik > m.lik ? c : m));
    expect(max.p).toBeCloseTo(0.6, 2);
    expect(max.lik).toBeCloseTo(1, 6);
  });
});

describe("順序統計量", () => {
  it("昇順に並べる（元配列は不変）", () => {
    const src = [3, 1, 2];
    expect(orderStatistics(src)).toEqual([1, 2, 3]);
    expect(src).toEqual([3, 1, 2]);
  });
  it("k番目（最小=1, 最大=n）", () => {
    expect(orderStatistic([5, 1, 3], 1)).toBe(1);
    expect(orderStatistic([5, 1, 3], 3)).toBe(5);
    expect(orderStatistic([5, 1, 3], 4)).toBeNaN();
  });
  it("中央値（奇数/偶数）", () => {
    expect(sampleMedian([3, 1, 2])).toBe(2);
    expect(sampleMedian([4, 1, 2, 3])).toBe(2.5);
  });
});
