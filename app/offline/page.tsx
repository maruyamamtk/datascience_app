import Link from "next/link";

/**
 * オフライン時のフォールバックページ（Service Worker が未キャッシュのページで返す）。
 * 閲覧済みページはキャッシュから開けるが、未訪問ページはここに誘導する。
 */
export const metadata = {
  title: "オフライン — データサイエンス学習アプリ",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6 py-16 text-center">
      <p className="text-sm font-medium tracking-widest text-slate-400 uppercase">Offline</p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">オフラインです</h1>
      <p className="leading-relaxed text-slate-600">
        このページはまだ保存されていないため、オフラインでは開けません。
        一度開いたトピックはオフラインでも閲覧できます。接続が戻ったら再度お試しください。
      </p>
      <div className="flex justify-center">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          トップへ戻る →
        </Link>
      </div>
    </main>
  );
}
