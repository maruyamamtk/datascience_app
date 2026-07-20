"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "散布図の1点だけを大きく外れ値化したとき、最も敏感に(大きく)反応する指標はどれ？",
    choices: [
      { label: "MSE・RMSE(残差を二乗するため)", correct: true },
      { label: "MAE(残差の絶対値をそのまま平均するため)", correct: false },
      { label: "5指標とも全く同じだけ反応する", correct: false },
      { label: "MAPE(パーセント表示だから影響を受けない)", correct: false },
    ],
    explain:
      "MSE・RMSEは残差を二乗するため、1点が大きくズレるとその点の寄与が二次で効き跳ね上がる。MAEは絶対値の平均なので影響は線形にとどまる——ラボで「外れ値を作る」を押すと、baseline比バーでMSE/RMSEだけが大きく伸びるのが確認できる。",
  },
  {
    prompt: "MAEとRMSEの大小関係として常に成り立つのはどちら？",
    choices: [
      { label: "RMSE ≥ MAE (二乗平均平方根は絶対値平均以上、Jensenの不等式)", correct: true },
      { label: "MAE ≥ RMSE", correct: false },
      { label: "常に MAE = RMSE", correct: false },
      { label: "大小関係は定まらない", correct: false },
    ],
    explain:
      "べき平均の単調性(Jensenの不等式)により、二乗してから平均して平方根を取るRMSEは、絶対値をそのまま平均するMAE以上になる。全ての残差が等しい大きさのときだけ等号が成り立つ(誤差にばらつきがあるほどRMSEはMAEより大きくなる)。",
  },
  {
    prompt: "MAPE(平均絶対パーセント誤差)を使う上での注意点は？",
    choices: [
      { label: "実測値が0に近い点があると、割り算が不安定になり指標が壊れやすい", correct: true },
      { label: "MAPEは常に0〜1の範囲に収まるので解釈が簡単", correct: false },
      { label: "MAPEは外れ値に最も頑健な指標なので常に優先すべき", correct: false },
      { label: "MAPEは二乗誤差を使うのでRMSEと同じ性質を持つ", correct: false },
    ],
    explain:
      "MAPEは各点の誤差を実測値 y_i で割るため、y_i が0に近いとわずかな絶対誤差でも%が爆発的に大きくなり不安定になる。«予測値が0に近いデータ»にはMAPEよりRMSLEが向いている。",
  },
  {
    prompt: "RMSLE(対数平均二乗誤差)が過大予測と過小予測を«非対称»に評価するのはなぜ？",
    choices: [
      { label: "対数を取ると、同じ比率のズレでも過小予測(実測より小さい予測)の方が対数差が大きくなりやすいため", correct: true },
      { label: "RMSLEは常に過大予測を無視するよう設計されているため", correct: false },
      { label: "対数を取っても誤差の対称性は変わらないため(非対称という説明自体が誤り)", correct: false },
      { label: "RMSLEはMAEと全く同じ計算式で、名前が違うだけだから", correct: false },
    ],
    explain:
      "log(1+ŷ)−log(1+y) は比率のズレを測る形になっており、実測の半分しか予測しない過小予測(比率0.5)と実測の2倍を予測する過大予測(比率2)とでは対数差の絶対値が異なる——RMSLEは大きな外れ値・0に近いデータでも安定し、過小予測をより重く評価する用途(在庫不足を避けたい発注数予測など)に向く。",
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

/** 回帰の評価指標 演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function MetricsQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#regression-metrics-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻って点をドラッグ・外れ値を作って確かめる
      </a>
    </div>
  );
}
