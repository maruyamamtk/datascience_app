"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "多数派95%・少数派5%の不均衡データで «常に多数派を予測する» 分類器の正解率（accuracy）は？",
    choices: [
      { label: "約95%——だが少数派を1件も当てられておらず、実務的には無意味なことが多い", correct: true },
      { label: "約50%", correct: false },
      { label: "約5%", correct: false },
      { label: "正解率は不均衡データでは定義できない", correct: false },
    ],
    explain:
      "«常に多数派» はテストデータの95%（多数派の割合）を正解するので accuracy は約95%と高く出る（accuracy paradox）。しかし少数派の再現率（recall）は0%——不均衡データでは accuracy だけでなく、少数派クラスに注目した指標（適合率・再現率・F値・AUC）や、コスト考慮型のしきい値を併用する必要がある。",
  },
  {
    prompt: "SMOTEが新しい合成サンプルを生成する位置は？",
    choices: [
      { label: "ある少数派点と、その少数派クラス内近傍点を結ぶ線分上", correct: true },
      { label: "特徴量空間の完全にランダムな位置", correct: false },
      { label: "多数派クラスの重心", correct: false },
      { label: "既存の少数派点とまったく同じ位置（複製）", correct: false },
    ],
    explain:
      "SMOTEは «ある少数派点 x_i» と «その少数派クラス内でのk近傍点 x_{z_i}» を結ぶ線分上に、gap∈[0,1)の位置で新しい点 x_new=x_i+gap(x_{z_i}-x_i) を作る。単純な複製（オーバーフィットしやすい）と違い、既存点の«間»を埋めるのが特徴。",
  },
  {
    prompt: "ADASYNがSMOTEと異なる点は？",
    choices: [
      { label: "«多数派に囲まれて学習しづらい» 少数派点ほど、より多くの合成サンプルを生成する", correct: true },
      { label: "少数派クラス内ではなく多数派クラス内で近傍を探す", correct: false },
      { label: "線分ではなく多数派の重心に向かって合成する", correct: false },
      { label: "合成サンプルを一切生成しない", correct: false },
    ],
    explain:
      "近傍を結ぶ線分上に合成する手順自体はSMOTEと同じ。違いは «種点をどう選ぶか»——ADASYNは各少数派点の局所的な困難度Δ_i（k近傍中の多数派の割合）に比例した重みg_i=Δ_i/ΣΔ_iで種点を選ぶため、決定境界に近い«境界»の点ほど多く合成される。",
  },
  {
    prompt: "見逃し（偽陰性）のコストが誤報（偽陽性）よりずっと大きい問題（例: 重病の見逃し）で、期待コストを最小化する分類しきい値p*は？",
    choices: [
      { label: "0.5より小さくなる——«疑わしきは陽性»側に判定を倒す", correct: true },
      { label: "0.5より大きくなる", correct: false },
      { label: "常に0.5のまま変わらない", correct: false },
      { label: "1になる（すべて陽性と判定する）", correct: false },
    ],
    explain:
      "最適しきい値は p*=C_FP/(C_FP+C_FN)。C_FN（見逃しのコスト）がC_FP（誤報のコスト）よりずっと大きいとき、分母が大きくなるためp*は0.5より小さくなる——確信度が低くても陽性と判定しやすくなり、見逃しを減らす代わりに誤報が増えることを許容する。",
  },
  {
    prompt: "LOF（局所外れ値因子）の値が1よりずっと大きいとき、その点についてどう解釈するのが正しい？",
    choices: [
      { label: "自分の局所密度が、近傍点たちの局所密度の平均よりずっと«疎»——異常の可能性が高い", correct: true },
      { label: "その点は必ずデータ全体の中心から最も遠い", correct: false },
      { label: "その点は必ず多数派クラスに属する", correct: false },
      { label: "LOFは1を超えることはない", correct: false },
    ],
    explain:
      "LOF(i)=（近傍のlrdの平均）÷（自分のlrd）。lrd（局所到達可能密度）は«どれだけ密集しているか»の逆数的な指標なので、LOFが1に近ければ«近傍と同程度の密集度=正常»、1をずっと上回れば«自分だけ疎=局所的に浮いている=異常»と読む。大域的な中心からの距離（MSPCのT²が測るもの）とは異なり、あくまで«近傍との相対比較»である点がLOFの特徴。",
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
            <button key={i} type="button" onClick={() => setSelected(i)} aria-pressed={chosen} className={`rounded-lg border px-3 py-2 text-left text-sm transition ${cls}`}>
              {c.label}
              {showState && c.correct ? " ✓" : null}
              {showState && chosen && !c.correct ? " ✗" : null}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div className={`rounded-lg p-3 text-sm leading-relaxed ${isCorrect ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`} role="status">
          <span className="font-semibold">{isCorrect ? "正解！ " : "もう一度考えてみよう。 "}</span>
          {q.explain}
        </div>
      ) : null}
    </div>
  );
}

/** 不均衡データ・異常検知 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function ImbalancedAnomalyQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a href="#anomaly-lab" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2">
        ↑ 操作に戻り、手法としきい値を変えて異常判定がどう変わるか確かめる
      </a>
    </div>
  );
}
