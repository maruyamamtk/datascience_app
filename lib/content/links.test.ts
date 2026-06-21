import { describe, expect, it } from "vitest";
import { extractTermRefs, findBrokenRefs } from "./links";

describe("extractTermRefs", () => {
  it("Term の id を出現順に抽出する", () => {
    const src =
      '本文 <Term id="sample-mean">標本平均</Term> と <Term id="standard-error">SE</Term>';
    expect(extractTermRefs(src)).toEqual(["sample-mean", "standard-error"]);
  });

  it("シングルクォートや属性順序の違いを許容する", () => {
    const src = "<Term className='x' id='expected-value'>期待値</Term>";
    expect(extractTermRefs(src)).toEqual(["expected-value"]);
  });

  it("Term が無ければ空配列", () => {
    expect(extractTermRefs("ただのテキスト")).toEqual([]);
  });

  it("同じ id が複数回でも全て返す（重複は findBrokenRefs 側で除去）", () => {
    const src = '<Term id="a">x</Term><Term id="a">y</Term>';
    expect(extractTermRefs(src)).toEqual(["a", "a"]);
  });
});

describe("findBrokenRefs", () => {
  it("未定義 slug を重複なく返す", () => {
    const broken = findBrokenRefs(["a", "b", "b", "c"], ["a", "c"]);
    expect(broken).toEqual(["b"]);
  });

  it("全て定義済みなら空配列", () => {
    expect(findBrokenRefs(["a", "b"], ["a", "b", "c"])).toEqual([]);
  });
});
