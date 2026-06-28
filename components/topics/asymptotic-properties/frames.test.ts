import { describe, expect, it } from "vitest";
import { buildAsymptoticFrames } from "./frames";

describe("buildAsymptoticFrames", () => {
  const frames = buildAsymptoticFrames([10, 50, 300], 1.5, 1500);

  it("n のリストぶんフレーム", () => {
    expect(frames).toHaveLength(3);
    expect(frames.map((f) => f.payload?.n)).toEqual([10, 50, 300]);
  });

  it("漸近SDは √(λ²/n) で n と共に縮む", () => {
    const sds = frames.map((f) => f.payload?.asympSd ?? 1);
    expect(sds[1]).toBeLessThan(sds[0]);
    expect(sds[2]).toBeLessThan(sds[1]);
    // λ=1.5, n=300 → √(2.25/300)=0.0866
    expect(sds[2]).toBeCloseTo(Math.sqrt(2.25 / 300), 6);
  });

  it("実測SDは漸近SDに近い（大標本）", () => {
    const last = frames[2].payload;
    expect(Math.abs((last?.empiricalSd ?? 0) - (last?.asympSd ?? 1))).toBeLessThan(0.02);
  });

  it("各フレームにハイライト", () => {
    frames.forEach((f, i) => expect(f.highlights).toContain(`n-${[10, 50, 300][i]}`));
  });
});
