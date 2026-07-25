"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt:
      "6クラスのテスト平均点で、生徒数n=5の小さいクラスと、n=40の大きいクラスがある。階層ベイズ(部分プーリング)の推定値は、それぞれどちらに近くなる傾向がある？",
    choices: [
      {
        label:
          "n=5のクラスは全体平均μに強く引き寄せられ(縮小が大きい)、n=40のクラスは自クラスの平均にほぼ一致する(縮小が小さい)",
        correct: true,
      },
      { label: "サンプルサイズに関わらず、常にどちらも全体平均μに一致する", correct: false },
      { label: "サンプルサイズに関わらず、常にどちらも自クラスの平均に一致する", correct: false },
      { label: "n=5のクラスの方が自クラスの平均に近くなる(n=40より縮小が小さい)", correct: false },
    ],
    explain:
      "縮小の重み B_j=(1/τ²)/(n_j/σ²+1/τ²) は n_j が大きいほど小さくなる。自グループのデータが豊富(n大)なほどそのデータを信頼してよく、逆にデータが少ない(n小)グループほど「たまたま偏った平均」である可能性が高いため、全体平均μの方向へより強く引き寄せられる。",
  },
  {
    prompt: "階層ベイズモデルのハイパー事前分散τ²を0に近づけていくと、部分プーリングの推定値はどうなる？",
    choices: [
      { label: "全グループの推定値が完全プール(単一の共通平均μ)に一致していく", correct: true },
      { label: "全グループの推定値がプールなし(各グループの自グループ平均)に一致していく", correct: false },
      { label: "τ²の値は推定値に一切影響しない", correct: false },
      { label: "推定値が発散して無限大になる", correct: false },
    ],
    explain:
      "τ²→0は「グループ間には本当は差が無い(全グループが同じθを共有している)」という事前の確信の強さを表す。この確信を強めるほど、各グループの推定値は自グループのデータに関わらず単一の共通平均μへ引き寄せられ、極限で完全プールに一致する。",
  },
  {
    prompt: "ベイズ線形回帰で、傾きβ1に正規事前分布N(0, τ_β²)を置いたとき、τ_β²を非常に小さくすると事後平均はどうなる？",
    choices: [
      { label: "OLS(最小二乗)の傾きから0(無回帰)の方向へ縮小される——Ridge回帰の正則化と同じ効果", correct: true },
      { label: "OLSの傾きと完全に一致し続ける(事前分布は結果に影響しない)", correct: false },
      { label: "傾きが必ず1になる", correct: false },
      { label: "切片も同時に0へ縮小される", correct: false },
    ],
    explain:
      "傾きの事後平均は precisionWeightedMean(β̂_OLS, S_xx/σ², 0, 1/τ_β²) という«精度加重平均»。τ_β²を小さくする(=事前分布の精度1/τ_β²を大きくする)ほど、事前平均0側の重みが増え、傾きは0へ縮小される。これはRidge回帰のMAP推定(λ=σ²/τ_β²)と数学的に同一の構造——切片には通常この罰則を掛けない(慣例通りOLSのまま)。",
  },
  {
    prompt: "階層ベイズモデルの事後平均とベイズ線形回帰の傾きの事後平均は、実装上どちらも同じ関数precisionWeightedMeanに帰着した。その理由として最も適切なのは？",
    choices: [
      {
        label: "どちらも«データから直接得られる推定値»と«事前(ハイパー事前平均/事前平均)»を、それぞれの不確実性(精度=分散の逆数)で重みづけて足し合わせる、という同じ数学的構造(正規分布どうしの共役更新)を持つため",
        correct: true,
      },
      { label: "偶然どちらも同じ数値になっただけで、数学的な必然性はない", correct: false },
      { label: "階層ベイズとベイズ線形回帰は本質的に全く同じモデルだから", correct: false },
      { label: "両方ともMCMCで近似計算しているため、たまたま同じ式になった", correct: false },
    ],
    explain:
      "階層ベイズのθ_jもベイズ線形回帰の傾きβ1も、«正規分布の尤度×正規分布の事前分布»という同じ共役構造を持つ。正規分布どうしの共役更新の事後平均は、常に«データ側の精度×データ平均+事前側の精度×事前平均»を«精度の和»で割った«精度加重平均»になる——これは一般的な数学的事実であり、異なる問題設定(グループ平均の推定 vs 回帰係数の推定)でも同じ式が現れる。",
  },
  {
    prompt: "潜在変数モデル(2成分混合正規分布)で、観測値xがちょうど2つの成分の中間に位置するとき、事後所属確率P(z=1|x)はどうなりやすい？",
    choices: [
      { label: "0.5に近い値になり、どちらの成分から生成されたか判断が難しくなる", correct: true },
      { label: "常にちょうど0.5になる(成分の分散に関わらず)", correct: false },
      { label: "必ず0か1のどちらかに決まる(中間値は取らない)", correct: false },
      { label: "潜在変数モデルでは事後所属確率は計算できない", correct: false },
    ],
    explain:
      "responsibility(所属確率)はベイズの定理 P(z=k|x)∝π_k・N(x;μ_k,σ_k) で連続的に計算される。xが2成分のちょうど中間付近にあるときは、どちらの成分の密度も同程度の値を取るため、事後所属確率は0.5に近い«あいまいな»値になる(2成分の分散が異なれば厳密に0.5にはならない)。潜在変数z自体は離散(0か1)だが、«観測後にどちらである確率が高いか»は連続的な確率として求まる、というのがベイズ推論による潜在変数の扱い方の核心。",
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

/** 階層ベイズモデル(K-3) 演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function HierarchicalBayesQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#shrinkage-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってτ²と縮小の関係を見直す
      </a>
    </div>
  );
}
