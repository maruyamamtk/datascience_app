"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "多クラス分類でOne-vs-Rest分解をするとき、あるクラスkのFP(偽陽性)はどう定義される？",
    choices: [
      { label: "クラスkと予測されたが、実際は違うクラスだったサンプル数(列合計-TP)", correct: true },
      { label: "実際にクラスkだが、他のクラスと予測されたサンプル数", correct: false },
      { label: "クラスk以外のクラス同士で誤分類されたサンプル数", correct: false },
      { label: "クラスkの対角成分そのもの", correct: false },
    ],
    explain:
      "One-vs-Restでは「クラスk」を陽性、残り全部を陰性とみなす。FPは«クラスkと予測したのに実際は違った»サンプル数で、混同行列ではクラスkの列合計からTP(対角成分)を引いた値になる。実際にクラスkなのに見逃した方はFN(行合計-TP)で、FPとは別物。",
  },
  {
    prompt: "クラス不均衡(多数派クラスは高性能、少数派クラスは低性能)があるとき、Macro平均とMicro/Weighted平均の関係として最も適切なのは？",
    choices: [
      { label: "Macroは各クラスを均等に扱うため少数派クラスの低い性能に強く引っ張られ、Micro/Weightedより低くなりやすい", correct: true },
      { label: "Macro・Micro・Weightedは常にほぼ同じ値になる", correct: false },
      { label: "Macroは常にMicro/Weightedより高くなる", correct: false },
      { label: "クラス数が3以上のときはMacroを計算できない", correct: false },
    ],
    explain:
      "Macro平均はクラスごとのprecision/recall/F1を単純平均するため、サンプル数が少ないクラスも多いクラスと同じ重みを持つ——少数派クラスの性能が悪いとMacroはそれに強く引っ張られて下がる。Micro・Weightedはサンプル数の多いクラス(多数派)の性能に近くなりやすい。上のラボで「エンタメ」(少数派)を選ぶとprecision/recallが低く、平均化方式によって全体の値が大きく変わることが確認できる。",
  },
  {
    prompt: "「単一ラベル多クラス分類(各サンプルが必ず1つのクラスに予測される)では、Weighted RecallとMicro Recallは常に正解率(Accuracy)と一致する」——○か×か。",
    choices: [
      { label: "○。Σ(n_k/N)·(TP_k/n_k)=ΣTP_k/N、Micro RecallもΣTP_k/(ΣTP_k+ΣFN_k)でΣFN_k=N-ΣTP_kとなるため、どちらも正解率に一致する", correct: true },
      { label: "×。Recallの平均化方式によって正解率とは全く別の値になる", correct: false },
      { label: "○だが、Precisionでも同じ恒等式が成り立つ", correct: false },
      { label: "×。恒等式が成り立つのはMacro Recallだけ", correct: false },
    ],
    explain:
      "これは偶然ではなく代数的な恒等式。Weighted Recall=Σ(n_k/N)Recall_k=Σ(n_k/N)(TP_k/n_k)=ΣTP_k/N=Accuracy。Micro Recallも同様にΣTP_k/(ΣTP_k+ΣFN_k)で、単一ラベル分類では全クラスのFNの合計=N-ΣTP_k(=全クラスのFPの合計と同じ)になるため、Micro Recall=ΣTP_k/N=Accuracyと一致する。ただしPrecisionにはこの恒等式は成り立たない(列合計と行合計が一般に異なるため)——上のラボでWeighted PrecisionとMicro Precisionの値が微妙にズレているのはこのため。",
  },
  {
    prompt: "「全クラスを同じくらい重要視したい(少数派クラスの検出漏れも多数派と同じくらい問題視したい)」という要件に最も適した平均化方式は？",
    choices: [
      { label: "Macro平均(クラスの大きさを無視して均等に扱うため)", correct: true },
      { label: "Micro平均(全体の正解率に近い値になるため)", correct: false },
      { label: "Weighted平均(サンプル数の多いクラスを重視するため)", correct: false },
      { label: "どれを使っても結果は変わらない", correct: false },
    ],
    explain:
      "Macro平均はクラスの大きさ(サンプル数)を一切考慮せず、各クラスの指標を単純平均する——«少数派クラスの検出漏れも多数派と同じ重みで評価したい»場面(例: 希少疾患の診断、レアケースの検出)に向く。逆に「全体としてどれだけ正しく分類できているか」を重視するならMicro(≈正解率)、「実際のクラス分布に応じた重み付けで評価したい」ならWeightedが向く。",
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

/** 多クラス分類の評価指標 演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function MetricsQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#multiclass-metrics-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってクラスを選び直して確かめる
      </a>
    </div>
  );
}
