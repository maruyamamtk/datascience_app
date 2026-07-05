"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "微分係数 f′(x₀) が表す «幾何的な意味» は？",
    choices: [
      { label: "点 (x₀, f(x₀)) における接線の傾き＝その瞬間の変化率", correct: true },
      { label: "曲線と x 軸で囲まれた面積", correct: false },
      { label: "関数の平均値", correct: false },
      { label: "x₀ での関数の値そのもの", correct: false },
    ],
    explain:
      "微分係数 f′(x₀) は接線の傾きで、x が少し増えたとき f がどれだけ増えるかの «瞬間の変化率»。定義は割線の傾き (f(x₀+h)−f(x₀))/h の h→0 の極限。面積は積分、値そのものは f(x₀) で別物。",
  },
  {
    prompt: "定積分 ∫ₐᵇ f(x) dx（f≥0 のとき）が表すものは？",
    choices: [
      { label: "曲線 f と x 軸・区間 [a,b] で囲まれた領域の面積", correct: true },
      { label: "区間の端点での傾きの差", correct: false },
      { label: "f の最大値", correct: false },
      { label: "接線の本数", correct: false },
    ],
    explain:
      "定積分は «曲線の下の面積»。区間を細い短冊に分け、面積を足したリーマン和の、分割を細かくした極限として定義される。中点則や台形則はその数値近似で、本数を倍にするほど真値に収束する。",
  },
  {
    prompt: "微積分学の基本定理が述べる «微分と積分の関係» は？",
    choices: [
      { label: "面積関数 A(x)=∫ₐˣ f(t)dt を微分すると元の f(x) に戻る（互いに逆の操作）", correct: true },
      { label: "微分と積分は無関係な別々の操作", correct: false },
      { label: "積分すると必ず値が2倍になる", correct: false },
      { label: "微分は必ず積分より難しい", correct: false },
    ],
    explain:
      "基本定理は A′(x)=f(x)、すなわち «積分してから微分すると元に戻る»。だから定積分は原始関数 F（F′=f）を使って ∫ₐᵇ f = F(b)−F(a) と計算できる。微分（接線）と積分（面積）は表裏一体。",
  },
  {
    prompt: "なめらかな関数が x₀ で «極値（山頂・谷底）» をとるための必要条件は？",
    choices: [
      { label: "f′(x₀)=0（接線が水平になる）", correct: true },
      { label: "f(x₀)=0", correct: false },
      { label: "積分が 0 になる", correct: false },
      { label: "f″(x₀)=0", correct: false },
    ],
    explain:
      "極値では接線が水平、つまり f′(x₀)=0（停留点）。これは必要条件で、山か谷かは2階微分 f″ の符号（f″>0 で谷、f″<0 で山）で判定する。«勾配 0 を探す» のは最適化の中心的な考え方。ただし f′=0 でも変曲点のこともある（十分条件ではない）。",
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

/** 微分積分 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function CalculusQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#calc-derivative"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って x₀ を動かし、接線の傾き f′(x₀) と極値（傾き 0）を確かめる
      </a>
    </div>
  );
}
