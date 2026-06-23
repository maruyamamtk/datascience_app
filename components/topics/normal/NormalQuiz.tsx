"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "σ を 2 倍にすると、密度曲線の形はどうなる？",
    choices: [
      { label: "山が低く、横に広がる", correct: true },
      { label: "山が高く、横に狭まる", correct: false },
      { label: "山の位置が右にずれる", correct: false },
      { label: "形は変わらない", correct: false },
    ],
    explain:
      "σ は広がりを表す。大きくすると裾が広がり、全体の面積は 1 のままなのでピークは下がる。位置（μ）は変わらない。操作で σ を 1→2 にして確かめよう。",
  },
  {
    prompt: "正規分布で「μ ± 2σ」の範囲に観測値が入るおおよその確率は？",
    choices: [
      { label: "約 95%", correct: true },
      { label: "約 68%", correct: false },
      { label: "約 99.7%", correct: false },
      { label: "約 50%", correct: false },
    ],
    explain:
      "68-95-99.7 則。±1σ≈68%、±2σ≈95%、±3σ≈99.7%。μ・σ をどう動かしてもこの割合は不変（分布が相似だから）。",
  },
  {
    prompt: "観測値 x を z=(x-μ)/σ に標準化する目的として正しいのは？",
    choices: [
      { label: "どの正規分布も N(0,1) の共通の物差しで測れるようにするため", correct: true },
      { label: "分布を正規分布に変えるため", correct: false },
      { label: "平均を 0、分散を無限大にするため", correct: false },
    ],
    explain:
      "標準化は平均 0・標準偏差 1 にそろえる変換。これで «平均から何σ離れているか» を分布によらず比較でき、標準正規表ひとつで確率が読める。",
  },
];

/** 1 問ぶんの確認問題（選択 → 即時フィードバック）。CltQuiz と同じ様式。 */
function QuestionCard({ q, index }: { q: Question; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = answered && q.choices[selected].correct;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">
        Q{index + 1}. {q.prompt}
      </p>
      <div className="flex flex-wrap gap-2">
        {q.choices.map((c, i) => {
          const chosen = selected === i;
          const showState = answered && (chosen || c.correct);
          let cls = "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
          if (showState) {
            cls = c.correct
              ? "border-green-500 bg-green-50 text-green-800"
              : "border-red-400 bg-red-50 text-red-700";
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={chosen}
              className={`rounded-lg border px-3 py-2 text-sm transition ${cls}`}
            >
              {c.label}
              {showState && c.correct ? " ✓" : null}
              {showState && chosen && !c.correct ? " ✗" : null}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div
          className={`rounded-lg p-3 text-sm leading-relaxed ${
            isCorrect ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"
          }`}
          role="status"
        >
          <span className="font-semibold">{isCorrect ? "正解！ " : "もう一度考えてみよう。 "}</span>
          {q.explain}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 正規分布 演習（確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③）。
 */
export function NormalQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#normal-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って μ・σ を動かして確かめる
      </a>
    </div>
  );
}
