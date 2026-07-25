"use client";

import { useState } from "react";

type Choice = { label: string; correct: boolean };
type Question = { prompt: string; choices: Choice[]; explain: string };

const QUESTIONS: Question[] = [
  {
    prompt: "ブライアスコア BS=(1/n)Σ(p̂-y)² について正しい説明はどれか?",
    choices: [
      { label: "0が最良(完全な予測)、1が最悪の値を取る", correct: true },
      { label: "値が大きいほど良い予測", correct: false },
      { label: "しきい値を選ばないと計算できない", correct: false },
      { label: "カテゴリー予測(0/1)にしか使えず、確率には使えない", correct: false },
    ],
    explain:
      "ブライアスコアは予測確率p̂と実際の結果y(0/1)の二乗誤差の平均——回帰の平均二乗誤差(MSE)を分類結果に適用したもの。0(完全に的中)〜1(完全に外れ)の範囲を取り、小さいほど良い予測。ROC/AUCと違い、しきい値を選ばずに«確率値そのもの»の質を1つの数字で測れる。",
  },
  {
    prompt: "「信頼度(Calibration)」が高い予測とはどういう状態か?",
    choices: [
      {
        label: "予測確率p̂=0.7と言ったとき、実際にそのグループの約70%で事象が起きている",
        correct: true,
      },
      { label: "予測確率が常に0か1のどちらかに偏っている", correct: false },
      { label: "ROC曲線のAUCが1に近い", correct: false },
      { label: "予測確率の分散が小さい", correct: false },
    ],
    explain:
      "信頼度(Calibration)は「予測確率と実際の発生頻度が一致しているか」を表す。p̂=0.7と言ったグループで実際に約70%起きていれば較正が取れている——信頼度曲線(Reliability Diagram)が対角線に近いほど良い。AUCや分散(Sharpness)とは別の観点。",
  },
  {
    prompt:
      "上のCalibrationLabで確信度スケールkを1より大きくする(過信にする)と、信頼度曲線とSharpnessはどう動くか?",
    choices: [
      {
        label: "信頼度曲線は対角線から離れる(信頼度エラー↑)が、Sharpnessは上がる(0/1に近づくため)",
        correct: true,
      },
      { label: "信頼度曲線・Sharpnessともに変化しない", correct: false },
      { label: "信頼度曲線は対角線に近づき、Sharpnessは下がる", correct: false },
      { label: "Sharpnessだけが下がり、信頼度曲線は変わらない", correct: false },
    ],
    explain:
      "k>1は予測確率を0.5から遠ざける(より自信満々にする)歪み。予測確率自体は0/1に近づくのでSharpness(分散)は上がるが、実際の発生率はtrueProbのままなので予測と実測がズレ、信頼度曲線は対角線から離れる——«自信があること»と«その自信が当たっていること»は別、というSharpnessとCalibrationの違いを表す典型例。",
  },
  {
    prompt: "ブライアスコアの分解 BS=信頼度エラー-Refinement+不確実性 について正しいのはどれか?",
    choices: [
      {
        label: "Refinement(解像度)が高い(ビンごとの発生率が全体平均から離れている)ほどBSは下がる",
        correct: true,
      },
      { label: "不確実性はデータに依存せず常に0である", correct: false },
      { label: "信頼度エラーが大きいほどBSは下がる", correct: false },
      { label: "3つの項はいずれも負の値になりうる", correct: false },
    ],
    explain:
      "信頼度エラーはマイナス方向(引かれる項はプラスの誤差)、Refinementは«引く»項なので大きいほどBSを下げる(ビンごとに発生率をきちんと分けられている=情報量がある)、不確実性ō(1-ō)はデータ自体が持つ曖昧さでō=0.5のとき最大の0.25になる定数項(予測の質とは無関係)。信頼度エラー・Refinement・不確実性はいずれも2乗や確率の積の形で0以上。",
  },
  {
    prompt:
      "コスト/ロスモデルで、対策コストC=4、ロスL=10のとき、確率予測を使った最適な意思決定方式はどれか?",
    choices: [
      { label: "予測確率p̂が0.4以上なら対策する(p*=C/L=0.4)", correct: true },
      { label: "予測確率にかかわらず常に対策する", correct: false },
      { label: "予測確率が0.5以上なら対策する(常に0.5固定)", correct: false },
      { label: "予測確率が0.1以上なら対策する", correct: false },
    ],
    explain:
      "対策の期待コストはC(一定)、対策しない場合の期待コストはp̂・L。対策する方が得になるのはC<p̂・L ⟺ p̂>C/L=4/10=0.4のとき。カテゴリー予測は固定のしきい値(通常0.5)しか使えないが、確率予測はユーザーごとのコスト比に応じてこの最適しきい値を柔軟に調整できる——これが確率予測が価値を生む理由。",
  },
  {
    prompt: "ROC曲線・AUCとブライアスコア・信頼度(Calibration)の関係について正しい説明はどれか?",
    choices: [
      {
        label:
          "AUCはしきい値によらない«順位づけ»の良さを測るが、確率値そのものの較正が取れているかは測らない",
        correct: true,
      },
      { label: "AUC=1ならブライアスコアも必ず0になる", correct: false },
      { label: "信頼度(Calibration)が完璧ならAUCも必ず1になる", correct: false },
      { label: "ROC/AUCとブライアスコアは全く同じ情報を与える", correct: false },
    ],
    explain:
      "AUC(前提: [二値分類の評価指標](/topics/binary-classification-metrics))は「陽性が陰性より高いスコアになる確率」——順位づけの良さだけを見る指標で、確率の«目盛り»が合っているかは無関係(スコアを2倍しても3乗してもAUCは変わらない)。逆に、常に基準発生率だけを予測する«何も語らない»モデルは較正は完璧(信頼度エラー0)でもAUC=0.5(順位づけの情報がゼロ)になりうる——2つの指標は別の観点を測っている。",
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

/** 確率予測の評価トピックの演習(確認問題 → 即時フィードバック → 操作へ戻るリンク, SPEC §4.1③)。 */
export function ProbabilisticForecastingQuiz() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} />
      ))}
      <a
        href="#calibration-lab"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-blue-700 underline underline-offset-2"
      >
        ↑
        操作に戻り、確信度スケールkを動かして信頼度曲線・Sharpness・ブライアスコアの分解がどう連動するか確かめる
      </a>
    </div>
  );
}
