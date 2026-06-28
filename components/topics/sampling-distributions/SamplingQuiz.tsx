"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "母標準偏差 σ が未知のとき、標本平均の標準化 (x̄−μ)/(s/√n) が従う分布は？",
    choices: [
      { label: "自由度 n−1 の t 分布", correct: true },
      { label: "標準正規分布", correct: false },
      { label: "カイ二乗分布", correct: false },
      { label: "F 分布", correct: false },
    ],
    explain:
      "σ を標本標準偏差 s で置き換えると、分母 s 自身がランダムに揺れるため裾が重くなり t 分布（自由度 n−1）に従う。n が大きいと s≈σ で標準正規に近づく。",
  },
  {
    prompt: "t 分布が標準正規より «裾が重い» のはなぜ？",
    choices: [
      { label: "標本標準偏差 s のぶれを織り込むから", correct: true },
      { label: "平均が違うから", correct: false },
      { label: "離散分布だから", correct: false },
      { label: "負の値を取らないから", correct: false },
    ],
    explain:
      "s が偶然小さく出ると比が大きく振れる。この «s の不確かさ» の分だけ外れ値が出やすく裾が重い。自由度（n−1）が小さいほど顕著で、ν→∞ で正規に一致。",
  },
  {
    prompt: "カイ二乗分布が現れるのは主にどんなとき？",
    choices: [
      { label: "正規標本の二乗和（標本分散）・適合度検定の統計量", correct: true },
      { label: "2 群の平均の差", correct: false },
      { label: "相関係数", correct: false },
      { label: "中央値", correct: false },
    ],
    explain:
      "標準正規を k 個二乗して足すと自由度 k のカイ二乗。(n−1)s²/σ² がカイ二乗に従い、分散の検定や適合度検定（観測度数と期待度数のずれ）に使う。平均 k、分散 2k。",
  },
  {
    prompt: "F 分布が使われる典型は？",
    choices: [
      { label: "分散分析・等分散検定（2 つの分散の比）", correct: true },
      { label: "1 標本の平均の検定", correct: false },
      { label: "比率の検定", correct: false },
      { label: "順位相関", correct: false },
    ],
    explain:
      "F = (χ²_{d1}/d1)/(χ²_{d2}/d2) は «分散の比»。分散分析（群間分散/群内分散）や等分散検定に使う。t 分布の二乗は自由度(1, ν)の F に等しい。",
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

/** 標本分布 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function SamplingQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#sampling-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って分布と自由度を切り替える
      </a>
    </div>
  );
}
