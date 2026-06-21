export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-medium tracking-widest text-slate-400 uppercase">
        Phase 0 · Walking Skeleton
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        データサイエンス学習アプリ
      </h1>
      <p className="text-lg leading-relaxed text-slate-600">
        操作と数式が強連動する、アルゴリズム図鑑スタイルの学習体験を作っています。
        まずは基盤（Next.js + TypeScript + Tailwind + Vitest）のセットアップが完了しました。
      </p>
      <ul className="space-y-2 text-slate-700">
        <li>✅ Next.js (App Router) + TypeScript</li>
        <li>✅ Tailwind CSS（余白多めのクリーンなレイアウト基盤）</li>
        <li>✅ ESLint / Prettier</li>
        <li>✅ Vitest（計算層の純関数テスト）</li>
        <li>✅ KaTeX 項ID連動スパイク</li>
        <li>✅ 状態管理基盤（Zustand トピックストア + 3層疎結合）</li>
        <li>✅ 可視化共通部品（コマ送り + ハイライト + コールアウト）</li>
      </ul>
      <div className="flex flex-wrap gap-3">
        <a
          href="/poc/math"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          PoC: 操作 → 数式の強連動を見る →
        </a>
        <a
          href="/poc/store"
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          PoC: 状態管理基盤（3層疎結合）→
        </a>
        <a
          href="/poc/viz"
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          PoC: 可視化共通部品（コマ送り図鑑）→
        </a>
      </div>
    </main>
  );
}
