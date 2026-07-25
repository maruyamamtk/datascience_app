"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "ベイズA/BテストのP(θ_B>θ_A)=85%は、頻度論のp値と何が違う？",
    choices: [
      {
        label: "P(θ_B>θ_A)は«データを見たあとB案が優れている確率»を直接表す。p値は«本当は差が無いとした場合に、これ以上極端な結果が出る確率»であり、B案が優れている確率そのものではない",
        correct: true,
      },
      { label: "両者は全く同じ量で、呼び方が違うだけ", correct: false },
      { label: "P(θ_B>θ_A)はB案の訪問者数を表す", correct: false },
      { label: "p値の方が常に解釈しやすい", correct: false },
    ],
    explain:
      "頻度論のp値は«帰無仮説(差が無い)が正しいと仮定した世界»での極端さの確率で、仮説の真偽の確率ではない。ベイズのP(θ_B>θ_A)は事後分布から直接«B案が優れている確率»を計算する——「A案がB案より優れている確率は85%」のような直接的な言明ができるのがベイズA/Bテストの利点。",
  },
  {
    prompt: "AbBayesLabで訪問者数を両方とも増やす(スライダーを右へ動かす)と、A・Bの事後分布(ベータ曲線)はどう変わった？",
    choices: [
      { label: "両方とも曲線が痩せて(尖って)いき、真のコンバージョン率への確信が強まる", correct: true },
      { label: "曲線は形を変えない", correct: false },
      { label: "曲線が横に平行移動するだけ", correct: false },
      { label: "曲線が必ず正規分布に変わる", correct: false },
    ],
    explain:
      "ベータ分布Beta(α,β)の分散はα+βが大きいほど小さくなる(観測数が増えるほど確信が強まる)——K-1で学んだ«観測が増えるほど事後分布が痩せる»のと全く同じ現象がA/B比較でも起きる。",
  },
  {
    prompt: "モンテカルロでP(θ_B>θ_A)を推定する仕組みとして最も正確なのは？",
    choices: [
      {
        label: "A・Bそれぞれの事後分布から多数の乱数θ_A^(i),θ_B^(i)を独立にサンプリングし、θ_B^(i)>θ_A^(i)となった割合を数える(大数の法則で真の確率に収束する)",
        correct: true,
      },
      { label: "AとBの事後平均を直接比較して大きい方を選ぶだけ", correct: false },
      { label: "頻度論のz検定を実行しているだけ", correct: false },
      { label: "乱数を1回だけ生成して比較する", correct: false },
    ],
    explain:
      "モンテカルロ法は«たくさん試して数える»のが核心。今回はBeta(a,b)(a,bが正整数)を«a+b−1個の一様乱数の順序統計量»として厳密にサンプリングし、大量の(θ_A,θ_B)ペアで「Bが勝った割合」を数えている。試行回数を増やすほど誤差(標準誤差)は1/√nで縮む。",
  },
  {
    prompt: "IccLabで識別力a(識別力低a=0.7・標準a=1.5・識別力高a=2.8、困難度bはすべて0)を比較したとき、θ=0付近でのわずかな能力差に最も敏感に反応した(曲線の傾きが最も急だった)のはどの項目？",
    choices: [
      { label: "識別力高(a=2.8)の項目——θ=b付近でP(θ)が急に0から1へ立ち上がる", correct: true },
      { label: "識別力低(a=0.7)の項目——曲線がなだらかで最も急に立ち上がる", correct: false },
      { label: "識別力によらずどの項目も同じ傾きになる", correct: false },
      { label: "困難度bが0ではない項目が最も急になる", correct: false }],
    explain:
      "2PLモデル P(θ)=σ(a(θ-b)) で、aは曲線の傾きの急さを直接支配する。aが大きいほどθ=b付近でP(θ)が急激に0→1へ変化し、その能力帯のわずかな差を鋭く識別できる——これが«識別力»と呼ばれる理由。",
  },
  {
    prompt: "IrtLikelihoodLabで、易しい問題(bが小さい)に正解し、難しい問題(bが大きい)には不正解、という回答パターンにしたとき、尤度曲線のピーク(θ_MLE)はどのあたりに来た？",
    choices: [
      { label: "θ=0付近の中程度の値——«易しい問題はできるが難しい問題はできない»という能力像と整合するθが最も尤もらしい", correct: true },
      { label: "常にθ=−4(範囲の下限)に張り付く", correct: false },
      { label: "常にθ=+4(範囲の上限)に張り付く", correct: false },
      { label: "回答パターンによらず常にθ=0になる", correct: false },
    ],
    explain:
      "尤度は«観測された正誤パターンを最もよく説明するθ»を探す。全問正解ならθ_MLEは範囲の上限近くに、全問不正解なら下限近くに張り付くが、«易しい問題はできて難しい問題はできない»という中間的なパターンでは、その能力帯を表す中程度のθで尤度が最大になる。",
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

/** ベイズ応用(A/Bテスト・IRT) 演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function BayesianApplicationsQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#ab-bayes-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってP(B&gt;A)・ICCの動きを確かめる
      </a>
    </div>
  );
}
