"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "数値微分 (f(x+h)−f(x))/h で «h をどこまでも小さくすれば精度が上がる» は正しい？",
    choices: [
      { label: "×。ある点から丸め誤差（桁落ち）が増え、総誤差は U 字で最小点がある", correct: true },
      { label: "○。h→0 で必ず真の微分に一致する", correct: false },
      { label: "○。ただし計算時間が増えるだけ", correct: false },
      { label: "×。h が小さいほど打ち切り誤差が増えるから", correct: false },
    ],
    explain:
      "打ち切り誤差は h↓ で減るが、近い 2 値の引き算 f(x+h)−f(x) が桁落ちし、それを微小な h で割るため丸め誤差が h↓ で増える。総誤差 ≈ 打ち切り + 丸め は U 字で、最小点は中心差分で h*≈ε^{1/3}≈6×10⁻⁶。数学の極限（h→0）と浮動小数点計算は別物。",
  },
  {
    prompt: "計算機イプシロン ε（倍精度で約 2.2×10⁻¹⁶）が表すものは？",
    choices: [
      { label: "1 と «次に表せる浮動小数点数» の差（相対的な丸めの粒度）", correct: true },
      { label: "表せる最小の正の数", correct: false },
      { label: "オーバーフローが起きる最大の数", correct: false },
      { label: "整数と小数の境目", correct: false },
    ],
    explain:
      "ε は «1 に足しても値が変わらなくなる» 境目の量で、浮動小数点の相対精度（有効数字の桁数、倍精度で約 15〜16 桁）を表す。表せる最小の正の数（≈10⁻³⁰⁸）とは別物。丸め誤差の 1 回あたりの大きさは相対的に ε 程度。",
  },
  {
    prompt: "√2 を求める «二分法» の性質として正しいものは？",
    choices: [
      { label: "微分がいらず必ず収束するが、1 反復で誤差が半分（線形収束）と遅い", correct: true },
      { label: "微分を使い、最小点近くで 2 次収束する", correct: false },
      { label: "初期区間の符号が同じ (f(a)·f(b)>0) でも使える", correct: false },
      { label: "1 反復で有効数字がほぼ倍になる", correct: false },
    ],
    explain:
      "二分法は f(a)·f(b)<0（符号が反対）の区間を毎回半分に狭める。中間値の定理により根を必ず区間内に保ち、微分なしで確実に収束する。ただし誤差は毎回 1/2（線形収束）で、10 進 1 桁ぶん詰めるのに約 3.3 反復。«1 反復で有効数字が倍» の 2 次収束はニュートン法の性質。",
  },
  {
    prompt: "«桁落ち（catastrophic cancellation）» が最も起きやすいのはどれ？",
    choices: [
      { label: "ほぼ等しい 2 つの数の引き算", correct: true },
      { label: "大きさの近い 2 数の足し算", correct: false },
      { label: "0 に近い数どうしの掛け算", correct: false },
      { label: "1 より大きい数での割り算", correct: false },
    ],
    explain:
      "ほぼ等しい 2 数を引くと、上位の一致した桁が消えて有効数字が激減する（例: 1.23456−1.23450=0.00006 は有効数字が 6 桁から 1 桁に）。数値微分の分子 f(x+h)−f(x−h) がまさにこれ。二次方程式の解の公式など、桁落ちを避ける式変形（有理化など）が数値計算の要点。",
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

/** 数値計算 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function NumericalComputationQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#num-diff"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って刻み幅 h を動かし、誤差の U 字（打ち切り→最適→丸め）を確かめる
      </a>
    </div>
  );
}
