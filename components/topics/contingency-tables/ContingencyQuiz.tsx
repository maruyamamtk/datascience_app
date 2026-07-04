"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "分割表の独立性の検定で、期待度数 E_ij はどう求める？",
    choices: [
      { label: "E_ij = (行和_i × 列和_j) / 総和 N", correct: true },
      { label: "E_ij = 観測値 O_ij そのもの", correct: false },
      { label: "E_ij = N / セル数", correct: false },
      { label: "E_ij = 行和 + 列和", correct: false },
    ],
    explain:
      "«行と列が独立なら» セルの割合は周辺確率の積。度数にすると E_ij=行和·列和/N。この «偏りゼロ» の表と観測のズレを χ²=Σ(O−E)²/E で測る。",
  },
  {
    prompt: "r×c 分割表の独立性の検定の自由度は？",
    choices: [
      { label: "(r−1)(c−1)", correct: true },
      { label: "r × c", correct: false },
      { label: "r + c − 1", correct: false },
      { label: "N − 1", correct: false },
    ],
    explain:
      "周辺和（行和・列和）を固定すると、自由に決められるセルは (r−1)(c−1) 個（残りは周辺和から自動的に決まる）。だから自由度は (r−1)(c−1)。2×2 なら1。",
  },
  {
    prompt: "χ² 検定で p<0.05 だが Cramér's V=0.05 だった。解釈は？",
    choices: [
      { label: "関連は統計的に有意だが «非常に弱い»（大標本で有意になりやすい）", correct: true },
      { label: "強い関連がある", correct: false },
      { label: "計算ミス", correct: false },
      { label: "完全に独立", correct: false },
    ],
    explain:
      "χ² は標本サイズ N に比例して膨らむので、大標本ではわずかな偏りでも «有意» になる。関連の «強さ» は N で正規化した Cramér's V（0〜1）で測る。有意（p小）と強い（V大）は別物。",
  },
  {
    prompt: "期待度数が小さい（5未満のセルが多い）2×2表で推奨されるのは？",
    choices: [
      { label: "フィッシャーの正確確率検定（χ²近似が不正確なため）", correct: true },
      { label: "そのまま χ² 検定を使う", correct: false },
      { label: "検定をあきらめる", correct: false },
      { label: "度数を10倍する", correct: false },
    ],
    explain:
      "χ² 統計量が χ² 分布に従うのは «期待度数が十分大きい» ときの近似。期待度数が小さいと近似が崩れるので、超幾何分布から正確な p 値を出すフィッシャーの正確確率検定を使う（またはイェーツの連続補正）。",
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

/** 分割表の解析 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function ContingencyQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#contingency-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってセルを変え、χ²・p値・クラメールの V の変化を確かめる
      </a>
    </div>
  );
}
