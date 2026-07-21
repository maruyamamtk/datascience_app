"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "AIC = −2×対数尤度 + 2k のkは何を表す？",
    choices: [
      { label: "そのモデルのパラメータ数(切片・係数の数)", correct: true },
      { label: "標本サイズ(観測数)", correct: false },
      { label: "交差検証の分割数", correct: false },
      { label: "残差平方和(RSS)", correct: false },
    ],
    explain:
      "kはモデルのパラメータ数(回帰なら切片＋係数の数)。パラメータが1個増えるごとに罰則が2ずつ増える——これがAICの«複雑さへの罰則»の中身。標本サイズnはBICの罰則(k log n)には登場するが、AICの罰則には登場しない。",
  },
  {
    prompt: "「標本サイズnが8以上ある«ふつうの»データでは、BICの1パラメータあたりの罰則(log n)はAICの罰則(2)より大きい」——○か×か。",
    choices: [
      { label: "○。log n > 2 ⟺ n > e²≈7.39なので、n=8以上なら常にBICの罰則の方が大きい", correct: true },
      { label: "×。nの値に関わらずAICの罰則の方が常に大きい", correct: false },
      { label: "○だが、境目はn=100付近", correct: false },
      { label: "×。BICとAICの罰則は常に等しい", correct: false },
    ],
    explain:
      "log n = 2 を高校数学の対数・指数の関係で解くと n = e² ≈ 7.39。したがってn=8以上の«ふつうの»標本サイズでは常にlog n > 2となり、BICの方がAICよりパラメータ数を重く罰する——この差がBICをAICより小さい(単純な)モデルへ導く理由。",
  },
  {
    prompt: "Mallows の Cp が、あるモデル(パラメータ数p)についてCp≈pに近い値だった。これは何を意味する？",
    choices: [
      { label: "当てはまりと複雑さがちょうど釣り合っている(良いモデルサイズの目安)", correct: true },
      { label: "そのモデルは必ず過学習している", correct: false },
      { label: "そのモデルの説明変数が足りていない(当てはまり不足)", correct: false },
      { label: "Cpは常にpと一致するので、この情報だけでは何も分からない", correct: false },
    ],
    explain:
      "Cp=RSS_p/σ̂²−n+2pという式で、Cpがそのモデルのパラメータ数pに近い値になっているときは、当てはまりの良さと複雑さのバランスが取れている目安になる。Cpがpより十分大きいと当てはまり不足(変数が足りない)を疑う。",
  },
  {
    prompt: "交差検証(cross validation)が情報量規準(AIC・BIC・Cp)と根本的に異なる点は？",
    choices: [
      { label: "同じデータで当てはめて罰則を引くのではなく、実際にデータを訓練用と検証用に分けて未知データへの予測誤差を測る", correct: true },
      { label: "交差検証はパラメータ数を全く考慮しない", correct: false },
      { label: "交差検証は正規分布を仮定したデータにしか使えない", correct: false },
      { label: "交差検証とAIC/BIC/Cpは全く同じ計算をしている", correct: false },
    ],
    explain:
      "情報量規準は«同じデータで当てはめた対数尤度に、パラメータ数に応じた罰則を足し引きする»計算だけで済む。交差検証はデータを訓練用・検証用に分け、実際に«学習に使っていないデータ»でどれだけ正確に予測できるかを直接測る——計算の道筋は全く違うが、多くの場合は近い結論(似たモデルサイズ)にたどり着く。",
  },
  {
    prompt: "上のラボの具体例(真に効くのはx1・x2だけ)で、AICだけが真のモデルより1つ多い変数を含むモデルを«最良»と判断してしまった。この現象を最もよく説明するのは？",
    choices: [
      { label: "AICの罰則(2)がBIC(log n)より緩いため、無関係な変数を含めてRSSがわずかに下がるだけでも«得»と判断してしまうことがある", correct: true },
      { label: "AICの計算式が間違っているから", correct: false },
      { label: "BIC・Cpの方が常に間違った結論を出すから", correct: false },
      { label: "この現象はこのデータセット固有のバグで、一般には起こらない", correct: false },
    ],
    explain:
      "AICは統計的によく確立された規準だが、罰則が相対的に緩いため、標本サイズが大きい場合ほどBICより«余分な変数を含みがち»になる(漸近的にAICは真のモデルを選ぶ一致性を持たない)。これは実装のバグではなく、AIC・BICそれぞれの設計思想の違いから来る、よく知られた一般的な性質。",
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

/** モデル選択基準 演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function ModelSelectionQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#model-selection-criteria-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってモデルサイズを選び直して確かめる
      </a>
    </div>
  );
}
