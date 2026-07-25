"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt:
      "自己情報量ステッパーで、確率p=1(必ず起きる事象)のとき自己情報量は0 bitだった。これはどういう意味か？",
    choices: [
      {
        label:
          "必ず起きるとあらかじめ分かっている事象は、実際に起きたと知っても新たな«驚き»が何もないから(-log2 1=0)",
        correct: true,
      },
      { label: "計算式にバグがあり、本来は0にならないはずだから", correct: false },
      { label: "p=1のときはlogが定義できないため、便宜的に0としているだけ", correct: false },
      { label: "確率が高い事象ほど自己情報量は大きくなるはずなので、この結果はおかしい", correct: false },
    ],
    explain:
      "自己情報量I(x)=-log2 p(x)は«珍しさ(驚き)»を測る量。p=1は«絶対に起きる»ことを意味するので、実際に起きたと知っても情報が増えない(驚きゼロ)。逆にpが小さい(珍しい)ほどI(x)は大きくなる——公正なコイン(p=0.5)でちょうど1 bit。",
  },
  {
    prompt: "エントロピー曲線H(p) vs pのラボで、H(p)がp=0.5で最大値1 bitを取るのはなぜか？",
    choices: [
      {
        label:
          "p=0.5(五分五分)のとき、結果を知る前に«どちらが出るか»が一番読めない(不確実性が最大)状態だから",
        correct: true,
      },
      { label: "p=0.5はたまたま計算しやすい値だから、便宜的に最大とみなしている", correct: false },
      { label: "pが大きいほどH(p)は単調に増加するはずだから", correct: false },
      { label: "H(p)は常に一定の値を取り、pによって変化しない", correct: false },
    ],
    explain:
      "H(p)=-p log2 p-(1-p)log2(1-p)をpで微分すると dH/dp=log2((1-p)/p)。これが0になるのはp=1-p、すなわちp=0.5のとき(それより左で正・右で負なので極大)。p=0.5は«表か裏か全く読めない»状態で不確実性が最大、p=0や1に近づくほど結果がほぼ確定していて不確実性が下がる。",
  },
  {
    prompt:
      "相互情報量ラボで、天気(晴れ/雨)と傘(持つ/持たない)を«独立»にする(対角と反対のセルをすべて同じ値にする)と、I(X;Y)はどうなるか？",
    choices: [
      {
        label:
          "ちょうど0になる——p(x,y)=p(x)p(y)が全セルで成り立ち、log2の中身が1(log2 1=0)になるため",
        correct: true,
      },
      { label: "独立にしても正の値のまま変わらない", correct: false },
      { label: "負の値になる(相互情報量は負にもなりうる)", correct: false },
      { label: "計算エラー(NaN)になる", correct: false },
    ],
    explain:
      "相互情報量I(X;Y)=ΣΣp(x,y)log2(p(x,y)/(p(x)p(y)))。XとYが独立ならp(x,y)=p(x)p(y)が全セルで成り立ち、分数の中身が常に1になるのでlog2 1=0、和も0になる。相互情報量は«独立からのズレ»を測る量なので、独立な変数どうしの相互情報量は必ず0(逆に、相互情報量が0以外なら独立ではない証拠)。",
  },
  {
    prompt: "KLダイバージェンスラボで、D_KL(P‖Q)とD_KL(Q‖P)は一般に異なる値になった。この性質を何と呼ぶか？",
    choices: [
      { label: "非対称性——KLダイバージェンスは«距離»の公理(対称性)を満たさない", correct: true },
      { label: "非負性——KLダイバージェンスは常に0以上になる性質", correct: false },
      { label: "加法性——独立な事象の情報量が足し算になる性質", correct: false },
      { label: "単調性——確率が大きいほど値も大きくなる性質", correct: false },
    ],
    explain:
      "KLダイバージェンスは常に0以上(非負性)だが、D_KL(P‖Q)=D_KL(Q‖P)は一般に成り立たない(非対称性)。«距離»と呼ばれるには対称性(A→BとB→Aが同じ値)が必要だが、KLはそれを満たさないため«距離»ではなく«ダイバージェンス(乖離度)»と呼ぶ——PとQのどちらを«真の分布»とみなすかで、損失の測り方の意味合いが変わる。",
  },
  {
    prompt:
      "相互情報量ラボの数式には、直接の定義式で計算したI(X;Y)と、KLダイバージェンス経由で計算したD_KL(P(X,Y)‖P(X)P(Y))が並んで表示されていた。この2つの値の関係は？",
    choices: [
      {
        label:
          "常に一致する——相互情報量は«同時分布と、独立だった場合の直積分布とのKLダイバージェンス»として定義できるから",
        correct: true,
      },
      { label: "偶然この例だけ一致しているだけで、一般には別の値になる", correct: false },
      { label: "KL経由の値は常に相互情報量の2倍になる", correct: false },
      { label: "無関係な2つの指標がたまたま似た値になっているだけ", correct: false },
    ],
    explain:
      "I(X;Y)=D_KL(P(X,Y)‖P(X)P(Y))は定義上の恒等式——«実際の同時分布»と«もしXとYが独立だったら得られたはずの分布(周辺分布の直積)»とのKLダイバージェンスが、そのまま相互情報量になる。計算層のテスト(mutualInformationとmutualInformationViaKLの一致)でもこの関係を数値的に確認している——«独立からどれだけズレているか»という同じ量を2通りの式で測っている。",
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

/** 情報理論トピックの演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function InformationTheoryQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#binary-entropy-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑ 操作に戻ってpや同時分布・2つの分布を動かし、エントロピー・相互情報量・KLダイバージェンスの変化を確かめる
      </a>
    </div>
  );
}
