"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt:
      "EVPI(完全情報の期待価値)は「完全情報があった場合の期待利得」と何との差として定義されるか？",
    choices: [
      {
        label: "事前確率のみでのESV(期待値による意思決定)が最大の値",
        correct: true,
      },
      { label: "利得行列の中で最も大きい利得の値", correct: false },
      { label: "Maximin基準が選ぶ行動のスコア", correct: false },
      { label: "0(EVPIは常に定数)", correct: false },
    ],
    explain:
      "EVPI=Σ_θ P(θ)max_a c(a,θ) − max_a ESV(a)。第2項は「状態が分からないまま、事前確率だけでESVが最大の行動を1つ選ぶ」ときの期待利得——情報がまったくないときの基準点。この基準点との差が、完全情報の価値を表す。",
  },
  {
    prompt: "上のEvpiStepperで、好況になる確率p=0.5のとき、EVPIは200(万円)だった。この数値の意味として最も正しいのは？",
    choices: [
      {
        label: "「景気が好況か不況かを確実に教えてくれる予報」に対して支払ってよい金額の上限が200万円",
        correct: true,
      },
      { label: "1台稼働の利得そのものが200万円である", correct: false },
      { label: "好況になる確率が200%である(誤り、確率は必ず100%以下)", correct: false },
      { label: "2台稼働と1台稼働の利得の単純な差額(700-300=400)と同じ意味", correct: false },
    ],
    explain:
      "EVPIは「完全情報を得ることでどれだけ期待利得が増えるか」なので、それを上回る金額を情報の対価として払うと、情報を買わない方が得になってしまう——EVPIは支払える金額の«上限»を与える。単純な利得の差(400)とは異なる値(200)になることに注意(EVPIは確率で重み付けた期待値の差)。",
  },
  {
    prompt:
      "事前確率のもとでESVが最大の行動を選んだときの«期待リグレット(後悔)»は、EVPIとどんな関係にあるか?",
    choices: [
      { label: "常に一致する", correct: true },
      { label: "常にEVPIより大きい", correct: false },
      { label: "常にEVPIより小さい", correct: false },
      { label: "無関係(たまたま一致することもあるだけ)", correct: false },
    ],
    explain:
      "EVPI=Σ_θ P(θ)max_a c(a,θ) − max_a ESV(a) を、選んだ行動a*(ESV最大)のリグレットの定義 regret(a*,θ)=max_a c(a,θ)−c(a*,θ) を使って書き換えると、Σ_θ P(θ)regret(a*,θ)(=期待リグレット)とちょうど一致する——«不確実性のせいでどれだけ損をしているか»という2つの見方が同じ数値になる、決定分析の重要な帰結。",
  },
  {
    prompt:
      "上のPriorPosteriorLabで、予報の的中率qを0.5から1へ動かしていくと、事前分析VOI_pre(q)はどう変化したか?",
    choices: [
      {
        label: "0から単調に増えていき、q=1でEVPIとちょうど一致する(EVPIを超えることはない)",
        correct: true,
      },
      { label: "常にEVPIより大きい値になる", correct: false },
      { label: "qに関わらず常に一定の値", correct: false },
      { label: "q=0.5のときが最大で、qを上げると減っていく", correct: false },
    ],
    explain:
      "q=0.5(予報が状態と無関係)ではVOI_pre=0(事後確率が事前確率と変わらないため情報の価値がない)。qを1(完全的中)に近づけるほど予報が状態を正しく言い当てるようになりVOI_preは増え、q=1でちょうどEVPIに一致する——EVPIは«どんな(不完全な情報も含む)予報の価値も超えられない上限»であることが、この単調な近づき方から確かめられる。",
  },
  {
    prompt: "予報「好況」を観測した後の条件付きESV(a|s)を計算するとき、必要な事後確率P(θ|予報:好況)はどう求めるか?",
    choices: [
      {
        label: "ベイズの定理 P(θ|s)∝P(s|θ)P(θ) で、事前確率P(θ)と尤度P(s|θ)(予報の的中率)から計算する",
        correct: true,
      },
      { label: "常に事前確率P(θ)と同じ値を使う", correct: false },
      { label: "的中率qをそのままP(θ|s)として使う", correct: false },
      { label: "状態θの利得c(a,θ)の平均から逆算する", correct: false },
    ],
    explain:
      "事前/事後分析はベイズ統計の基礎(K-1)の「事後∝尤度×事前分布」と同じ構造を、連続パラメータθではなく離散的な自然の状態Θに適用したもの。予報の的中率q=P(s|θ)(尤度)と事前確率P(θ)から、P(θ|s)=P(s|θ)P(θ)/P(s)(P(s)は正規化定数)で事後確率を求める。",
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

/** 情報の価値トピックの演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function ValueOfInformationQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#evpi-stepper"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってEVPIステッパーやラボを動かし、確率・的中率とEVPI/VOIの関係を確かめる
      </a>
    </div>
  );
}
