/**
 * コンテンツ層で共有する型（副作用なし）。
 * クライアントコンポーネントからも安全に `import type` できるよう、
 * fs を使う terms.ts とは分離しておく。
 */

/** 用語ノード（数式項・本文からポップオーバー参照される定義の単位, SPEC §4.3）。 */
export type TermNode = {
  /** ファイル名から導く一意 slug（例: "sample-mean"）。 */
  slug: string;
  /** 表示名。 */
  title: string;
  /** ポップオーバーに出す短い定義（インライン数式 `$...$` 可）。 */
  definition: string;
  /** 別名（用語ゆれ吸収・将来の検索用）。 */
  aliases: string[];
  /** 関連用語の slug（相互リンク）。 */
  seeAlso: string[];
};

/** slug -> TermNode の素の辞書（RSC 境界を越えてクライアントへ渡せる形）。 */
export type TermRecord = Record<string, TermNode>;
