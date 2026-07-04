"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "時系列を訓練/検証に分けるとき、なぜシャッフルせず «時間順» に切るのか？",
    choices: [
      { label: "予測は «未来» を当てる問題なので、未来のデータを学習に使ってはいけない（リーク防止）", correct: true },
      { label: "計算が速いから", correct: false },
      { label: "順番はどうでもよい", correct: false },
      { label: "検証データを増やすため", correct: false },
    ],
    explain:
      "時系列予測は過去から未来を当てる。ランダムにシャッフルすると «未来の情報» が訓練に混ざり（データリーク）、本番より楽観的な評価になる。必ず時間順に、訓練を過去・検証を未来に置く。",
  },
  {
    prompt: "指数平滑化 ℓ_t = α·y_t + (1−α)·ℓ_{t-1} で α を大きくすると？",
    choices: [
      { label: "直近の観測を強く重視し、変化に速く反応する（ノイズも拾いやすい）", correct: true },
      { label: "過去を強く重視する", correct: false },
      { label: "予測が定数になる", correct: false },
      { label: "何も変わらない", correct: false },
    ],
    explain:
      "α は «新しい実測をどれだけ取り込むか» の重み。大きいほど直近重視で反応が速いがノイズに敏感、小さいほど滑らかだが変化への追従が遅い。過去への重みは α(1−α)^j で幾何級数的に減衰する。",
  },
  {
    prompt: "RMSE と MAE の違いとして正しいのは？",
    choices: [
      { label: "RMSE は誤差を二乗するため、大きな外れ（外れ値）をより強く罰する", correct: true },
      { label: "MAE の方が大きな誤差に敏感", correct: false },
      { label: "両者は常に等しい", correct: false },
      { label: "RMSE は必ず MAE より小さい", correct: false },
    ],
    explain:
      "RMSE=√mean(誤差²) は二乗するので大きな誤差の影響が増幅される（外れ値に敏感）。MAE=mean|誤差| は線形で頑健。常に RMSE≥MAE。MAPE は%表示で規模の違う系列を比較しやすいが、実測0付近で不安定。",
  },
  {
    prompt: "予測の «ベースライン»（素朴・平均・ドリフト）を最初に評価する狙いは？",
    choices: [
      { label: "高度なモデルが «単純な予測を上回る価値» があるかを測る基準にする", correct: true },
      { label: "ベースラインが常に最良だから", correct: false },
      { label: "複雑なモデルを使わないため", correct: false },
      { label: "訓練データを減らすため", correct: false },
    ],
    explain:
      "素朴予測（最後の値）などの単純な基準を先に測り、ARIMA や機械学習がそれを «有意に上回るか» で価値を判断する。ランダムウォークには素朴予測が実は最適など、単純法が強いことも多い。",
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

/** 時系列予測と評価 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function ForecastQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#forecast-operation"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って α を変え、平滑化と RMSE の変化を確かめる
      </a>
    </div>
  );
}
