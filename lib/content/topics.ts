/**
 * トピック一覧（サーバ専用・データ層）。
 * `content/topics/*.mdx` の slug・frontmatter を列挙する。`_` 始まりはテンプレート/部分ファイルとして除外。
 * `node:fs` を使うためサーバコンポーネント/ビルド時のみ参照（クライアントから import しない）。
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter";

export const TOPICS_DIR = join(process.cwd(), "content", "topics");

/** 一覧表示用のトピックメタ（frontmatter 由来）。 */
export type TopicMeta = {
  slug: string;
  title: string;
  summary: string;
  /** 公開状態（published / draft 等。未指定は published 扱い）。 */
  status: string;
};

/** ルーティング対象のトピック slug 一覧（`_` 始まりを除外）。 */
export function listTopicSlugs(dir: string = TOPICS_DIR): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") && !f.startsWith("_"))
    .map((f) => f.replace(/\.mdx$/, ""))
    .sort();
}

/** 1ファイル分の MDX 文字列から一覧用メタを取り出す（純粋・テスト容易）。 */
export function parseTopicMeta(slug: string, source: string): TopicMeta {
  const { data } = parseFrontmatter(source);
  return {
    slug,
    title: typeof data.title === "string" && data.title ? data.title : slug,
    summary: typeof data.summary === "string" ? data.summary : "",
    status: typeof data.status === "string" && data.status ? data.status : "published",
  };
}

/** 全トピックの一覧メタを slug 順で読み込む（一覧ページ用）。 */
export function listTopics(dir: string = TOPICS_DIR): TopicMeta[] {
  return listTopicSlugs(dir).map((slug) => {
    const source = readFileSync(join(dir, `${slug}.mdx`), "utf8");
    return parseTopicMeta(slug, source);
  });
}
