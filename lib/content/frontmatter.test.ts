import { describe, expect, it } from "vitest";
import { asStringArray, parseFrontmatter } from "./frontmatter";

describe("parseFrontmatter", () => {
  it("key: value を文字列として読む", () => {
    const { data, content } = parseFrontmatter("---\ntitle: 標本平均\n---\n本文です。\n");
    expect(data.title).toBe("標本平均");
    expect(content).toBe("本文です。\n");
  });

  it("前後の引用符を1組剥がす", () => {
    const { data } = parseFrontmatter('---\ndefinition: "標本: の平均"\n---\n');
    expect(data.definition).toBe("標本: の平均");
  });

  it("インライン配列を読む", () => {
    const { data } = parseFrontmatter("---\nseeAlso: [standard-error, expected-value]\n---\n");
    expect(data.seeAlso).toEqual(["standard-error", "expected-value"]);
  });

  it("空のインライン配列は空配列", () => {
    const { data } = parseFrontmatter("---\nseeAlso: []\n---\n");
    expect(data.seeAlso).toEqual([]);
  });

  it("dash リスト形式を読む", () => {
    const src = "---\nseeAlso:\n  - standard-error\n  - expected-value\n---\n";
    const { data } = parseFrontmatter(src);
    expect(data.seeAlso).toEqual(["standard-error", "expected-value"]);
  });

  it("frontmatter が無ければ data は空・content は全文", () => {
    const { data, content } = parseFrontmatter("# 見出し\n本文\n");
    expect(data).toEqual({});
    expect(content).toBe("# 見出し\n本文\n");
  });

  it("CRLF 改行でも解析できる", () => {
    const { data } = parseFrontmatter("---\r\ntitle: A\r\n---\r\n本文\r\n");
    expect(data.title).toBe("A");
  });
});

describe("asStringArray", () => {
  it("undefined は []", () => {
    expect(asStringArray(undefined)).toEqual([]);
  });
  it("文字列は単要素配列に包む", () => {
    expect(asStringArray("a")).toEqual(["a"]);
  });
  it("配列はそのまま", () => {
    expect(asStringArray(["a", "b"])).toEqual(["a", "b"]);
  });
});
