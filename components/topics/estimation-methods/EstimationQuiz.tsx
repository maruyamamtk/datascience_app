"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "最尤法（MLE）が選ぶ母数は？",
    choices: [
      { label: "観測データが最も起こりやすくなる母数", correct: true },
      { label: "事前分布が最も大きい母数", correct: false },
      { label: "残差を最大にする母数", correct: false },
      { label: "母数の真の値", correct: false },
    ],
    explain:
      "最尤法は «このデータが出る確率（尤度）» を最大にする母数を選ぶ。対数尤度の勾配が 0 になる点が最尤推定量。指数分布なら λ̂=1/x̄。",
  },
  {
    prompt: "モーメント法の考え方は？",
    choices: [
      { label: "標本モーメントと理論モーメントを一致させて母数を解く", correct: true },
      { label: "尤度を最大化する", correct: false },
      { label: "残差平方和を最小化する", correct: false },
      { label: "事後分布の最頻値を取る", correct: false },
    ],
    explain:
      "モーメント法は «標本平均＝理論平均» のように低次のモーメントを一致させて母数を解く。計算が簡単だが、最尤法より効率が劣ることが多い。一様 U[0,θ] では 2x̄（最尤は max）。",
  },
  {
    prompt: "一様分布 U[0,θ] で、モーメント法推定 2x̄ が観測の最大値より小さくなったら？",
    choices: [
      {
        label: "ありえない θ（最大の観測すら覆えない）で、最尤法の max の方が筋が良い",
        correct: true,
      },
      { label: "問題ない、2x̄ が常に正しい", correct: false },
      { label: "θ を 0 にする", correct: false },
      { label: "標本を捨てる", correct: false },
    ],
    explain:
      "θ は全観測以上でなければならない（U[0,θ] なので）。2x̄ が max を下回ると «観測した値が出るはずのない θ» になり矛盾。最尤推定 max(xᵢ) は必ず観測を覆う。推定法で答えが変わる好例。",
  },
  {
    prompt: "正規分布の誤差を仮定したとき、最小二乗法（残差平方和の最小化）は何と一致する？",
    choices: [
      { label: "最尤法", correct: true },
      { label: "モーメント法のみ", correct: false },
      { label: "ベイズ推定", correct: false },
      { label: "中央値推定", correct: false },
    ],
    explain:
      "誤差が正規 N(0,σ²) なら対数尤度の最大化 = 残差平方和の最小化（指数の肩が −Σ残差²/2σ²）。だから «最小二乗＝正規誤差の最尤» で、回帰の正当性につながる。線形模型の推定はこの枠組み。",
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

/** 推定法 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function EstimationQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#estimation-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って λ を動かし、対数尤度の頂上を探す
      </a>
    </div>
  );
}
