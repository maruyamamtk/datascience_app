import type { Metadata } from "next";
import { MathPoc } from "./MathPoc";

export const metadata: Metadata = {
  title: "PoC: 操作→数式の強連動 | データサイエンス学習アプリ",
  description:
    "KaTeX の項に id を付与し、スライダー操作で特定項の数値・ハイライトを DOM 差分パッチで連動させる技術検証（Issue #2）。",
};

export default function MathPocPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium tracking-widest text-slate-400 uppercase">
        Spike · Issue #2
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        操作 → 数式の強連動（PoC）
      </h1>
      <p className="mt-3 mb-10 leading-relaxed text-slate-600">
        本アプリ最大のリスク「操作と数式の強連動」を最小構成で検証します。KaTeX の各項に id
        を付与し、スライダー操作で<strong>該当項だけ</strong>を DOM
        差分パッチで更新します（数式全体は再描画しません）。
      </p>
      <MathPoc />
    </main>
  );
}
