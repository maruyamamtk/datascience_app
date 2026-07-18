/**
 * 「ナイーブベイズの尤度計算」ステッパー（Level1）のフレーム列ビルダー（計算層・純関数・Vitest 対象）。
 *
 * 固定した1個の «新しい点» について、①事前確率→②特徴量x₁の尤度→③特徴量x₂の尤度→
 * ④事前×尤度×尤度（未正規化スコア）→⑤正規化して事後確率・最終決定、の5段階を1コマずつ見せる。
 * 数値はすべて lib/stats/naive-bayes-knn.ts の naiveBayesPredict を1回呼ぶだけで得た実際の計算結果
 * ——ラボ（NaiveBayesLab）と同じ計算経路を使うので «ステッパーで見せている過程が実際の分類と一致する»
 * ことが保証される。描画は NaiveBayesStepper.tsx。
 */

import type { CalloutKind, VizFrame } from "@/components/viz";
import { type ClassStats, naiveBayesPredict, type NBPrediction } from "@/lib/stats/naive-bayes-knn";

export type NBStage = "prior" | "likelihood1" | "likelihood2" | "score" | "posterior";

const STAGES: readonly NBStage[] = ["prior", "likelihood1", "likelihood2", "score", "posterior"];

export type NBFramePayload = {
  query: { x1: number; x2: number };
  prediction: NBPrediction;
  stage: NBStage;
  stageIndex: number;
};

/** ステッパー専用の固定クエリ点（ラボの操作値とは独立、2クラスの中間あたりで «拮抗» の物語を作る）。 */
export const NB_STEP_QUERY = { x1: 0.5, x2: 0.5 };

/** ナイーブベイズ尤度ステッパーのフレーム列（①事前→②③尤度→④スコア→⑤事後確率・決定）を作る。 */
export function buildNaiveBayesFrames(
  classStats: readonly ClassStats[],
  query: { x1: number; x2: number } = NB_STEP_QUERY,
): VizFrame<NBFramePayload>[] {
  const prediction = naiveBayesPredict(classStats, query.x1, query.x2);
  const c0 = classStats.find((c) => c.label === 0)!;
  const c1 = classStats.find((c) => c.label === 1)!;
  const winner = prediction.label;

  return STAGES.map((stage, stageIndex) => {
    const payload: NBFramePayload = { query, prediction, stage, stageIndex };
    let highlights: string[] = [];
    let title = "";
    let body = "";
    let note: string | undefined;
    let kind: CalloutKind = "explain";

    switch (stage) {
      case "prior":
        highlights = [];
        title = "① 事前確率 π_k";
        body = `クラス0の事前確率 π₀=${prediction.prior[0].toFixed(3)}、クラス1の事前確率 π₁=${prediction.prior[1].toFixed(3)}（訓練データでの各クラスの割合）。`;
        note = "まだ新しい点 x の座標は使っていない——観測前の «土地勘» に相当する。";
        break;
      case "likelihood1":
        highlights = ["class0", "class1", "x1line"];
        title = "② 特徴量 x₁ の尤度 p(x₁∣k)";
        body = `p(x₁∣0)=${prediction.likelihood1[0].toFixed(3)}、p(x₁∣1)=${prediction.likelihood1[1].toFixed(3)}——各クラスの釣鐘型分布に x₁=${query.x1.toFixed(2)} を当てはめた高さ。`;
        note = `クラス0の x₁ 平均は${c0.mean1.toFixed(2)}、クラス1は${c1.mean1.toFixed(2)}——平均に近いほど尤度は大きくなる。`;
        break;
      case "likelihood2":
        highlights = ["class0", "class1", "x2line"];
        title = "③ 特徴量 x₂ の尤度 p(x₂∣k)";
        body = `p(x₂∣0)=${prediction.likelihood2[0].toFixed(3)}、p(x₂∣1)=${prediction.likelihood2[1].toFixed(3)}。`;
        note = "「特徴量どうしはクラスが分かれば独立」というナイーブな仮定のもとで、x₁の尤度とは別々に掛け合わせる。";
        break;
      case "score":
        highlights = [winner === 0 ? "class0" : "class1"];
        title = "④ 事前 × 尤度 × 尤度（未正規化スコア）";
        body = `S₀=π₀·p(x₁∣0)·p(x₂∣0)=${prediction.score[0].toExponential(2)}、S₁=π₁·p(x₁∣1)·p(x₂∣1)=${prediction.score[1].toExponential(2)}。`;
        note = "この時点でもう大小関係（どちらのクラスが選ばれるか）は決まっている——正規化は «確率らしく見せる» ための後処理にすぎない。";
        break;
      case "posterior":
        highlights = [winner === 0 ? "class0" : "class1"];
        title = "⑤ 正規化して事後確率・最終決定";
        body = `P(0∣x)=${(prediction.posterior[0] * 100).toFixed(1)}%、P(1∣x)=${(prediction.posterior[1] * 100).toFixed(1)}% → クラス${winner}と判定。`;
        note = "分母 S₀+S₁ で割るだけなので大小関係は変わらない——事後確率が最大のクラスを選ぶ（MAP推定）。";
        kind = "supplement";
        break;
    }

    return { payload, highlights, callout: { title, body, note, kind } };
  });
}
