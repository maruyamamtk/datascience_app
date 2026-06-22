import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random";

describe("mulberry32", () => {
  it("同じシードからは同じ列を返す（再現可能）", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("異なるシードでは異なる列になる", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it("生成値はすべて [0,1) に収まる", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("大量に引くと平均は約 0.5 に近づく（一様性のラフな確認）", () => {
    const r = mulberry32(123);
    let sum = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) sum += r();
    expect(sum / N).toBeCloseTo(0.5, 1);
  });
});
