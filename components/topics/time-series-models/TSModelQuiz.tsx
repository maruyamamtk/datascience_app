"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "AR(1) モデル x_t = φ·x_{t-1} + e_t の φ が表すのは？",
    choices: [
      { label: "直前の値を «どれだけ引きずるか»。1に近いほど長い記憶（持続性）", correct: true },
      { label: "ノイズの分散", correct: false },
      { label: "季節の周期", correct: false },
      { label: "系列の長さ", correct: false },
    ],
    explain:
      "φ は自己回帰係数。x_t は直前 x_{t-1} を φ 倍して受け継ぐ。|φ|<1 で定常、φ が1に近いほど自己相関 ρ(k)=φ^k の減衰が遅く «長い記憶» になる。φ<0 は符号が交互のジグザグ。",
  },
  {
    prompt: "AR と MA の自己相関（ACF）の «指紋» の違いは？",
    choices: [
      { label: "AR は指数的にだらだら減衰、MA は次数で急に0へ切れる", correct: true },
      { label: "どちらも同じ", correct: false },
      { label: "AR は切れ、MA はだらだら減衰（逆）", correct: false },
      { label: "両方ラグ0以外すべて0", correct: false },
    ],
    explain:
      "AR(p) の ACF は減衰しつつ長く尾を引く（PACF が p 次で切れる）。MA(q) は逆で、ACF が q 次で «ぴたりと» 切れる（PACF がだらだら）。この対比が次数(p,q)決定の基本。",
  },
  {
    prompt: "ARIMA(p,d,q) の «I»（d）は何をする？",
    choices: [
      { label: "d 回の階差で非定常な系列を定常化してから ARMA を当てる", correct: true },
      { label: "データを d 倍する", correct: false },
      { label: "季節成分を足す", correct: false },
      { label: "予測期間を d に決める", correct: false },
    ],
    explain:
      "I は Integrated（和分）。トレンドなどで非定常な系列を d 回階差 Δ^d して定常にし、その上で ARMA(p,q) を適用する。ランダムウォークは ARIMA(0,1,0)：1回階差でホワイトノイズ。",
  },
  {
    prompt: "状態空間モデル（＋カルマンフィルタ）の考え方は？",
    choices: [
      { label: "観測の裏に «状態» の遷移を置き、観測から状態を逐次推定・予測する", correct: true },
      { label: "全データを一度に回帰するだけ", correct: false },
      { label: "自己相関を無視する", correct: false },
      { label: "乱数を使わない決定的モデル", correct: false },
    ],
    explain:
      "状態空間モデルは «状態方程式（潜在状態の遷移）»＋«観測方程式（状態＋雑音で観測）» の2層。カルマンフィルタは新しい観測が来るたびに状態の推定を更新（予測→修正）する。欠測・時変・多変量に強く、ARIMA を包含する枠組み。",
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

/** 時系列モデル 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function TSModelQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#tsmodel-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って φ を変え、自己相関の減衰と予測の変化を確かめる
      </a>
    </div>
  );
}
