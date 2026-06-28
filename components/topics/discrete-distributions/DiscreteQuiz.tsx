"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "「1時間あたり平均3件かかってくる電話の件数」をモデル化するのに最も適した分布は？",
    choices: [
      { label: "ポアソン分布", correct: true },
      { label: "二項分布", correct: false },
      { label: "幾何分布", correct: false },
      { label: "離散一様分布", correct: false },
    ],
    explain:
      "一定時間に «稀な事象が独立に» 起こる回数はポアソン分布 Po(λ)。平均=分散=λ が特徴。二項で n→∞, p→0, np=λ の極限がポアソン。",
  },
  {
    prompt: "ポアソン分布 Po(λ) の平均と分散の関係は？",
    choices: [
      { label: "平均=分散=λ", correct: true },
      { label: "平均=λ, 分散=λ²", correct: false },
      { label: "平均=分散=√λ", correct: false },
      { label: "平均=分散だが値は不定", correct: false },
    ],
    explain:
      "Po(λ) は E[X]=Var[X]=λ。データで «分散が平均より大きい»（過分散）ならポアソンより負の二項が適することが多い。",
  },
  {
    prompt: "二項分布 Bin(n,p) でも、n→∞・p→0・np=λ 一定の極限はどの分布？",
    choices: [
      { label: "ポアソン分布 Po(λ)", correct: true },
      { label: "正規分布", correct: false },
      { label: "幾何分布", correct: false },
      { label: "一様分布", correct: false },
    ],
    explain:
      "«多数回の試行で各回は稀» のときポアソン近似。上のステッパーで n を増やすと Bin(n,λ/n) が Po(λ) に重なるのを確認できる。（n大・p中なら正規近似）",
  },
  {
    prompt: "「初めて成功するまでに何回失敗するか」を表す分布は？",
    choices: [
      { label: "幾何分布", correct: true },
      { label: "二項分布", correct: false },
      { label: "ポアソン分布", correct: false },
      { label: "ベルヌーイ分布", correct: false },
    ],
    explain:
      "幾何分布は初成功までの試行（または失敗）回数。これを «r 回成功するまで» に一般化すると負の二項分布。どちらも待ち時間系で右に裾を引く。",
  },
];

function QuestionCard({ q, index }: { q: Question; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = answered && q.choices[selected].correct;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">
        Q{index + 1}. {q.prompt}
      </p>
      <div className="flex flex-col gap-2">
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
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${cls}`}
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

/** 離散型確率分布 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function DiscreteQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#discrete-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って分布族とパラメータを切り替える
      </a>
    </div>
  );
}
