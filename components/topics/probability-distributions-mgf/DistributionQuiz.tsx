"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "累積分布関数 F(x)=P(X≤x) について必ず正しいのは？",
    choices: [
      { label: "単調非減少で、右端は 1 に収束する", correct: true },
      { label: "必ず減少する", correct: false },
      { label: "合計が 1 になる（面積が 1）", correct: false },
      { label: "負の値を取りうる", correct: false },
    ],
    explain:
      "F は確率の «積み上げ» なので単調非減少、x→∞ で 1、x→−∞ で 0。面積が 1 になるのは確率密度関数 f（連続）や確率関数 P（離散）の方で、F そのものではない。",
  },
  {
    prompt: "生存関数 S(x) の定義は？",
    choices: [
      { label: "S(x) = 1 − F(x) = P(X > x)", correct: true },
      { label: "S(x) = F(x)", correct: false },
      { label: "S(x) = P(X = x)", correct: false },
      { label: "S(x) = 1 + F(x)", correct: false },
    ],
    explain:
      "生存関数は «それより大きくなる» 確率 P(X>x)=1−F(x)。寿命・待ち時間・信頼性で «まだ起きていない確率» として使う。",
  },
  {
    prompt: "同時分布 P(X,Y) から周辺分布 P(X) を得るには？",
    choices: [
      { label: "Y について足し合わせる（周辺化）", correct: true },
      { label: "P(Y) で割る", correct: false },
      { label: "P(X,Y) を2乗する", correct: false },
      { label: "対角成分だけ取る", correct: false },
    ],
    explain:
      "P(X=i)=Σ_j P(X=i,Y=j)。もう一方の変数を «足して消す» のが周辺化。条件付き P(X|Y=y) は逆に «その列だけ» 取り出して P(Y=y) で割る。",
  },
  {
    prompt: "モーメント母関数 M_X(t)=E[e^{tX}] が «母関数» と呼ばれる理由は？",
    choices: [
      { label: "0 で k 回微分すると k 次モーメント E[X^k] が出る", correct: true },
      { label: "確率の総和を生成するから", correct: false },
      { label: "常に分布を一意に決めるから", correct: false },
      { label: "平均だけを与えるから", correct: false },
    ],
    explain:
      "M^{(k)}(0)=E[X^k]。テイラー展開 e^{tX}=Σ (tX)^k/k! の期待値を取ると係数にモーメントが並ぶため、微分で «生成» できる。M'(0)=μ、M''(0)=E[X²]。",
  },
  {
    prompt: "確率母関数 G_X(z)=E[z^X]（非負整数値の X）について正しいのは？",
    choices: [
      { label: "G(1)=1 で、独立な和の母関数は積になる", correct: true },
      { label: "G(0)=1", correct: false },
      { label: "連続分布にしか使えない", correct: false },
      { label: "G'(0)=平均", correct: false },
    ],
    explain:
      "G(1)=Σ P(X=k)=1。独立な X,Y では G_{X+Y}(z)=G_X(z)G_Y(z)（畳み込みが積に化ける）。だから二項分布＝独立ベルヌーイの和の母関数が (1−p+pz)^n になる。",
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

/** 確率分布と母関数 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function DistributionQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#dist-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って n・p・しきい値 x を動かす
      </a>
    </div>
  );
}
