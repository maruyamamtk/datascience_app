import Link from "next/link";
import { loadTerms } from "@/lib/content/terms";

/** 用語集（インデックス）。全用語ノードを一覧し、各定義ページへ導く。 */
export default function TermsIndexPage() {
  const terms = loadTerms();
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">用語集</h1>
      <p className="mt-2 text-sm text-slate-600">
        数式の項や本文からポップオーバーで参照される用語ノード（{terms.length} 件）。
      </p>
      <ul className="mt-6 divide-y divide-slate-100">
        {terms.map((t) => (
          <li key={t.slug} className="py-3">
            <Link href={`/terms/${t.slug}`} className="font-medium text-blue-700 hover:underline">
              {t.title}
            </Link>
            <p className="mt-0.5 text-sm text-slate-600">{t.definition}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
