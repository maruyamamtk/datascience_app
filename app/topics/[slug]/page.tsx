import { notFound } from "next/navigation";
import { TermsProvider } from "@/components/content";
import { loadTerms, toTermRecord } from "@/lib/content/terms";
import { listTopicSlugs } from "@/lib/content/topics";

/** ビルド時に全トピックを静的生成（PWA/オフライン閲覧向き）。 */
export function generateStaticParams() {
  return listTopicSlugs().map((slug) => ({ slug }));
}

/**
 * トピック表示ルート。`content/topics/<slug>.mdx` を読み、用語 registry を
 * TermsProvider で供給して描画する（用語リンクのポップオーバーが解決できる状態にする）。
 */
export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!listTopicSlugs().includes(slug)) notFound();

  const { default: Content } = await import(`../../../content/topics/${slug}.mdx`);
  const terms = toTermRecord(loadTerms());

  return (
    <main className="min-h-screen bg-white">
      <TermsProvider terms={terms}>
        <Content />
      </TermsProvider>
    </main>
  );
}
