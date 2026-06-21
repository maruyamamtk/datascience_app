import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 受け入れ条件「テンプレートから新トピックを作ると Level 枠が必ず入る」を保証する。
 * テンプレート自体が L0〜L6 と対象読者ガイドを備えていることを検査する。
 */
const TEMPLATE = readFileSync(join(process.cwd(), "content", "topics", "_template.mdx"), "utf8");

describe("トピックテンプレート", () => {
  it("Level 0〜6 の枠をすべて含む", () => {
    for (let level = 0; level <= 6; level++) {
      expect(TEMPLATE, `Level ${level} 枠`).toContain(`level={${level}}`);
    }
  });

  it("対象読者ガイドと Topic ラッパを含む", () => {
    expect(TEMPLATE).toContain("<ReaderGuide>");
    expect(TEMPLATE).toContain("<Topic");
  });

  it("概念→操作→演習の枠を含む", () => {
    expect(TEMPLATE).toContain("<Concept>");
    expect(TEMPLATE).toContain("<Interact>");
    expect(TEMPLATE).toContain("<Exercise>");
  });

  it("導出の折りたたみ枠を含む", () => {
    expect(TEMPLATE).toContain("<Derivation");
  });
});
