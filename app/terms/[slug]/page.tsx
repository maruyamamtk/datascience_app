import Link from "next/link";
import { notFound } from "next/navigation";
import { TermsProvider } from "@/components/content";
import { loadTerms, toTermRecord } from "@/lib/content/terms";

/** ビルド時に全用語ページを静的生成。 */
export function generateStaticParams() {
  return loadTerms().map((t) => ({ slug: t.slug }));
}

/**
 * 用語ノードの詳細ページ。ポップオーバーの「詳しく →」と、用語本文の相対リンクの着地点。
 * 本文 MDX を描画し、配下の用語リンクも解決できるよう TermsProvider を供給する。
 */
export default async function TermPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const terms = loadTerms();
  if (!terms.some((t) => t.slug === slug)) notFound();

  const { default: Content } = await import(`../../../content/terms/${slug}.mdx`);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/terms" className="text-sm text-blue-700 hover:underline">
        ← 用語集
      </Link>
      <TermsProvider terms={toTermRecord(terms)}>
        <div className="mt-4 space-y-4">
          <Content />
        </div>
      </TermsProvider>
    </main>
  );
}
