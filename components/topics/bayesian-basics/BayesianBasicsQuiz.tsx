"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "ベータ分布がベルヌーイ/二項分布の「共役事前分布」と呼ばれるのはなぜ？",
    choices: [
      {
        label: "事前分布がベータ分布なら、観測データを反映した事後分布も同じくベータ分布になり、パラメータの単純な足し算(α←α+成功数, β←β+失敗数)で更新できるから",
        correct: true,
      },
      { label: "ベータ分布は平均が必ず0.5になるから", correct: false },
      { label: "ベータ分布は正規分布と全く同じ形をしているから", correct: false },
      { label: "共役事前分布は事後分布を必ず一様分布にするから", correct: false },
    ],
    explain:
      "「共役」とは、事前分布の«分布の族»(この場合ベータ分布)が、尤度と掛け合わせたあとも同じ族(ベータ分布)のまま保たれることを指す。これにより複雑な積分計算なしに、パラメータの足し算だけで事後分布が求まる——ラボのステッパーで観測1件ごとにα・βが+1ずつ動くのがこれ。",
  },
  {
    prompt: "上のステッパーで、事前分布Beta(1,1)(無情報)を使ったとき、1投目・2投目・3投目と続けて表が出ると事後分布の平均は大きく動いた。しかし観測数が増えるほど、1回あたりの動きは小さくなっていった。これはなぜ？",
    choices: [
      {
        label: "観測が増えるほど、既に蓄積された尤度の情報(α+β=これまでの観測数+事前の重み)が相対的に大きくなり、1回の新しい観測が全体に占める割合が小さくなるから",
        correct: true,
      },
      { label: "ベータ分布の計算式にバグがあるから", correct: false },
      { label: "コインの確率が投げるたびに変化しているから", correct: false },
      { label: "事後分布は観測数によらず常に同じ速さで動く", correct: false },
    ],
    explain:
      "事後平均は(α₀+k)/(α₀+β₀+n)という形。nが小さいうちは分母が小さく1回の観測(kの+1)の影響が大きいが、nが増えると分母が大きくなり、1回あたりの影響は相対的に小さくなる——「データが増えるほど尤度の影響が事前分布の影響を上回る」というベイズ推論の基本的な性質。",
  },
  {
    prompt: "ベイズファクターBF₁₀=25という結果が出た。この意味として最も適切なのは？",
    choices: [
      { label: "データはH1(θ不明の複合仮説)をH0(θ=θ₀の点仮説)よりおよそ25倍支持している——Jeffreys/Lee & Wagenmakersの目安では«強い証拠»", correct: true },
      { label: "H1が正しい確率は25%である", correct: false },
      { label: "p値が0.25であることを意味する", correct: false },
      { label: "H0が正しい確率がH1の25倍である", correct: false },
    ],
    explain:
      "ベイズファクターは「どちらの仮説の確率か」ではなく「データが2つの仮説をどれだけの比率で支持するか」という尤度比。BF₁₀=25はH1をH0より25倍支持することを意味し、目安のスケールでは10〜30の«強い証拠»帯に入る。仮説そのものの確率(事後確率)を知るには、これに事前オッズを掛けて事後オッズを求める必要がある。",
  },
  {
    prompt: "n=10, k=10(10回中10回成功)という極端なデータで、θ₀=0.5に対する両側p値は非常に小さく«有意»になった。同じデータでベイズファクターBF₁₀を計算したところ、値はさほど大きくなかった。この状況が示唆することは？",
    choices: [
      { label: "標本サイズnが小さいと、p値とベイズファクターの結論が一致するとは限らない——p値は«有意/非有意»の二分、ベイズファクターは証拠の強さの連続的な目安という異なる問いに答えているため", correct: true },
      { label: "p値かベイズファクターのどちらかの計算が必ず間違っている", correct: false },
      { label: "n=10のような小さな標本では統計学は無力である", correct: false },
      { label: "ベイズファクターは常にp値より大きい値になる", correct: false },
    ],
    explain:
      "p値は«H0のもとで観測以上に極端な結果が起きる確率»、ベイズファクターは«データがH0とH1のどちらをどれだけ支持するか»——測っているものが違う。特に標本サイズが小さいと、p値だけでは«有意»でも、ベイズファクターでは«中程度»止まりということが起こりうる(頻度論とベイズ推論のこの種の不一致はLindleyのパラドックスとして知られる関連現象がある)。",
  },
  {
    prompt: "ベイズ判別のラボで、クラス1の事前確率を50%から80%に上げると、決定境界(2つの«事前確率×尤度»の曲線の交点)はどう動いた？",
    choices: [
      { label: "クラス0側(左)へ動いた——同じxでもクラス1と判定されやすくなる", correct: true },
      { label: "クラス1側(右)へ動いた——同じxでもクラス0と判定されやすくなる", correct: false },
      { label: "境界は事前確率を変えても全く動かない", correct: false },
      { label: "境界は必ず2つのクラスの平均のちょうど中点に固定される", correct: false },
    ],
    explain:
      "クラス1の事前確率を上げると「クラス1の事前確率×尤度」の曲線全体が持ち上がるため、クラス0の曲線との交点(決定境界)はクラス0の平均に近い側(左)へ移動する——同じ尤度(観測データ)でも、事前知識次第で«どちらのクラスと判定するか»の境目が変わるのがベイズ判別の特徴。",
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
          <span className="font-semibold">{isCorrect ? "正解! " : "もう一度考えてみよう。 "}</span>
          {q.explain}
        </div>
      ) : null}
    </div>
  );
}

/** ベイズ統計の基礎 演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function BayesianBasicsQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#posterior-update-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってコインを投げ直し、事後分布の動きを確かめる
      </a>
    </div>
  );
}
