import { describe, expect, it } from "vitest";
import { splitInlineMath } from "./inline-math";

describe("splitInlineMath", () => {
  it("数式が無ければ text 1つ", () => {
    expect(splitInlineMath("標本の平均")).toEqual([{ type: "text", value: "標本の平均" }]);
  });

  it("text と math を順に分割する", () => {
    expect(splitInlineMath("平均 $\\bar X$ は推定量")).toEqual([
      { type: "text", value: "平均 " },
      { type: "math", value: "\\bar X" },
      { type: "text", value: " は推定量" },
    ]);
  });

  it("複数の数式を扱える", () => {
    expect(splitInlineMath("$a$と$b$")).toEqual([
      { type: "math", value: "a" },
      { type: "text", value: "と" },
      { type: "math", value: "b" },
    ]);
  });

  it("エスケープした \\$ はリテラルのドル", () => {
    expect(splitInlineMath("価格は \\$5 です")).toEqual([
      { type: "text", value: "価格は $5 です" },
    ]);
  });

  it("閉じられない $ は壊さず text 扱い", () => {
    expect(splitInlineMath("残った $ 記号")).toEqual([{ type: "text", value: "残った $ 記号" }]);
  });

  it("空文字は空配列", () => {
    expect(splitInlineMath("")).toEqual([]);
  });
});
