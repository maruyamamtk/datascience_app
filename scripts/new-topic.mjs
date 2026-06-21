#!/usr/bin/env node
/**
 * 新トピックの雛形を生成する（Level 制テンプレートを必ず複製する）。
 * これにより「テンプレートから新トピックを作ると Level 枠が必ず入る」を担保する（Issue #5 受け入れ条件）。
 *
 * 使い方:
 *   pnpm new:topic <slug> "<タイトル>" ["<概要>"]
 *   例: pnpm new:topic normal-distribution "正規分布" "μ と σ が形を決める基本の分布"
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , slug, title, summary] = process.argv;

if (!slug || !title) {
  console.error('使い方: pnpm new:topic <slug> "<タイトル>" ["<概要>"]');
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`slug は英小文字・数字・ハイフンのみ: "${slug}"`);
  process.exit(1);
}

const dest = join(root, "content", "topics", `${slug}.mdx`);
if (existsSync(dest)) {
  console.error(`既に存在します: content/topics/${slug}.mdx`);
  process.exit(1);
}

const template = readFileSync(join(root, "content", "topics", "_template.mdx"), "utf8");
const out = template
  .replaceAll("__TITLE__", title)
  .replaceAll("__SUMMARY__", summary ?? "（概要を記入）");

writeFileSync(dest, out, "utf8");
console.log(`✅ 作成: content/topics/${slug}.mdx`);
console.log(`   /topics/${slug} で表示できます（pnpm dev）。`);
console.log("   Level 0〜6 の枠が入っています。L0〜L2 を埋め、用語は <Term id> で結んでください。");
