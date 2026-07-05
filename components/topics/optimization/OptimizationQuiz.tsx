"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "勾配降下法の更新式 x_{k+1} = x_k − η·∇f(x_k) で «勾配の逆向き» に進むのはなぜ？",
    choices: [
      { label: "勾配 ∇f は最も急に増える向きなので、その逆が最も急に減る向きだから", correct: true },
      { label: "勾配の向きが最も急に減る向きだから", correct: false },
      { label: "計算が速くなるから", correct: false },
      { label: "勾配は必ず 0 だから", correct: false },
    ],
    explain:
      "勾配 ∇f は «その点で f が最も急に増える向き»。最小化したいので、その逆向き −∇f（最も急に減る向き）へ進む。歩幅を決めるのが学習率 η。谷底では ∇f=0（傾き 0）になり更新が止まる。",
  },
  {
    prompt: "凸2次関数 f(x)=½x²（f″=1）で、学習率 η を «大きくしすぎる» と何が起きる？",
    choices: [
      { label: "η が閾値 2 を超えると毎回行き過ぎが増幅し、発散する", correct: true },
      { label: "η が大きいほど常に速く確実に収束する", correct: false },
      { label: "η は収束の速さに影響しない", correct: false },
      { label: "必ず1歩で最小点に到達する", correct: false },
    ],
    explain:
      "更新は x←x(1−η)。収束条件は |1−η|<1、つまり 0<η<2。η<1 で単調収束、1<η<2 で振動しながら収束、η>2 で発散。一般に凸2次 ½ax² では条件は η<2/a。«大きいほど速い» ではなく、大きすぎると壊れる。",
  },
  {
    prompt: "なめらかな関数が最小（極小）になる点 x* の «必要条件» は？",
    choices: [
      { label: "勾配が 0（∇f(x*)=0、1変数なら f′(x*)=0）", correct: true },
      { label: "関数値が 0（f(x*)=0）", correct: false },
      { label: "学習率が 0", correct: false },
      { label: "2階微分が 0（f″(x*)=0）", correct: false },
    ],
    explain:
      "極値では接線・接平面が水平、すなわち勾配 0（停留点）。これは必要条件で、極小か極大か鞍点かはヘッセ行列（2階微分）で判定する（正定値なら極小）。勾配降下はこの «勾配 0» の点を数値的に探す手続き。",
  },
  {
    prompt: "目的関数が «凸» であることの，最適化にとってのうれしさは？",
    choices: [
      { label: "局所最小が必ず大域最小になり、勾配 0 の点を見つければ最適が保証される", correct: true },
      { label: "微分が不要になる", correct: false },
      { label: "学習率をいくら大きくしても発散しなくなる", correct: false },
      { label: "必ず解析解が存在する", correct: false },
    ],
    explain:
      "凸関数では局所最小＝大域最小なので、勾配降下が «偽の谷（局所最小）» に捕まる心配がなく、停留点を見つければ大域最適が保証される。非凸（深層学習の損失など）では複数の谷があり、初期値や学習率の工夫が要る。凸性は最適化を «簡単な問題» にする鍵。",
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

/** 最適化 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function OptimizationQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#opt-gd"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って学習率 η を動かし、収束・振動・発散の切り替わり（閾値 η=2）を確かめる
      </a>
    </div>
  );
}
