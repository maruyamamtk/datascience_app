"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "有病率1%・感度99%・特異度99%の検査で陽性だった。実際に病気である確率に最も近いのは？",
    choices: [
      { label: "約50%", correct: true },
      { label: "約99%", correct: false },
      { label: "約1%", correct: false },
      { label: "約90%", correct: false },
    ],
    explain:
      "1000人なら病気10人・健康990人。陽性は真陽性≈10人＋偽陽性≈10人で計20人。その中で病気は10人＝P(D|+)≈50%。感度99%でも有病率が低いと «陽性でも病気» は半々。P(+|D) と P(D|+) を取り違えないこと。",
  },
  {
    prompt: "P(A|B)（B が起きたとき A）と P(B|A)（A が起きたとき B）の関係は？",
    choices: [
      { label: "一般には別物。ベイズの定理で結ばれる", correct: true },
      { label: "常に等しい", correct: false },
      { label: "足すと1になる", correct: false },
      { label: "掛けると1になる", correct: false },
    ],
    explain:
      "条件付き確率は «向き» で値が変わる。P(A|B)=P(B|A)P(A)/P(B) がベイズの定理。例「病気→陽性」と「陽性→病気」は事前確率（有病率）次第で大きく異なる。",
  },
  {
    prompt: "事象 A, B が統計的に独立であることの定義は？",
    choices: [
      { label: "P(A∩B) = P(A)·P(B)", correct: true },
      { label: "P(A∪B) = P(A)+P(B)", correct: false },
      { label: "A と B が同時に起こらない（排反）", correct: false },
      { label: "P(A|B) = 0", correct: false },
    ],
    explain:
      "独立は P(A∩B)=P(A)P(B)、同値に P(A|B)=P(A)（B を知っても A の確率が変わらない）。排反（同時に起こらない）とは別概念で、排反かつ両方確率正なら «独立ではない»。",
  },
  {
    prompt: "5人から3人を選んで1列に並べる方法は何通り？",
    choices: [
      { label: "60通り（5P3＝5·4·3）", correct: true },
      { label: "10通り（5C3）", correct: false },
      { label: "120通り（5!）", correct: false },
      { label: "15通り", correct: false },
    ],
    explain:
      "並べる（順序を区別する）ので順列 5P3 = 5·4·3 = 60。順序を区別せず «選ぶだけ» なら組合せ 5C3 = 10。並べる=順列、選ぶ=組合せ。",
  },
  {
    prompt: "1〜100で「2の倍数または3の倍数」は何個？（包除原理）",
    choices: [
      { label: "67個（50+33−16）", correct: true },
      { label: "83個（50+33）", correct: false },
      { label: "99個", correct: false },
      { label: "16個", correct: false },
    ],
    explain:
      "|A∪B|=|A|+|B|−|A∩B|。2の倍数50、3の倍数33、6の倍数（両方）16。50+33−16=67。重複（6の倍数）を二重に数えないよう引くのが包除原理。",
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

/** 事象と確率 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function ProbabilityQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#probability-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って有病率・感度を動かして確かめる
      </a>
    </div>
  );
}
