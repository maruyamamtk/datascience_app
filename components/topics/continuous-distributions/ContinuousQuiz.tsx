"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "「次の地震までの待ち時間」のように «無記憶» な待ち時間を表す連続分布は？",
    choices: [
      { label: "指数分布", correct: true },
      { label: "ベータ分布", correct: false },
      { label: "一様分布", correct: false },
      { label: "対数正規分布", correct: false },
    ],
    explain:
      "指数分布は «無記憶性»（あと何分待つかが過去に依らない）を持つ唯一の連続分布。率 λ で平均 1/λ。ポアソン過程の «事象間の待ち時間» でもある。",
  },
  {
    prompt: "ガンマ分布 Gamma(k,θ) は何の分布か？",
    choices: [
      { label: "独立な指数分布を k 個足した和", correct: true },
      { label: "0〜1 の割合", correct: false },
      { label: "正規分布の絶対値", correct: false },
      { label: "掛け算的に増える量", correct: false },
    ],
    explain:
      "Gamma(k,θ) は Exp(1/θ) を k 個足した和（k 回目の事象までの待ち時間）。k=1 で指数、k を増やすと釣鐘型に近づく。平均 kθ、分散 kθ²。",
  },
  {
    prompt: "0〜1 の «割合・確率» 自体をモデル化するのに自然な分布は？",
    choices: [
      { label: "ベータ分布", correct: true },
      { label: "指数分布", correct: false },
      { label: "コーシー分布", correct: false },
      { label: "半正規分布", correct: false },
    ],
    explain:
      "ベータ分布は台が [0,1] で、割合や確率のモデルに最適。二項分布の共役事前分布でもあり、ベイズ更新で «成功/失敗» を反映して形が変わる。",
  },
  {
    prompt: "コーシー分布の «平均» について正しいのは？",
    choices: [
      { label: "存在しない（裾が重すぎて定義できない）", correct: true },
      { label: "0 である", correct: false },
      { label: "位置パラメータに等しい", correct: false },
      { label: "尺度パラメータに等しい", correct: false },
    ],
    explain:
      "コーシー分布は裾が極端に重く、平均を定義する積分が収束しない（分散も同様）。標本平均を取っても安定せず、外れ値が常に効く «病的な» 例。中心極限定理も成り立たない。",
  },
  {
    prompt: "所得や株価のように «掛け算的に» 変動し右に大きく裾を引く量に向く分布は？",
    choices: [
      { label: "対数正規分布", correct: true },
      { label: "一様分布", correct: false },
      { label: "ベータ分布", correct: false },
      { label: "半正規分布", correct: false },
    ],
    explain:
      "log を取ると正規分布になるのが対数正規。独立な «倍率» の積（=log の和）が正規に近づくため、掛け算的な量に現れる。常に正で右に裾を引く。",
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

/** 連続型確率分布 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function ContinuousQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#continuous-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って分布族とパラメータを切り替える
      </a>
    </div>
  );
}
