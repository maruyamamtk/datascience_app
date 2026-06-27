"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "データに1つだけ極端に大きい外れ値を加えると、最も大きく動くのは？",
    choices: [
      { label: "平均（期待値）", correct: true },
      { label: "中央値", correct: false },
      { label: "最頻値", correct: false },
      { label: "どれも動かない", correct: false },
    ],
    explain:
      "平均は全点の «重心» なので外れ値に引っ張られる。中央値・最頻値は順位や頻度ベースで外れ値に頑健。だから歪んだ分布では平均>中央値（右に裾）のようなズレが出る。",
  },
  {
    prompt: "歪度（skewness）が正であることが意味するのは？",
    choices: [
      { label: "右に裾が長い（大きい側に外れる）", correct: true },
      { label: "左に裾が長い", correct: false },
      { label: "左右対称", correct: false },
      { label: "分散が大きい", correct: false },
    ],
    explain:
      "歪度 γ₁=E[(X−μ)³]/σ³。3乗は符号を保つので、大きい側の外れが効くと正。所得分布のように «右に裾» が典型。負なら左に裾。",
  },
  {
    prompt: "超過尖度（excess kurtosis）の基準点 0 はどの分布？",
    choices: [
      { label: "正規分布", correct: true },
      { label: "一様分布", correct: false },
      { label: "指数分布", correct: false },
      { label: "ベルヌーイ分布", correct: false },
    ],
    explain:
      "超過尖度 = E[(X−μ)⁴]/σ⁴ − 3。正規分布の尖度が 3 なので、そこを 0 に揃えたもの。正なら «裾が重く尖る»、負なら «平たい»。",
  },
  {
    prompt: "チェビシェフの不等式より、どんな分布でも平均から3σ以上離れる確率は高々？",
    choices: [
      { label: "1/9 ≈ 11%", correct: true },
      { label: "0.3%", correct: false },
      { label: "5%", correct: false },
      { label: "0%", correct: false },
    ],
    explain:
      "P(|X−μ|≥kσ) ≤ 1/k²。k=3 で 1/9≈11%。正規分布なら3σ外は約0.3%だが、チェビシェフは «形を仮定しない» 普遍的な（緩い）上界。",
  },
  {
    prompt:
      "X と Y の相関が高いが、実は共通原因 Z による «見かけの相関» だった。これを取り除くには？",
    choices: [
      { label: "偏相関係数（Z を制御した相関）を見る", correct: true },
      { label: "相関係数をもう一度計算する", correct: false },
      { label: "分散を大きくする", correct: false },
      { label: "変動係数を使う", correct: false },
    ],
    explain:
      "偏相関 r_{XY·Z} は Z の影響を除いた X,Y の相関。見かけの相関が Z 経由なら偏相関は小さくなる。相関≠因果を切り分ける第一歩。",
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

/** 分布の特性値 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function MomentQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#moment-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って点を動かし、平均・分散・歪度を確かめる
      </a>
    </div>
  );
}
