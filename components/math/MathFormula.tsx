"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { forwardRef, useEffect, useImperativeHandle, useRef, type ForwardedRef } from "react";
import { TermController } from "./term-controller";

export type MathFormulaHandle = TermController;

type MathFormulaProps = {
  /** 描画する TeX。動的に更新したい項は components/math/tex.ts の term() で id を付ける。 */
  tex: string;
  /** display(別行立て) か inline か。既定は display。 */
  display?: boolean;
  className?: string;
  /** 描画完了後に TermController を受け取りたい場合のコールバック。 */
  onReady?: (controller: TermController) => void;
};

/**
 * KaTeX ラッパ（描画層）。`trust:true`/`strict:false` で `\htmlId` を許可し、
 * 項に id を付けられるようにする（walking-skeleton.md §3）。
 *
 * tex が変わったときだけ全体を再描画する。項の数値・色のリアルタイム更新は
 * 全体再描画ではなく、ref で受け取る TermController の DOM 差分パッチで行う。
 */
function MathFormulaInner(
  { tex, display = true, className, onReady }: MathFormulaProps,
  ref: ForwardedRef<MathFormulaHandle>,
) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const controllerRef = useRef<TermController | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    katex.render(tex, el, {
      displayMode: display,
      throwOnError: false,
      strict: false,
      trust: true,
    });
    const controller = new TermController(el);
    controllerRef.current = controller;
    onReady?.(controller);
    // onReady は呼び出し側で安定参照（useCallback）にする前提。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tex, display]);

  useImperativeHandle(ref, () => {
    // 常に最新の controller を返す薄いプロキシ。
    return new Proxy({} as TermController, {
      get(_target, prop) {
        const c = controllerRef.current;
        if (!c) return () => false;
        const value = c[prop as keyof TermController];
        return typeof value === "function" ? value.bind(c) : value;
      },
    });
  }, []);

  return <span ref={containerRef} className={className} aria-label={tex} role="math" />;
}

export const MathFormula = forwardRef(MathFormulaInner);
