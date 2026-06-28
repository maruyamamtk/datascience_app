"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "分散分析（ANOVA）が判断するのは？",
    choices: [
      { label: "3群以上の平均に差があるか（群間の差を群内のばらつきと比べて）", correct: true },
      { label: "2群の分散が等しいか", correct: false },
      { label: "相関の強さ", correct: false },
      { label: "データが正規分布か", correct: false },
    ],
    explain:
      "ANOVA は «群間の差» を «群内の偶然のばらつき» と比べて、3群以上の平均差を一括検定する。t 検定の3群以上への一般化。名前は «分散» 分析だが、見ているのは平均の差。",
  },
  {
    prompt: "全変動の分解 SS_total = ? として正しいのは？",
    choices: [
      { label: "SS_between（級間）+ SS_within（級内）", correct: true },
      { label: "SS_between − SS_within", correct: false },
      { label: "SS_between × SS_within", correct: false },
      { label: "SS_total は分解できない", correct: false },
    ],
    explain:
      "全変動（総平均からのずれ²和）は «級間変動（群平均の違い）» と «級内変動（群の中の誤差）» にちょうど分かれる。この直交分解が分散分析の核心。",
  },
  {
    prompt: "F 統計量 F = MS_between/MS_within が大きいとき？",
    choices: [
      { label: "群間の差が群内のばらつきに比べて大きい＝差がありそう", correct: true },
      { label: "すべての群が同じ", correct: false },
      { label: "誤差が大きい", correct: false },
      { label: "サンプルが少ない", correct: false },
    ],
    explain:
      "帰無仮説（全群が同じ平均）なら F は1付近。F が大きい＝群の差が «偶然の誤差» では説明できないほど大きい。F 分布の上側確率が p 値。",
  },
  {
    prompt: "分散分析で «有意» が出た後、«どの群が違うか» を調べるには？",
    choices: [
      { label: "多重比較（テューキー法など、検定の繰り返しの誤りを調整）", correct: true },
      { label: "もう一度同じ ANOVA", correct: false },
      { label: "相関係数", correct: false },
      { label: "調べる必要はない", correct: false },
    ],
    explain:
      "ANOVA は «どこかに差がある» までしか言わない。どの対かは多重比較で。ただ総当たり t 検定をすると第1種の誤りが膨らむので、テューキー法・ボンフェローニ等で調整する。",
  },
  {
    prompt: "実験計画法で «乱塊法（randomized block）» が扱うのは？",
    choices: [
      { label: "ブロック（誤差要因）を層別し、その変動を分離して検出力を上げる", correct: true },
      { label: "データをランダムに捨てる", correct: false },
      { label: "群を1つにまとめる", correct: false },
      { label: "分散を0にする", correct: false },
    ],
    explain:
      "乱塊法は «興味のない変動要因（ブロック）» を層別し、その変動を誤差から分離する。誤差分散が小さくなり処理効果を検出しやすい。二元配置分散分析で «ブロック» を要因に入れる形。",
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

/** 分散分析 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function AnovaQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#anova-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って隔たりを動かし、F と p を確かめる
      </a>
    </div>
  );
}
