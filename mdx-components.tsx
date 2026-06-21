import type { MDXComponents } from "mdx/types";
import { MathFormula } from "@/components/math/MathFormula";
import {
  Concept,
  Derivation,
  Exercise,
  Interact,
  Level,
  ReaderGuide,
  Term,
  Topic,
} from "@/components/content";

/**
 * App Router の MDX で使えるコンポーネントを登録する（@next/mdx の規約: ルート直下に配置）。
 * - コンテンツ基盤の Level 制テンプレート部品と用語リンクを全 MDX で利用可能にする。
 * - 素の markdown 要素にも余白多めのクリーンな既定スタイルを与える（図鑑スタイル, SPEC §4.4）。
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Level 制テンプレート + 用語リンク + 数式。
    Topic,
    ReaderGuide,
    Level,
    Concept,
    Interact,
    Exercise,
    Derivation,
    Term,
    Math: MathFormula,

    // 既定 markdown 要素のスタイル。
    h3: (props) => <h3 className="text-lg font-semibold text-slate-900" {...props} />,
    h4: (props) => <h4 className="font-semibold text-slate-800" {...props} />,
    p: (props) => <p className="leading-relaxed text-slate-700" {...props} />,
    ul: (props) => <ul className="list-disc space-y-1 pl-5 text-slate-700" {...props} />,
    ol: (props) => <ol className="list-decimal space-y-1 pl-5 text-slate-700" {...props} />,
    a: (props) => <a className="text-blue-700 underline underline-offset-2" {...props} />,
    strong: (props) => <strong className="font-semibold text-slate-900" {...props} />,
    code: (props) => (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-800" {...props} />
    ),
    hr: () => <hr className="border-slate-200" />,
    ...components,
  };
}
