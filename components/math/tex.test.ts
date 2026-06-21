import { describe, expect, it } from "vitest";
import { formatNumber, standardError, term, termId } from "./tex";

describe("termId", () => {
  it("項キーに接頭辞を付ける", () => {
    expect(termId("n")).toBe("term-n");
    expect(termId("sigma")).toBe("term-sigma");
  });
});

describe("term", () => {
  it("\\htmlId で id 付きの TeX 断片を作る", () => {
    expect(term("n", "n")).toBe("\\htmlId{term-n}{n}");
  });

  it("中身に任意の TeX を埋め込める", () => {
    expect(term("se", "\\sigma/\\sqrt{n}")).toBe("\\htmlId{term-se}{\\sigma/\\sqrt{n}}");
  });
});

describe("formatNumber", () => {
  it("既定で小数2桁、末尾ゼロは削る", () => {
    expect(formatNumber(2)).toBe("2");
    expect(formatNumber(2.5)).toBe("2.5");
    expect(formatNumber(2.345)).toBe("2.35");
  });

  it("桁数を指定できる", () => {
    expect(formatNumber(3.14159, 3)).toBe("3.142");
  });

  it("有限でない値はダッシュ", () => {
    expect(formatNumber(Number.NaN)).toBe("\\text{—}");
    expect(formatNumber(Infinity)).toBe("\\text{—}");
  });
});

describe("standardError", () => {
  it("σ/√n を返す", () => {
    expect(standardError(2, 4)).toBe(1);
    expect(standardError(10, 100)).toBe(1);
  });

  it("n を4倍にすると SE は半分になる", () => {
    expect(standardError(8, 4)).toBeCloseTo(4);
    expect(standardError(8, 16)).toBeCloseTo(2);
  });

  it("n<=0 は NaN", () => {
    expect(Number.isNaN(standardError(1, 0))).toBe(true);
    expect(Number.isNaN(standardError(1, -3))).toBe(true);
  });
});
