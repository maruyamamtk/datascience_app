"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "マルコフ性（マルコフ連鎖の «記憶のなさ»）とは？",
    choices: [
      { label: "次の状態の確率が «現在の状態» だけで決まり、過去の経路に依らない", correct: true },
      { label: "すべての状態が等確率", correct: false },
      { label: "状態が変化しない", correct: false },
      { label: "過去すべてに依存する", correct: false },
    ],
    explain:
      "マルコフ性: P(次 | 現在, 過去全部) = P(次 | 現在)。«今» さえ分かれば «昨日以前» は予測に不要。この «記憶のなさ» が遷移行列だけでモデルを決められる根拠。",
  },
  {
    prompt: "定常分布 π が満たす関係は？",
    choices: [
      { label: "πP = π（遷移で分布が変わらない）", correct: true },
      { label: "π = 0", correct: false },
      { label: "Pπ = 0", correct: false },
      { label: "π が一様分布", correct: false },
    ],
    explain:
      "定常分布は πP=π を満たす分布（遷移を1回かけても変わらない）。既約・非周期なら一意で、長期の «各状態の滞在割合» に一致する。",
  },
  {
    prompt: "既約・非周期なマルコフ連鎖で、初期分布を変えると長期の分布は？",
    choices: [
      { label: "初期分布によらず同じ定常分布に収束する（エルゴード性）", correct: true },
      { label: "初期分布ごとに違う分布へ", correct: false },
      { label: "収束しない", correct: false },
      { label: "常に一様分布へ", correct: false },
    ],
    explain:
      "エルゴード的（既約かつ非周期）な連鎖は «初期状態を忘れ»、どこから出発しても同じ定常分布に収束する。だから長期挙動は遷移行列だけで決まる。",
  },
  {
    prompt: "MCMC（マルコフ連鎖モンテカルロ）が利用するのは？",
    choices: [
      { label: "定常分布が目標分布になるよう連鎖を設計し、そこからサンプルを得る", correct: true },
      { label: "独立な一様乱数だけ", correct: false },
      { label: "回帰直線", correct: false },
      { label: "状態が1つだけの連鎖", correct: false },
    ],
    explain:
      "MCMC は «欲しい分布（事後分布など）を定常分布に持つマルコフ連鎖» を作り、長く走らせて定常分布からのサンプルとして使う。メトロポリス–ヘイスティングスやギブスサンプリングが代表。ベイズ計算の要。",
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

/** マルコフ連鎖 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function MarkovQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#markov-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って遷移確率を変え、定常分布の変化を確かめる
      </a>
    </div>
  );
}
