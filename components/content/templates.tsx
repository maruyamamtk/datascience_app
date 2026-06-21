import type { ReactNode } from "react";

/**
 * Level 制トピックの構造部品（SPEC §4.1, §4.1.5）。
 * すべてのトピックを「L0〜L6 の階層的深掘り」+「概念→操作→演習」で統一するための雛形。
 * 副作用を持たない純粋な描画（RSC）。操作を伴う部分は別途 client 部品（viz / Term）を埋め込む。
 */

/** Level ごとの位置づけ（SPEC §4.1.5 の表に対応）。バッジ表示に使う。 */
const LEVEL_META: Record<number, { label: string; color: string }> = {
  0: { label: "ブラックボックス", color: "#64748b" },
  1: { label: "古典的理解", color: "#2563eb" },
  2: { label: "仮定体系", color: "#0891b2" },
  3: { label: "予測最適化", color: "#7c3aed" },
  4: { label: "因果", color: "#db2777" },
  5: { label: "高次元/最先端", color: "#ea580c" },
  6: { label: "フロンティア", color: "#16a34a" },
};

/** トピック全体のラッパ。冒頭に対象読者ガイドを置き、以降に Level 群を並べる。 */
export function Topic({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {summary && <p className="mt-3 text-lg leading-relaxed text-slate-600">{summary}</p>}
      </header>
      <div className="space-y-12">{children}</div>
    </article>
  );
}

/**
 * 対象読者ガイド（定型ブロック）。「どの Level からどう読むか」を冒頭に明示する（SPEC §4.1.5）。
 * 行は <li> で列挙する想定（例: 「初学者 → L0〜L1」）。
 */
export function ReaderGuide({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <p className="mb-2 text-sm font-semibold tracking-wide text-amber-900">
        📖 対象読者ガイド — どの Level からどう読むか
      </p>
      <div className="space-y-1 text-sm leading-relaxed text-amber-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-3 text-xs text-amber-700">
        ※ Level は「順序」ではなく「多角的な観点」。完全に理解したと思ったら次の Level へ。
      </p>
    </aside>
  );
}

/**
 * Level 枠。level（0〜6）と title を必須にし、各トピックが Level 構造を必ず持つよう強制する。
 * 中身が未充足のときは status="planned" を渡して「到達途上」と正直に明示する（SPEC §4.1.5）。
 */
export function Level({
  level,
  title,
  status = "ready",
  children,
}: {
  level: number;
  title: string;
  status?: "ready" | "planned";
  children?: ReactNode;
}) {
  const meta = LEVEL_META[level] ?? { label: "", color: "#64748b" };
  return (
    <section
      id={`level-${level}`}
      className="scroll-mt-6 border-t border-slate-200 pt-8"
      aria-label={`Level ${level}: ${title}`}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold text-white"
          style={{ backgroundColor: meta.color }}
        >
          Level {level}
        </span>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <span className="text-xs font-medium text-slate-400">{meta.label}</span>
      </div>
      {status === "planned" ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          🚧 この Level は到達途上です（枠のみ用意）。{children}
        </div>
      ) : (
        <div className="space-y-6">{children}</div>
      )}
    </section>
  );
}

/** Level 内の小見出し付きブロック共通レイアウト。 */
function SectionBlock({
  badge,
  label,
  accent,
  children,
}: {
  badge: string;
  label: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs text-white"
          style={{ backgroundColor: accent }}
        >
          {badge}
        </span>
        {label}
      </p>
      <div className="prose-content space-y-3 text-slate-700">{children}</div>
    </div>
  );
}

/** ① 概念（直感的導入 → 数式 → 導出）。 */
export function Concept({ children }: { children: ReactNode }) {
  return (
    <SectionBlock badge="①" label="概念" accent="#2563eb">
      {children}
    </SectionBlock>
  );
}

/** ② 操作（インタラクティブ可視化。数式項と強連動）。 */
export function Interact({ children }: { children: ReactNode }) {
  return (
    <SectionBlock badge="②" label="操作" accent="#0891b2">
      {children}
    </SectionBlock>
  );
}

/** ③ 演習（確認問題 → 即時フィードバック → 操作へ戻る）。 */
export function Exercise({ children }: { children: ReactNode }) {
  return (
    <SectionBlock badge="③" label="演習" accent="#7c3aed">
      {children}
    </SectionBlock>
  );
}

/**
 * 導出・証明（全ステップ折りたたみ）。結論だけでなく途中式を畳んで提示する（CLAUDE.md §0-4, SPEC §4.2）。
 */
export function Derivation({
  title = "導出を見る",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50 p-4 [&[open]]:bg-white">
      <summary className="cursor-pointer text-sm font-medium text-slate-700 select-none">
        {title}
      </summary>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </details>
  );
}
