"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "ネイマン・ピアソンの基本定理が述べるのは？",
    choices: [
      {
        label: "単純仮説どうしで、αを固定したとき «尤度比>k» の棄却域が検出力を最大化する",
        correct: true,
      },
      { label: "尤度比は常に1である", correct: false },
      { label: "検出力は常に1にできる", correct: false },
      { label: "αとβを同時に0にできる", correct: false },
    ],
    explain:
      "2つの単純仮説 H0,H1 で、有意水準 α を固定したとき «尤度比 L(H1)/L(H0) > k» の形の検定が最強力（検出力最大）。これが «最良の棄却域の作り方» を与える基本定理。",
  },
  {
    prompt: "閾値 c を上げて棄却域を狭めると、α と検出力はどうなる？",
    choices: [
      { label: "両方下がる（トレードオフ）", correct: true },
      { label: "両方上がる", correct: false },
      { label: "α だけ上がる", correct: false },
      { label: "検出力だけ上がる", correct: false },
    ],
    explain:
      "棄却しにくくすると、偽陽性 α も真陽性（検出力）も下がる。同じ α で検出力を上げるには «棄却域の形» を最適化するしかない——それが尤度比検定。",
  },
  {
    prompt: "スコア検定（ラグランジュ乗数検定）の特徴は？",
    choices: [
      { label: "H0 での対数尤度の «傾き» で測り、MLE を計算しなくてよい", correct: true },
      { label: "MLE が必須", correct: false },
      { label: "尤度比を使わない代わりに事前分布が必要", correct: false },
      { label: "標本サイズに依らず厳密", correct: false },
    ],
    explain:
      "スコア検定は H0 のもとでの対数尤度の勾配（スコア）の大きさで測る。H0 だけで計算でき MLE 不要なのが利点。ワルド型は MLE の «離れ»、尤度比は «高さの差» で測る。",
  },
  {
    prompt: "ワルド型・スコア・尤度比の3検定の関係は？",
    choices: [
      { label: "漸近的に等価（正規モデルでは厳密に一致）", correct: true },
      { label: "常に異なる結論を出す", correct: false },
      { label: "尤度比だけが正しい", correct: false },
      { label: "スコア検定だけ漸近正規でない", correct: false },
    ],
    explain:
      "3つとも «H0 からの隔たり» を別の角度で測り、大標本で漸近的に等価（同じカイ二乗分布）。正規平均（σ既知）では厳密に z² で一致。有限標本・非正規では値が少しずれる。",
  },
  {
    prompt: "«正確検定»（例: フィッシャーの正確検定）が使われるのは？",
    choices: [
      { label: "標本が小さく漸近近似が信頼できないとき、厳密な確率を直接計算する", correct: true },
      { label: "標本が非常に大きいとき", correct: false },
      { label: "連続分布のときのみ", correct: false },
      { label: "検出力を無視してよいとき", correct: false },
    ],
    explain:
      "漸近的なカイ二乗近似が怪しい小標本では、組合せで «その表以上に偏る確率» を厳密に計算する正確検定（フィッシャーの正確検定・二項検定）を使う。近似でなく直接 p 値を出す。",
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

/** 検定法の導出 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function TestDerivQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#testderiv-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って閾値 c を動かし、α と検出力を確かめる
      </a>
    </div>
  );
}
