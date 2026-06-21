"use client";

import type { CSSProperties, ReactNode } from "react";

type HighlightProps = {
  /** このフレームで強調するか。`isHighlighted(frame, key)` の結果を渡す想定。 */
  active: boolean;
  /** 強調色（既定は青）。数式項ハイライトと色を揃えると操作→数式連動が分かりやすい。 */
  color?: string;
  children: ReactNode;
  /** 描画タグ（インライン要素を囲むなら "span"）。既定 "div"。 */
  as?: "div" | "span";
  className?: string;
};

/**
 * 着目要素を「色・枠・淡い背景」で強調する汎用ラッパ（描画層）。
 * フレームごとに対象が変わるアルゴリズム図鑑スタイルのハイライトを、
 * 数式項（TermController）と同じ様式（globals.css の .viz-highlight）で提供する。
 *
 * ロジックは持たず active を受け取るだけ。判定は計算層 `isHighlighted` に任せる（3層疎結合）。
 */
export function Highlight({
  active,
  color = "#2563eb",
  children,
  as = "div",
  className = "",
}: HighlightProps) {
  const Tag = as;
  const style = { "--hl-color": color } as CSSProperties;
  const cls = ["viz-highlight", active ? "viz-highlight--active" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={cls} style={style} data-active={active}>
      {children}
    </Tag>
  );
}
