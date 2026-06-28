"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "応答が2値（0/1）のとき、なぜ直線回帰でなくロジスティック回帰を使う？",
    choices: [
      { label: "予測を必ず0〜1の確率に収め、対数オッズを線形にできる", correct: true },
      { label: "計算が速いから", correct: false },
      { label: "残差が正規になるから", correct: false },
      { label: "外れ値がないから", correct: false },
    ],
    explain:
      "直線回帰だと予測確率が0未満や1超になりうる。ロジスティックはシグモイドで0〜1に収め、«対数オッズ logit(p)=b0+b1x» を線形にする。確率モデルとして自然。",
  },
  {
    prompt: "ロジスティック回帰の係数 b1 のオッズ比 e^{b1}=2 が意味するのは？",
    choices: [
      { label: "x が1増えるとオッズ（p/(1−p)）が2倍になる", correct: true },
      { label: "確率が2倍になる", correct: false },
      { label: "x が2倍になる", correct: false },
      { label: "効果がない", correct: false },
    ],
    explain:
      "b1 は «対数オッズ» の変化率。x が1増えると log(オッズ) が b1 増え、オッズが e^{b1} 倍になる（オッズ比）。確率そのものが2倍ではない点に注意（確率は0〜1で頭打ち）。",
  },
  {
    prompt: "ロジスティック回帰の係数はどう推定する？",
    choices: [
      { label: "最尤法（対数尤度を最大化、勾配上昇/ニュートン法で数値解）", correct: true },
      { label: "最小二乗法で閉形式", correct: false },
      { label: "相関係数から", correct: false },
      { label: "中央値から", correct: false },
    ],
    explain:
      "2値の尤度 Π pᵢ^{yᵢ}(1−pᵢ)^{1−yᵢ} の対数を最大化する。閉形式はなく、勾配上昇やニュートン法（IRLS）で数値的に解く。最小二乗ではない。",
  },
  {
    prompt: "プロビット分析とロジスティック回帰の違いは？",
    choices: [
      {
        label: "確率への «リンク関数» が正規CDFかロジットかの違い（結果は概ね似る）",
        correct: true,
      },
      { label: "プロビットは線形回帰そのもの", correct: false },
      { label: "ロジスティックは連続応答用", correct: false },
      { label: "全く別の手法で結果が大きく異なる", correct: false },
    ],
    explain:
      "どちらも «線形予測子を確率に写す» 2値回帰で、リンク関数が違うだけ（プロビット=正規CDF Φ、ロジット=シグモイド）。実用上は結果がよく似る。ロジットは «オッズ比» の解釈が容易なので広く使われる。",
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

/** 質的回帰 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function LogitQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#logit-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って b0・b1 を動かし、シグモイドとオッズ比を確かめる
      </a>
    </div>
  );
}
