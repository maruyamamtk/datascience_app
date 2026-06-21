import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractTermRefs, findBrokenRefs } from "./links";
import { buildTermMap, loadTerms, TERMS_DIR } from "./terms";

const TOPICS_DIR = join(process.cwd(), "content", "topics");

function listMdx(dir: string): string[] {
  return readdirSync(dir).filter((f) => f.endsWith(".mdx"));
}

/** 用語本文の markdown リンク `[text](slug)` のうち、相対 slug 参照だけを抽出。 */
function extractMarkdownSlugLinks(source: string): string[] {
  const refs: string[] = [];
  for (const m of source.matchAll(/\]\(([^)]+)\)/g)) {
    const href = m[1].trim();
    // 外部 URL・アンカー・拡張子付き・パス区切りは対象外（用語 slug のみを検証）。
    if (/^[a-z0-9-]+$/.test(href)) refs.push(href);
  }
  return refs;
}

describe("用語 registry", () => {
  const terms = loadTerms();
  const map = buildTermMap(terms);
  const slugs = [...map.keys()];

  it("用語ノードが1つ以上読み込める", () => {
    expect(terms.length).toBeGreaterThan(0);
  });

  it("各用語に title と definition がある（薄い用語を作らない）", () => {
    for (const t of terms) {
      expect(t.title, `${t.slug} の title`).not.toBe("");
      expect(t.definition, `${t.slug} の definition`).not.toBe("");
    }
  });

  it("seeAlso の参照がすべて解決する（用語間リンク切れなし）", () => {
    for (const t of terms) {
      const broken = findBrokenRefs(t.seeAlso, slugs);
      expect(broken, `${t.slug} の seeAlso`).toEqual([]);
    }
  });

  it("用語本文の markdown slug リンクがすべて解決する", () => {
    for (const file of listMdx(TERMS_DIR)) {
      const source = readFileSync(join(TERMS_DIR, file), "utf8");
      const broken = findBrokenRefs(extractMarkdownSlugLinks(source), slugs);
      expect(broken, `${file} の本文リンク`).toEqual([]);
    }
  });

  it("トピック MDX の <Term> 参照がすべて解決する（リンク切れなし）", () => {
    // `_` 始まりはテンプレート（プレースホルダを含む）なので検査対象外。
    for (const file of listMdx(TOPICS_DIR).filter((f) => !f.startsWith("_"))) {
      const source = readFileSync(join(TOPICS_DIR, file), "utf8");
      const broken = findBrokenRefs(extractTermRefs(source), slugs);
      expect(broken, `${file} の <Term> 参照`).toEqual([]);
    }
  });
});
