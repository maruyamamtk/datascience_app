import Link from "next/link";
import { listTopics } from "@/lib/content/topics";

export const metadata = {
  title: "トピック一覧",
  description: "操作と数式が強連動する、Level 制のデータサイエンス学習トピック一覧。",
};

/**
 * トピック一覧ページ。`content/topics/*.mdx` の frontmatter から title/summary/status を読み、
 * カードで一覧表示する（トップからの回遊起点）。ルーティングは listTopicSlugs と同じ規約で自動追従。
 */
export default function TopicsIndexPage() {
  const topics = listTopics();
  const published = topics.filter((t) => t.status !== "draft");

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium tracking-widest text-slate-400 uppercase">Topics</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">学習トピック</h1>
      <p className="mt-3 leading-relaxed text-slate-600">
        各トピックは「概念 → 操作 → 演習」を 1 ページで往復でき、Level 0〜6
        で段階的に深掘りできます。 操作すると数式の該当項がリアルタイムに連動します。
      </p>

      <ul className="mt-8 space-y-4">
        {published.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/topics/${t.slug}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{t.title}</h2>
                {t.status === "published" ? null : (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {t.status}
                  </span>
                )}
              </div>
              {t.summary ? (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t.summary}</p>
              ) : null}
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                学ぶ →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap gap-3 text-sm">
        <Link href="/" className="text-slate-500 underline underline-offset-2 hover:text-slate-700">
          ← トップへ
        </Link>
        <Link
          href="/terms"
          className="text-slate-500 underline underline-offset-2 hover:text-slate-700"
        >
          用語集 →
        </Link>
      </div>
    </main>
  );
}
