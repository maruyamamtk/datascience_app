"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "残差プロット（横=予測値, 縦=残差）が «良い当てはめ» のとき、どう見える？",
    choices: [
      { label: "0の周りに均一・ランダムに散らばり、模様がない", correct: true },
      { label: "U字に曲がる", correct: false },
      { label: "右に向かって裾が広がる", correct: false },
      { label: "1点だけ大きく外れる", correct: false },
    ],
    explain:
      "前提（線形・等分散・無相関）が満たされていれば残差は «模様なし»。U字＝非線形、ラッパ型＝不等分散、飛び離れた点＝外れ値、と «形» で崩れを読む。",
  },
  {
    prompt: "てこ比（leverage）が高い点とは？",
    choices: [
      { label: "説明変数 x が平均から遠い点（回帰直線を引っ張りやすい）", correct: true },
      { label: "y が0に近い点", correct: false },
      { label: "残差が0の点", correct: false },
      { label: "標本の中央の点", correct: false },
    ],
    explain:
      "てこ比 hᵢ=1/n+(xᵢ−x̄)²/Sxx は x が平均から離れるほど大きい。てこ比が高い点が外れていると «影響点» として回帰直線を大きく動かす。外れ＋高てこ比が最も危険。",
  },
  {
    prompt: "ダービン–ワトソン比（DW）が測るのは？",
    choices: [
      { label: "残差の系列相関（自己相関）。DW≈2で無相関", correct: true },
      { label: "外れ値の数", correct: false },
      { label: "決定係数", correct: false },
      { label: "多重共線性", correct: false },
    ],
    explain:
      "DW=Σ(eᵢ−eᵢ₋₁)²/Σeᵢ²。DW≈2で残差無相関、0に近いと正の系列相関、4に近いと負。時系列データで «残差が前後で相関» していないかを診る。",
  },
  {
    prompt: "Q–Qプロットで «残差が直線に乗らず両端が反れる» のは何を示す？",
    choices: [
      { label: "残差の正規性が崩れている（裾が重い/歪み）", correct: true },
      { label: "外れ値がない", correct: false },
      { label: "完璧な正規性", correct: false },
      { label: "多重共線性", correct: false },
    ],
    explain:
      "Q–Qプロットは残差の分位点を理論正規分位点と比べる。直線なら正規。両端がS字に反れれば «裾が重い»、片側だけ反れれば «歪み»。正規性は t 検定や予測区間の前提。",
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

/** 回帰診断 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function DiagQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#diag-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って点を動かし、てこ比と影響を確かめる
      </a>
    </div>
  );
}
