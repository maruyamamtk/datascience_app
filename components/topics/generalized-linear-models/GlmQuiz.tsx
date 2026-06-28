"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "一般化線形モデル（GLM）の3要素は？",
    choices: [
      { label: "線形予測子・リンク関数・指数型分布族", correct: true },
      { label: "平均・分散・歪度", correct: false },
      { label: "傾き・切片・残差", correct: false },
      { label: "訓練・検証・テスト", correct: false },
    ],
    explain:
      "GLM=«線形予測子 η=Xβ» + «リンク関数 g(μ)=η» + «指数型分布族の応答»。リンクを恒等にすれば線形回帰、ロジットでロジスティック、対数でポアソン回帰。統一の屋根。",
  },
  {
    prompt: "ポアソン回帰で対数リンク log λ=b0+b1x を使う理由は？",
    choices: [
      { label: "λ（件数の平均）が必ず正になるよう保証するため", correct: true },
      { label: "計算が速いから", correct: false },
      { label: "λ を負にできるから", correct: false },
      { label: "正規分布にするため", correct: false },
    ],
    explain:
      "件数の平均 λ は正でなければならない。log λ=線形 とすれば λ=exp(線形)>0 が保証される。リンク関数は «平均の動く範囲» を線形予測子(−∞〜∞)に合わせる役割。",
  },
  {
    prompt: "デビアンスとは？",
    choices: [
      { label: "モデルの当てはまりの悪さ。線形回帰の残差平方和の一般化", correct: true },
      { label: "係数の標準誤差", correct: false },
      { label: "決定係数", correct: false },
      { label: "オッズ比", correct: false },
    ],
    explain:
      "デビアンス D=2(飽和モデルの対数尤度−当該モデルの対数尤度)。小さいほど良い。線形回帰では残差平方和に一致する «当てはまりの悪さ» の一般化で、モデル比較に使う。",
  },
  {
    prompt: "ポアソン回帰で «過分散»（overdispersion）とは？",
    choices: [
      {
        label: "実データの分散が平均より大きく、ポアソンの仮定（平均=分散）を超える",
        correct: true,
      },
      { label: "分散が0になる", correct: false },
      { label: "係数が多すぎる", correct: false },
      { label: "リンク関数が線形", correct: false },
    ],
    explain:
      "ポアソンは «平均=分散» を仮定する。実データはしばしばそれより散らばる（過分散）。対処は準ポアソン・負の二項回帰など、分散を別に許す拡張モデル。",
  },
  {
    prompt: "GLM の係数推定に使われるのは？",
    choices: [
      { label: "反復重み付け最小二乗（IRLS）＝最尤の数値解法", correct: true },
      { label: "通常の最小二乗の閉形式", correct: false },
      { label: "モーメント法のみ", correct: false },
      { label: "並べ替え検定", correct: false },
    ],
    explain:
      "GLM は最尤推定を IRLS（反復重み付け最小二乗）で解く。各反復で «作業反応» に重み付き最小二乗を当てる。ロジスティック・ポアソンも同じ枠組みで推定できる。",
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

/** 一般化線形モデル 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function GlmQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#glm-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って b0・b1 を動かし、指数の平均曲線とデビアンスを確かめる
      </a>
    </div>
  );
}
