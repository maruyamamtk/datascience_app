import type { Metadata } from "next";
import { StorePoc } from "./StorePoc";

export const metadata: Metadata = {
  title: "PoC: 状態管理基盤（3層疎結合） | データサイエンス学習アプリ",
  description:
    "Zustand トピックストアを single source of truth とし、Control/Compute/Render を疎結合に配線。1つの操作変更が Graph と Math の両方へ一貫反映される（Issue #3）。",
};

export default function StorePocPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium tracking-widest text-slate-400 uppercase">
        Infra · Issue #3
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        状態管理基盤（3層疎結合）の配線パターン
      </h1>
      <p className="mt-3 mb-10 leading-relaxed text-slate-600">
        操作値の <strong>single source of truth</strong> を Zustand のトピック単位ストアに集約し、
        Control（操作）/ Compute（純関数）/ Render（Graph・Math・数値）を疎結合に分離します。 Math
        と Graph と数値表示は<strong>同一ストアを購読</strong>するため、 1
        つの状態変更が全てへ一貫して反映されます。
      </p>
      <StorePoc />
    </main>
  );
}
