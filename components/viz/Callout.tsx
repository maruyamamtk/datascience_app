"use client";

import type { CalloutContent } from "./frame";

type CalloutProps = CalloutContent & {
  className?: string;
};

const KIND_STYLE = {
  explain: {
    label: "解説",
    accent: "#2563eb", // blue
    badge: "bg-blue-50 text-blue-700",
  },
  supplement: {
    label: "補足",
    accent: "#9333ea", // purple
    badge: "bg-purple-50 text-purple-700",
  },
} as const;

/**
 * 図の近傍に「いま・何が・なぜ」を短文表示するコールアウト（描画層）。
 * - いま（title）: ステップ見出し
 * - 何が（body）: そのフレームで起きていること
 * - なぜ（note）: 補足・理由
 *
 * 種別（解説 / 補足）で左ボーダーの色とバッジを切り替える。アルゴリズム図鑑スタイルの
 * 「1コマごとの短い解説」をどのトピックでも同じ様式で出すための共通部品。
 */
export function Callout({ title, body, note, kind = "explain", className = "" }: CalloutProps) {
  const s = KIND_STYLE[kind];
  return (
    <aside
      className={`rounded-r-xl border-l-4 bg-white px-5 py-4 shadow-sm ${className}`}
      style={{ borderLeftColor: s.accent }}
      role="note"
    >
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold tracking-wide ${s.badge}`}>
          {s.label}
        </span>
        {title ? <span className="text-sm font-semibold text-slate-900">{title}</span> : null}
      </div>
      <p className="mt-2 leading-relaxed text-slate-700">{body}</p>
      {note ? <p className="mt-1 text-sm leading-relaxed text-slate-500">💡 {note}</p> : null}
    </aside>
  );
}
