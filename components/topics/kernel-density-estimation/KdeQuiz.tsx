"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "カーネル密度推定（KDE）は何をしている？",
    choices: [
      { label: "各データ点に «山（カーネル）» を置き、平均して滑らかな密度を作る", correct: true },
      { label: "データを k 個に分ける", correct: false },
      { label: "回帰直線を引く", correct: false },
      { label: "分散最大の軸を探す", correct: false },
    ],
    explain:
      "KDE は f̂(x)=(1/nh)ΣK((x−xᵢ)/h)。各点に幅 h のカーネルを置いて足し合わせる。ヒストグラムの «滑らかで連続な» 版で、ビンの境界に依存しない。",
  },
  {
    prompt: "帯域幅 h を小さくしすぎると？",
    choices: [
      { label: "各点の山が細く、密度がギザギザになる（分散大＝ノイズを拾う）", correct: true },
      { label: "密度が平坦になる", correct: false },
      { label: "必ず真の密度に一致する", correct: false },
      { label: "面積が2になる", correct: false },
    ],
    explain:
      "h が小さいと各カーネルが尖り、標本のノイズをそのまま拾ってギザギザに（分散大）。逆に大きすぎると山が広がりすぎて構造（山や谷）が潰れる（バイアス大）。h はバイアス–分散のトレードオフ。",
  },
  {
    prompt: "KDE の結果に最も影響するのは？",
    choices: [
      { label: "帯域幅 h の選択（カーネルの形より効く）", correct: true },
      { label: "カーネルの種類（ガウスか一様か）", correct: false },
      { label: "データの順序", correct: false },
      { label: "色", correct: false },
    ],
    explain:
      "カーネルの形（ガウス・エパネチニコフ等）は結果にあまり影響しない。決定的なのは帯域幅 h。h の自動選択にシルバーマンの経験則や交差検証を使う。",
  },
  {
    prompt: "シルバーマンの経験則 h=0.9·min(σ,IQR/1.34)·n^(−1/5) の注意点は？",
    choices: [
      { label: "正規分布を仮定した目安で、多峰性データでは過平滑になりがち", correct: true },
      { label: "常に最適な h を与える", correct: false },
      { label: "h を n に無関係にする", correct: false },
      { label: "分散を無視する", correct: false },
    ],
    explain:
      "シルバーマンは «正規分布» を前提にした簡便な目安。二峰性など構造のあるデータでは h が大きめに出て山が潰れやすい。交差検証で ISE を直接最小化する方が適応的。",
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

/** カーネル密度推定 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function KdeQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#kde-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って帯域幅とカーネルを変え、KDE曲線とISEを確かめる
      </a>
    </div>
  );
}
