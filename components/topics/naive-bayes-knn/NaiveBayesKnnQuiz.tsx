"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "ナイーブベイズの«ナイーブ»（単純）とはどんな仮定を指す？",
    choices: [
      { label: "特徴量どうしは、クラスが分かった条件のもとで独立である", correct: true },
      { label: "特徴量は必ず正規分布に従う", correct: false },
      { label: "訓練データは常にクラスごとに同数である", correct: false },
      { label: "決定境界は必ず直線になる", correct: false },
    ],
    explain:
      "«ナイーブ»は、特徴量どうしがクラス条件付きで独立（P(x1,x2|k)=P(x1|k)P(x2|k)）という単純化した仮定を指す。実際には特徴量が相関していても、この仮定のもとで尤度を各特徴量の密度の積として計算する——仮定が厳密には成り立たなくても実用上よく機能することが多い。",
  },
  {
    prompt: "ガウス型ナイーブベイズが新しい点を分類するとき、最終的に比較しているのは何？",
    choices: [
      { label: "各クラスの 事前確率×尤度×尤度 という未正規化スコアの大小", correct: true },
      { label: "各クラスの訓練データの点数のみ", correct: false },
      { label: "新しい点から最も近い1点のラベル", correct: false },
      { label: "決定木の情報利得", correct: false },
    ],
    explain:
      "事後確率 P(k|x)∝π_k·p(x1|k)·p(x2|k) の分母（正規化定数）はどのクラスでも共通なので、分類（argmax）には影響しない。したがって実質的には «事前×尤度×尤度» の未正規化スコアを比較するだけで分類は完了している。正規化は «確率らしく見せる» ための後処理。",
  },
  {
    prompt: "k近傍法が«怠惰学習（lazy learning）»と呼ばれる理由は？",
    choices: [
      { label: "訓練フェーズでモデルのパラメータを学習せず、全訓練データをそのまま記憶するだけだから", correct: true },
      { label: "予測に時間がかからないから", correct: false },
      { label: "必ず精度が低いから", correct: false },
      { label: "決定木より実装が簡単だから", correct: false },
    ],
    explain:
      "決定木やナイーブベイズは訓練時にパラメータ（分割・分布の平均分散など）を学習するが、k近傍法は訓練データをそのまま記憶するだけで«学習»をしない。計算の重さは予測時（新しい点が来るたびに全訓練点との距離を測る）に先送りされる——このため大規模データでは予測が遅くなりやすい。",
  },
  {
    prompt: "k近傍法で k を大きくしていくと、決定境界や汎化性能はどう変わる傾向がある？",
    choices: [
      { label: "境界は滑らかになる（分散が下がる）が、大きくしすぎると局所的な構造を無視し始める（バイアスが増える）", correct: true },
      { label: "境界は必ずより複雑になる", correct: false },
      { label: "kの大小は決定境界に一切影響しない", correct: false },
      { label: "kを大きくすると必ず訓練誤差が0に近づく", correct: false },
    ],
    explain:
      "多数決に参加する点が増えるほど個々の点のノイズが打ち消し合い、決定木・アンサンブル（バギング）と同じ«平均すると分散が下がる»効果で境界が滑らかになる。ただしkを大きくしすぎると近傍が局所的でなくなり、細かい構造を無視する（バイアスが増える）——過学習と適合不足のトレードオフはここでも成り立つ。",
  },
  {
    prompt: "同じ2特徴量の分類データに対し、ナイーブベイズとk近傍法のどちらが必ず優れているといえる？",
    choices: [
      { label: "どちらとも言えない——データが分布の仮定に合うか、局所的な近さで決まる構造かによって向き不向きが変わる", correct: true },
      { label: "ナイーブベイズが常に優れている（確率的なので厳密）", correct: false },
      { label: "k近傍法が常に優れている（仮定を置かないので柔軟）", correct: false },
      { label: "特徴量が2個なら常に同じ精度になる", correct: false },
    ],
    explain:
      "ナイーブベイズは«各クラスが正規分布に従う»などの仮定が的外れだと精度が落ちる一方、少ないデータでも安定しやすい。k近傍法は分布の仮定を置かない代わりに、特徴量のスケールや次元数（次元の呪い）に敏感で、大規模データでは予測が遅い。«万能な手法»は存在せず、データの性質に応じて選ぶ——これは機械学習の枠組みで学んだバイアス分散トレードオフの一形態でもある。",
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
          <span className="font-semibold">{isCorrect ? "正解！ " : "もう一度考えてみよう。 "}</span>
          {q.explain}
        </div>
      ) : null}
    </div>
  );
}

/** ナイーブベイズ・k近傍法 演習（確認問題 → 即時フィードバック → 操作へ戻る, SPEC §4.1③）。 */
export function NaiveBayesKnnQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a href="#naive-bayes-lab" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2">
        ↑ 操作に戻って新しい点の位置やkを変え、2つの手法の判断がどう変わるか確かめる
      </a>
    </div>
  );
}
