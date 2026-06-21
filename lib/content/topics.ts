/**
 * トピック一覧（サーバ専用・データ層）。
 * `content/topics/*.mdx` の slug を列挙する。`_` 始まりはテンプレート/部分ファイルとして除外。
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

export const TOPICS_DIR = join(process.cwd(), "content", "topics");

/** ルーティング対象のトピック slug 一覧（`_` 始まりを除外）。 */
export function listTopicSlugs(dir: string = TOPICS_DIR): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") && !f.startsWith("_"))
    .map((f) => f.replace(/\.mdx$/, ""))
    .sort();
}
