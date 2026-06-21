/**
 * 可視化共通部品（アルゴリズム図鑑スタイル）の純粋な型・ヘルパー（計算層）。
 *
 * 設計（walking-skeleton.md §4 / CLAUDE.md §2）:
 * - 「コマ送り（StepPlayer）/ 色ハイライト（Highlight）/ 近傍コールアウト（Callout）」を
 *   全トピックで使い回す共通フォーマットとする。
 * - **このファイルは副作用なしの純関数のみ**（Vitest 対象）。描画は *.tsx 側へ閉じる。
 * - フレームの「位置（count/index/playing）」は Zustand トピックストアの `frame` 状態
 *   （lib/store/topicStore.ts）が single source of truth。ここではフレーム「中身」の型と、
 *   再生・判定のロジックを純関数として提供する。
 */

/** コールアウトの種別（解説 / 補足）。 */
export type CalloutKind = "explain" | "supplement";

/**
 * 近傍コールアウトの内容。「いま・何が・なぜ」を短文で表す（アルゴリズム図鑑スタイル）。
 */
export type CalloutContent = {
  /** いま: ステップ見出し（番号・状態名など）。 */
  title?: string;
  /** 何が: このフレームで起きていることの短い説明。 */
  body: string;
  /** なぜ: 補足・理由（任意）。 */
  note?: string;
  /** 解説 / 補足。既定は explain。 */
  kind?: CalloutKind;
};

/**
 * 可視化の 1 フレーム（コマ送りの 1 コマ分）。
 * `payload` にトピック固有のデータ（配列の状態など）を持たせ、
 * `highlights` / `callout` は共通部品（Highlight / Callout）が解釈する。
 */
export type VizFrame<P = unknown> = {
  /** このフレームで強調する要素キー（Highlight が active 判定に使う）。 */
  highlights?: readonly string[];
  /** 近傍コールアウト。 */
  callout?: CalloutContent;
  /** トピック固有の描画データ（任意）。 */
  payload?: P;
};

/** index が先頭フレームか。 */
export const isFirstFrame = (index: number): boolean => index <= 0;

/** index が末尾フレームか（count<=0 のときも true 扱い）。 */
export const isLastFrame = (index: number, count: number): boolean => index >= count - 1;

/**
 * 自動再生の 1 ティック分の遷移を計算する純関数（副作用なし）。
 * 末尾に到達していれば `reachedEnd=true` を返し、index は据え置く。
 * 副作用（タイマー・ストア更新）は useFramePlayer 側で行う。
 */
export function stepTick(index: number, count: number): { nextIndex: number; reachedEnd: boolean } {
  if (isLastFrame(index, count)) return { nextIndex: index, reachedEnd: true };
  return { nextIndex: index + 1, reachedEnd: false };
}

/** フレーム列から index 番目を安全に取得（範囲外は undefined）。 */
export function frameAt<P>(frames: readonly VizFrame<P>[], index: number): VizFrame<P> | undefined {
  return frames[index];
}

/** 要素キーが現在フレームでハイライト対象か。 */
export function isHighlighted<P>(frame: VizFrame<P> | undefined, key: string): boolean {
  return frame?.highlights?.includes(key) ?? false;
}
