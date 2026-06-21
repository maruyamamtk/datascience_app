"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { InlineDefinition } from "./InlineDefinition";
import { useTerms } from "./TermsProvider";

/**
 * 用語リンク（描画層）。本文・解説中に置き、ホバー/フォーカス/タップで定義ポップオーバーを出す。
 * 定義データは TermsProvider（状態層）から取得し、未定義 id は**可視エラー**にしてリンク切れを検知する。
 *
 * 使い方（MDX 内）: `<Term id="sample-mean">標本平均</Term>`
 */
export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const terms = useTerms();
  const node = terms[id];
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  // 外側クリック・Escape で閉じる（タップ操作のため）。
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!node) {
    // 未定義の用語: 赤線で可視化し、リンク切れに気づけるようにする。
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Term] 未定義の用語 id="${id}"`);
    }
    return (
      <span
        className="cursor-help underline decoration-red-500 decoration-wavy underline-offset-2"
        title={`未定義の用語: ${id}`}
      >
        {children ?? id}
      </span>
    );
  }

  return (
    <span ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="cursor-help text-blue-700 underline decoration-dotted decoration-from-font underline-offset-2 hover:text-blue-800"
      >
        {children ?? node.title}
      </button>
      {open && (
        <span
          id={popoverId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-2 block w-72 max-w-[80vw] -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-sm leading-relaxed text-slate-700 shadow-lg"
        >
          <span className="mb-1 block font-semibold text-slate-900">{node.title}</span>
          <span className="block">
            <InlineDefinition text={node.definition} />
          </span>
          <Link
            href={`/terms/${node.slug}`}
            className="mt-2 inline-block text-xs font-medium text-blue-700 hover:underline"
          >
            詳しく →
          </Link>
        </span>
      )}
    </span>
  );
}
