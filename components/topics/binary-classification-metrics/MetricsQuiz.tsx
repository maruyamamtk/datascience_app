"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "しきい値を0に近づける(ほぼ全件を「陽性」と予測する)と、precisionとrecallはそれぞれどうなる？",
    choices: [
      { label: "recallは1に近づく(見逃しがなくなる)一方、precisionは下がりやすい(誤検出が増える)", correct: true },
      { label: "precisionもrecallも両方1に近づく", correct: false },
      { label: "precisionもrecallも両方0に近づく", correct: false },
      { label: "しきい値を変えてもprecision・recallは変化しない", correct: false },
    ],
    explain:
      "しきい値を下げるほど「陽性と予測する」件数が増えるため、実際の陽性を取りこぼす(FN)ことは減り recall は単調に上がる(1に近づく)。一方で陰性まで陽性側に巻き込む(FP)ため、陽性予測の的中率である precision は下がりやすい——上のラボでスライダーを左端まで動かすと確認できる。",
  },
  {
    prompt: "ROC-AUC = 0.5 が意味することとして最も適切なのは？",
    choices: [
      { label: "陽性・陰性を1件ずつランダムに選んだとき、陽性の方が高いスコアになる確率が0.5——«ランダムに予測している»のと同程度の性能", correct: true },
      { label: "分類器が完全に間違っている(すべて逆に予測している)", correct: false },
      { label: "accuracyがちょうど0.5であることを意味する", correct: false },
      { label: "precisionとrecallがちょうど等しいことを意味する", correct: false },
    ],
    explain:
      "AUCはMann-WhitneyのU統計量と同じ解釈を持ち、「ランダムに選んだ陽性1件・陰性1件のペアで、陽性の方が高いスコアを出す確率」に等しい。AUC=0.5は対角線(ランダム予測と同程度)、AUC=1は完全分離、AUC=0は予測が完全に逆であることを意味する(=1だと符号を反転すればAUC=1相当になる)。accuracyやprecision/recallとは独立の指標で、しきい値に依存せずROC曲線全体の分離性能を1つの数字にまとめたもの。",
  },
  {
    prompt: "クラスが極端に不均衡(陽性1%・陰性99%)なデータで、accuracyだけを見て「99%当たっているから良いモデル」と判断するのは、なぜ危険？",
    choices: [
      { label: "全件を「陰性」と予測するだけでもaccuracy≈99%になってしまい、少数派(陽性)の検出性能を全く反映しないため", correct: true },
      { label: "accuracyは不均衡データでは計算自体ができないため", correct: false },
      { label: "不均衡データではTP/FP/FN/TNの定義が変わってしまうため", correct: false },
      { label: "accuracyは常にprecisionより小さい値になってしまうため", correct: false },
    ],
    explain:
      "«accuracy paradox»と呼ばれる典型的な落とし穴。少数派クラスをすべて見逃す(FN)モデルでも、多数派クラスさえ当てていれば見かけのaccuracyは高くなる。不均衡データではrecall・precision・F1・AUCなど、少数派クラスの検出性能を直接反映する指標を併用する必要がある(詳しくは不均衡データのトピックを参照)。",
  },
  {
    prompt: "偽陰性(FN、見逃し)のコストが偽陽性(FP、誤検出)よりずっと大きい問題(例: 重大な疾患の見逃し)では、しきい値をどちらへ動かすのが合理的？",
    choices: [
      { label: "しきい値を下げてrecall(見逃しの少なさ)を優先する——precisionが多少下がっても許容する", correct: true },
      { label: "しきい値を上げてprecisionを優先する", correct: false },
      { label: "コストの大小に関わらず常にしきい値0.5が最適", correct: false },
      { label: "F1が最大になるしきい値が常に唯一の正解", correct: false },
    ],
    explain:
      "コスト考慮の最適しきい値は p*=C_FP/(C_FP+C_FN) で与えられる(評価指標とKPI設計・不均衡データのトピックで導出済み)。FNのコストC_FNがFPのコストC_FPよりずっと大きいとき、p*は0に近づく——つまりしきい値を下げてでも見逃しを減らす(recallを優先する)のが期待コストを最小化する合理的な選択になる。F1はprecisionとrecallを均等に扱う指標なので、コストが非対称な問題ではF1最大化が必ずしも最適とは限らない。",
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
            cls = c.correct ? "border-green-500 bg-green-50 text-green-800" : "border-red-400 bg-red-50 text-red-700";
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
        <div className={`rounded-lg p-3 text-sm leading-relaxed ${isCorrect ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`} role="status">
          <span className="font-semibold">{isCorrect ? "正解! " : "もう一度考えてみよう。 "}</span>
          {q.explain}
        </div>
      ) : null}
    </div>
  );
}

/** 二値分類の評価指標 演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function MetricsQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#binary-classification-metrics-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってしきい値を動かして確かめる
      </a>
    </div>
  );
}
