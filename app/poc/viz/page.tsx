import type { Metadata } from "next";
import { VizPoc } from "./VizPoc";

export const metadata: Metadata = {
  title: "PoC: 可視化共通部品（コマ送り + ハイライト + コールアウト） | データサイエンス学習アプリ",
  description:
    "全トピックで使い回すアルゴリズム図鑑スタイルの共通部品 StepPlayer / Highlight / Callout / VizPanel をダミーのフレーム列で実証（Issue #4）。",
};

export default function VizPocPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium tracking-widest text-slate-400 uppercase">Viz · Issue #4</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        可視化共通部品（アルゴリズム図鑑スタイル）
      </h1>
      <p className="mt-3 mb-10 leading-relaxed text-slate-600">
        全トピックで使い回す「
        <strong>
          コマ送り（StepPlayer）/ 色ハイライト（Highlight）/ 近傍コールアウト（Callout）
        </strong>
        」の共通部品です。フレーム位置は Issue #3 のトピックストアの <code>frame</code> 状態を
        single source of truth として配線しています。
      </p>
      <VizPoc />
    </main>
  );
}
