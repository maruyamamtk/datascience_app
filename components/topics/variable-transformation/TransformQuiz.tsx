"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "Y = aX + b のとき、分散 Var[Y] は？",
    choices: [
      { label: "a²·Var[X]（b は効かない）", correct: true },
      { label: "a·Var[X] + b", correct: false },
      { label: "a·Var[X]", correct: false },
      { label: "(a+b)²·Var[X]", correct: false },
    ],
    explain:
      "Var[aX+b]=a²Var[X]。平行移動 b はばらつきを変えない（全体が平行に動くだけ）。スケール a は «二乗» で効く。標準偏差なら |a|·σ。",
  },
  {
    prompt: "変数変換 Y=g(X) の密度に現れる «ヤコビアン» |dx/dy| の役割は？",
    choices: [
      { label: "面積（確率）を 1 に保つための高さの補正", correct: true },
      { label: "平均をずらす", correct: false },
      { label: "確率を負にする", correct: false },
      { label: "x を整数にする", correct: false },
    ],
    explain:
      "横軸を伸縮すると面積が変わってしまうので、密度の高さを |dx/dy| 倍して «確率の総和=1» を保つ。Y=aX なら高さは 1/|a| 倍。",
  },
  {
    prompt: "独立な X, Y について、和 Z=X+Y の分散は？",
    choices: [
      { label: "Var[X] + Var[Y]", correct: true },
      { label: "Var[X] − Var[Y]", correct: false },
      { label: "Var[X]·Var[Y]", correct: false },
      { label: "(Var[X]+Var[Y])/2", correct: false },
    ],
    explain:
      "独立なら Var[X+Y]=Var[X]+Var[Y]（共分散 0）。差 X−Y でも Var[X−Y]=Var[X]+Var[Y]（分散は «足し算»）。一般には +2Cov(X,Y) が付く。",
  },
  {
    prompt: "独立な2つの分布の «和» の分布を求める演算は？",
    choices: [
      { label: "畳み込み（convolution）", correct: true },
      { label: "掛け算", correct: false },
      { label: "周辺化", correct: false },
      { label: "標準化", correct: false },
    ],
    explain:
      "P(Z=k)=Σ_i P(X=i)P(Y=k−i) が畳み込み。2つのサイコロの和が三角形になるのもこれ。母関数では «積» に化けるので計算が楽になる。",
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

/** 変数変換 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function TransformQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#transform-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って a・b・σ を動かす
      </a>
    </div>
  );
}
