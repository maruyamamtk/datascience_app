"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "効果量と α を一定にしたまま標本サイズ n を増やすと、検出力（1−β）はどうなる？",
    choices: [
      { label: "上がる（β は下がる）", correct: true },
      { label: "下がる（β は上がる）", correct: false },
      { label: "変わらない", correct: false },
      { label: "α と同じ値に近づく", correct: false },
    ],
    explain:
      "n を増やすと H1 側の検定統計量の中心 δ=d√n が大きくなり、H1 分布が H0 から離れて棄却域に入りやすくなる。よって検出力は上がり、第二種の過誤 β は下がる。検出力コマ送りで曲線が右上へ伸びるのを確かめよう。",
  },
  {
    prompt: "効果量・n を固定したまま有意水準 α を 0.05 → 0.01 に下げると？",
    choices: [
      { label: "臨界線が外へ動き、β が上がって検出力は下がる", correct: true },
      { label: "β も検出力も下がる", correct: false },
      { label: "検出力が上がる", correct: false },
      { label: "何も変わらない", correct: false },
    ],
    explain:
      "α（第一種の過誤）を小さくすると棄却域が狭まり臨界線が外側へ動く。すると H1 の採択域（橙=β）が広がるので β は上がり、検出力 1−β は下がる。α と β はトレードオフの関係（同じデータでは両方同時には下げられない）。",
  },
  {
    prompt: "p値の正しい意味は？",
    choices: [
      {
        label: "帰無仮説が正しいと仮定したとき、観測値以上に極端な統計量が出る確率",
        correct: true,
      },
      { label: "帰無仮説が正しい確率", correct: false },
      { label: "対立仮説が正しい確率", correct: false },
      { label: "検定を間違える確率", correct: false },
    ],
    explain:
      "p値は «H0 が真» という前提のもとで «今回以上に極端な結果» が得られる確率。仮説そのものの確率ではない。p<α なら「H0 のもとでは珍しすぎる」として H0 を棄却する。",
  },
  {
    prompt: "両側検定を片側検定（正しい向き）に変えると、同じデータで p値は？",
    choices: [
      { label: "約半分になる（その向きに効果があるとき）", correct: true },
      { label: "約2倍になる", correct: false },
      { label: "変わらない", correct: false },
      { label: "必ず有意になる", correct: false },
    ],
    explain:
      "両側 p=2(1−Φ(|z|)) に対し、片側 p=1−Φ(z)。効果が想定の向きにあれば片側 p は両側のちょうど半分になり、棄却しやすくなる。ただし向きを事前に決めておく必要があり、逆向きの効果は検出できない。",
  },
];

/** 1 問ぶんの確認問題（選択 → 即時フィードバック）。NormalQuiz / IntervalQuiz と同じ様式。 */
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

/**
 * 仮説検定 演習（確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③）。
 */
export function TestQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#test-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って効果量・n・α を動かして確かめる
      </a>
    </div>
  );
}
