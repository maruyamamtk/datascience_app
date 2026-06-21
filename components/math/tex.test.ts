import { describe, expect, it } from "vitest";
import { formatNumber, term, termId } from "./tex";

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

  it("digits=0 で整数部の末尾ゼロを削らない", () => {
    expect(formatNumber(10, 0)).toBe("10");
    expect(formatNumber(100, 0)).toBe("100");
    expect(formatNumber(0, 0)).toBe("0");
  });

  it("有限でない値はダッシュ", () => {
    expect(formatNumber(Number.NaN)).toBe("\\text{—}");
    expect(formatNumber(Infinity)).toBe("\\text{—}");
  });
});
