"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "時系列の加法分解 x_t = T_t + S_t + e_t の各項は？",
    choices: [
      { label: "T_t=トレンド（長期傾向）、S_t=季節（周期変動）、e_t=不規則（ノイズ）", correct: true },
      { label: "T_t=時刻、S_t=標準偏差、e_t=誤差率", correct: false },
      { label: "すべて同じ意味の重複", correct: false },
      { label: "T_t=平均、S_t=分散、e_t=歪度", correct: false },
    ],
    explain:
      "時系列は «長期の傾向（トレンド）»＋«一定周期の波（季節）»＋«残りのランダムなゆらぎ（不規則）» の重ね合わせと見なせる。移動平均でノイズを均すとトレンド＋季節が見えてくる。",
  },
  {
    prompt: "（弱）定常性の条件として正しいのは？",
    choices: [
      { label: "平均が時間で一定、自己共分散がラグの差だけに依存（時点に依らない）", correct: true },
      { label: "すべての値が等しい", correct: false },
      { label: "トレンドが右上がり", correct: false },
      { label: "分散が時間とともに増える", correct: false },
    ],
    explain:
      "弱定常：①平均が一定、②分散が一定、③自己共分散 γ(k) が «時点 t によらずラグ k だけ» で決まる。トレンドがあると平均が動くので非定常。階差を取ると定常に近づくことが多い。",
  },
  {
    prompt: "自己相関 ρ(k)（ACF）が表すのは？",
    choices: [
      { label: "系列を k 期ずらして重ねたときの、元系列との相関", correct: true },
      { label: "2つの異なる変数の相関", correct: false },
      { label: "残差の平均", correct: false },
      { label: "予測の誤差率", correct: false },
    ],
    explain:
      "ρ(k)=γ(k)/γ(0) は «k 期前の自分» との相関。ρ(0)=1。季節周期のラグで大きな正のピークが立てば周期性、全ラグがほぼ0ならホワイトノイズ（無相関）。",
  },
  {
    prompt: "コレログラム（ACFプロット）で、あるラグの棒が破線 ±1.96/√n を超えていたら？",
    choices: [
      { label: "そのラグの自己相関は «偶然では説明しにくい»＝有意な構造が残っている", correct: true },
      { label: "計算ミス", correct: false },
      { label: "常にホワイトノイズ", correct: false },
      { label: "予測が不可能", correct: false },
    ],
    explain:
      "±1.96/√n はホワイトノイズなら自己相関がほぼ収まる «偶然の範囲» の目安。これを超えるラグは有意な自己相関＝まだモデル化できる構造（季節・自己回帰など）が残っているサイン。",
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

/** 時系列解析の基礎 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function TimeSeriesQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#ts-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って季節振幅・ノイズを変え、系列と分散の変化を確かめる
      </a>
    </div>
  );
}
