/**
 * 用語リンクの抽出・検証（計算層・純関数）。
 * MDX 本文中の `<Term id="slug">…</Term>` 参照を集め、用語 registry と突き合わせて
 * リンク切れ（未定義 slug）を検出する。fs アクセスは呼び出し側（terms.ts / テスト）が行う。
 */

const TERM_REF_RE = /<Term\b[^>]*\bid=["']([^"']+)["']/g;

/** MDX ソースから `<Term id="...">` の slug を出現順に抽出する（重複含む）。 */
export function extractTermRefs(source: string): string[] {
  const refs: string[] = [];
  for (const match of source.matchAll(TERM_REF_RE)) {
    refs.push(match[1]);
  }
  return refs;
}

/**
 * 参照のうち knownSlugs に存在しないものを返す（重複は除去）。
 * 戻り値が空ならリンク切れなし。
 */
export function findBrokenRefs(refs: string[], knownSlugs: Iterable<string>): string[] {
  const known = new Set(knownSlugs);
  const broken = new Set<string>();
  for (const ref of refs) {
    if (!known.has(ref)) broken.add(ref);
  }
  return [...broken];
}
