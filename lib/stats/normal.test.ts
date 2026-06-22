import { describe, expect, it } from "vitest";
import { normalPdf } from "./normal";

describe("normalPdf", () => {
  it("標準正規のピーク f(0)=1/√(2π)", () => {
    expect(normalPdf(0, 0, 1)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 10);
  });

  it("平均に関して対称", () => {
    expect(normalPdf(3, 5, 2)).toBeCloseTo(normalPdf(7, 5, 2), 12);
  });

  it("σ が小さいほどピークが高い（縮むと尖る）", () => {
    expect(normalPdf(5, 5, 1)).toBeGreaterThan(normalPdf(5, 5, 2));
  });

  it("sigma<=0 では 0", () => {
    expect(normalPdf(1, 0, 0)).toBe(0);
    expect(normalPdf(1, 0, -1)).toBe(0);
  });
});
