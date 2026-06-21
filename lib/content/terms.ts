/**
 * 用語ノード registry（サーバ専用・データ層）。
 * `content/terms/*.mdx` の frontmatter を読み、用語の定義データ集合を組み立てる。
 * `node:fs` を使うためサーバコンポーネント/ビルド時のみ参照（クライアントから import しない）。
 *
 * 解析（parseFrontmatter）・検証（links）は純関数の計算層に委譲し、ここは I/O に徹する。
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { asStringArray, parseFrontmatter } from "./frontmatter";
import type { TermNode } from "./types";

export type { TermNode } from "./types";

/** 用語ノードを格納するディレクトリ。 */
export const TERMS_DIR = join(process.cwd(), "content", "terms");

/** 1ファイル分の MDX 文字列を TermNode に変換する（純粋。テスト容易）。 */
export function parseTermFile(slug: string, source: string): TermNode {
  const { data } = parseFrontmatter(source);
  const title = typeof data.title === "string" ? data.title : "";
  const definition = typeof data.definition === "string" ? data.definition : "";
  return {
    slug,
    title,
    definition,
    aliases: asStringArray(data.aliases),
    seeAlso: asStringArray(data.seeAlso),
  };
}

/** ディレクトリ内の用語 .mdx を全て読み込み TermNode 配列にする。 */
export function loadTerms(dir: string = TERMS_DIR): TermNode[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  return files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const source = readFileSync(join(dir, file), "utf8");
      return parseTermFile(slug, source);
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** slug -> TermNode の Map を作る。 */
export function buildTermMap(terms: TermNode[]): Map<string, TermNode> {
  return new Map(terms.map((t) => [t.slug, t]));
}

/**
 * クライアントへ渡せる素のオブジェクト辞書（TermsProvider 用）。
 * Map は RSC 境界をまたげないため Record で返す。
 */
export function toTermRecord(terms: TermNode[]): Record<string, TermNode> {
  return Object.fromEntries(terms.map((t) => [t.slug, t]));
}
