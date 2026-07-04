"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "モンテカルロ法で π を求めるとき、n（試行数）を4倍にすると誤差はおよそ？",
    choices: [
      { label: "半分（1/√n の速さで縮む）", correct: true },
      { label: "1/4 になる", correct: false },
      { label: "変わらない", correct: false },
      { label: "4倍になる", correct: false },
    ],
    explain:
      "モンテカルロ推定の誤差は標準誤差 ∝ 1/√n。n を4倍にすると √n は2倍、誤差はおよそ半分。«精度を1桁上げるには試行を100倍» という遅さが、モンテカルロ法の代償。",
  },
  {
    prompt: "ブートストラップの «復元抽出» とは？",
    choices: [
      { label: "元標本から同じ大きさを «重複を許して» 引き直す", correct: true },
      { label: "母集団から新しく標本を取り直す", correct: false },
      { label: "標本から重複なしで一部を抜き出す", correct: false },
      { label: "データを昇順に並べ替える", correct: false },
    ],
    explain:
      "ブートストラップは «手元の標本を母集団の代わり» と見なし、そこから同サイズを復元抽出（同じ観測が何度も選ばれ得る）する。新しいデータは要らない。",
  },
  {
    prompt: "ブートストラップ標準誤差は何から求まる？",
    choices: [
      { label: "多数の再標本で計算した統計量の «ばらつき»（標準偏差）", correct: true },
      { label: "元標本の最大値と最小値の差", correct: false },
      { label: "元標本の平均そのもの", correct: false },
      { label: "母集団の分散（既知）", correct: false },
    ],
    explain:
      "各再標本で統計量を計算した値の集まり（ブートストラップ分布）の標準偏差が、その統計量の標準誤差の推定。平均の場合これは理論値 s/√n に近づく。",
  },
  {
    prompt: "ブートストラップ（パーセンタイル法）が特に有効なのは？",
    choices: [
      { label: "標準誤差の公式が無い統計量（中央値・相関・分位点など）の区間推定", correct: true },
      { label: "母平均が既知のとき", correct: false },
      { label: "データが1個しかないとき", correct: false },
      { label: "正規分布と分かっている平均だけ", correct: false },
    ],
    explain:
      "平均には s/√n の公式があるが、中央値や相関係数などは標準誤差の式が複雑・不明なことが多い。ブートストラップなら同じ手順で分布を作り、その分位点を読むだけで区間が得られる。",
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

/** 計算多用手法 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function MonteCarloQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#montecarlo-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってダーツ数を変え、推定の収束を確かめる
      </a>
    </div>
  );
}
