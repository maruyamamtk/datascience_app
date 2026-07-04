"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "検出したい効果（MDE）を半分に小さくすると、必要な標本サイズは概ねどうなる？",
    choices: [
      { label: "約4倍に増える（n は δ² に反比例）", correct: true },
      { label: "約半分に減る", correct: false },
      { label: "変わらない", correct: false },
      { label: "約2倍に増える", correct: false },
    ],
    explain:
      "必要標本サイズは n ∝ 1/δ²。効果 δ を半分にすると n は 1/(1/2)²=4 倍。«ごくわずかな改善» を確実に検出するには桁違いの標本が要る——だから «どれだけの効果を見たいか（MDE）» を先に決めるのが設計の要。",
  },
  {
    prompt: "A/Bテストを毎日覗いて «有意になったら即停止» する運用の問題は？",
    choices: [
      { label: "実効的な第一種の過誤が名目5%を大きく超える（覗き見・多重性）", correct: true },
      { label: "検出力が下がるだけで過誤は変わらない", correct: false },
      { label: "何も問題はない", correct: false },
      { label: "標本サイズが自動的に最適化される", correct: false },
    ],
    explain:
      "検定は «1回の判断» で5%に制御されるよう作られている。何度も途中で見て «最大に達したら止める» と、偶然どこかで5%線を跨ぐ確率が積み上がり、真に差がなくても誤検出しやすい。対策は事前に n を固定して覗かない／群逐次デザインや逐次検定で有意水準を配分する。",
  },
  {
    prompt: "検出力（1−β）が0.5しかないA/Bテストの解釈は？",
    choices: [
      { label: "本当に効果があっても半分は見逃す（検出力不足）", correct: true },
      { label: "第一種の過誤が50%ある", correct: false },
      { label: "効果が必ず検出される", correct: false },
      { label: "p値が必ず0.5になる", correct: false },
    ],
    explain:
      "検出力は «真に MDE の差があるとき有意と判定できる確率»。0.5 なら効果があっても半分は «有意差なし» と誤って結論する（第二種の過誤 β=0.5）。標本が足りないと検出力が落ちる。実務では 0.8 前後を目標に n を決める。",
  },
  {
    prompt: "«ランダム割り当てのはずが A群55% / B群45% に偏っていた» とき、まず疑うべきは？",
    choices: [
      { label: "標本比率のミスマッチ（SRM）＝実装バグや割り当ての不備", correct: true },
      { label: "効果が非常に大きい証拠", correct: false },
      { label: "検出力が高すぎる", correct: false },
      { label: "無視してよい正常な揺らぎ", correct: false },
    ],
    explain:
      "50:50 で割り当てたはずの人数が想定から大きくズレる（Sample Ratio Mismatch）のは、リダイレクト・ボット除外・ログ欠損などの実装バグのサイン。χ²検定で比率を確認し、SRM があれば結果を信じる前に原因を潰す。効果の大小とは無関係の «データの健全性» の問題。",
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

/** A/Bテスト実務 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function AbTestQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#ab-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って MDX・n を変え、必要標本サイズと検出力の関係を確かめる
      </a>
    </div>
  );
}
