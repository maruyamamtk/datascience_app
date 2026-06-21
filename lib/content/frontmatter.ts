/**
 * 最小の frontmatter パーサ（計算層・純関数）。
 * 用語/トピック MDX 冒頭の `--- ... ---` ブロックを読み取る。
 *
 * 依存を増やさない方針（CLAUDE.md §3, lib/stats と同様に自前実装・テスト可能）。
 * 対応する記法は本アプリのコンテンツ規約に絞る:
 *   key: value                （文字列。前後の引用符は剥がす）
 *   key: [a, b, c]            （インライン配列）
 *   key:                       （次行以降の "  - item" 形式の配列）
 *     - a
 *     - b
 * DOM・fs 等の副作用は持たない。
 */

export type FrontmatterValue = string | string[];
export type Frontmatter = Record<string, FrontmatterValue>;

export type ParsedFrontmatter = {
  /** frontmatter のキー・値。 */
  data: Frontmatter;
  /** frontmatter を除いた本文。 */
  content: string;
};

/** 前後の同種クォート（" か '）を1組だけ剥がす。 */
function stripQuotes(raw: string): string {
  const s = raw.trim();
  if (s.length >= 2 && (s[0] === '"' || s[0] === "'") && s[s.length - 1] === s[0]) {
    return s.slice(1, -1);
  }
  return s;
}

/** "[a, b, c]" を ["a","b","c"] に。空配列 "[]" は [] に。 */
function parseInlineArray(raw: string): string[] {
  const inner = raw.trim().slice(1, -1).trim();
  if (inner === "") return [];
  return inner
    .split(",")
    .map((item) => stripQuotes(item))
    .filter((item) => item.length > 0);
}

const FRONTMATTER_RE = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * frontmatter を解析する。先頭に `---` ブロックが無ければ data は空。
 */
export function parseFrontmatter(source: string): ParsedFrontmatter {
  const match = source.match(FRONTMATTER_RE);
  if (!match) {
    return { data: {}, content: source };
  }

  const block = match[1];
  const content = source.slice(match[0].length);
  const data: Frontmatter = {};

  const lines = block.split(/\r?\n/);
  let pendingListKey: string | null = null;

  for (const line of lines) {
    if (line.trim() === "") continue;

    // "  - item" 形式（直前に "key:" が来ているときのみ有効）。
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && pendingListKey) {
      (data[pendingListKey] as string[]).push(stripQuotes(listItem[1]));
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const rawValue = kv[2];

    if (rawValue.trim() === "") {
      // 次行からの dash リストを受ける。
      data[key] = [];
      pendingListKey = key;
      continue;
    }

    pendingListKey = null;
    const trimmed = rawValue.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      data[key] = parseInlineArray(trimmed);
    } else {
      data[key] = stripQuotes(trimmed);
    }
  }

  return { data, content };
}

/** frontmatter 値を必ず文字列配列として取り出す（未定義は []）。 */
export function asStringArray(value: FrontmatterValue | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
