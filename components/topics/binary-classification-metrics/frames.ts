/**
 * RocStepper(Level1)の純粋なフレームビルダー。
 * n件のサンプルをスコアの高い順に1件ずつコマ送りで「陽性と予測する側」へ繰り込み、
 * ROC曲線が(0,0)から(1,1)へ1段ずつ伸びていく様子と、AUC(台形則の累積面積)が
 * 少しずつ積み上がっていく様子を見せる(SPEC §3 J-3「ROC曲線とAUC」)。
 *
 * フレーム構成: [overview, sample(0)..sample(n-1), summary] = n+2 フレーム
 * (regression-metrics/frames.ts と同じ構成パターン)。
 */
import type { VizFrame } from "@/components/viz";
import { aucOf, rocPointsOf, type RocPoint, type Sample } from "@/lib/stats/binary-classification-metrics";

export type RocStepPayload = {
  step: "overview" | "sample" | "summary";
  /** ここまでに繰り込んだROC曲線の点列((0,0)を先頭に含む)。 */
  points: RocPoint[];
  /** 全件処理後の完全なROC曲線(背景の薄いガイド線として使う)。 */
  allPoints: RocPoint[];
  /** このフレームで新たに繰り込んだサンプル(overviewフレームではundefined)。 */
  sample?: Sample;
  /** ここまでの点列で計算した累積AUC。 */
  cumulativeAuc: number;
  /** 全件処理後の最終AUC(summaryフレームのみ)。 */
  finalAuc?: number;
};

/** samples・rocPointsOfの結果からRocStepperのフレーム列を作る純関数。 */
export function buildRocFrames(samples: readonly Sample[]): VizFrame<RocStepPayload>[] {
  const allPoints = rocPointsOf(samples);
  const byId = new Map(samples.map((s) => [s.id, s] as const));
  const frames: VizFrame<RocStepPayload>[] = [];

  frames.push({
    highlights: [],
    callout: {
      title: `${samples.length}件のサンプルをスコアの高い順に1件ずつ処理する`,
      body: "スコアが最も高いサンプルから順に「陽性と予測する側」へ繰り込んでいく。陽性を繰り込むと曲線は上へ、陰性を繰り込むと曲線は右へ1段進む。",
      note: "これは «しきい値を1から少しずつ下げていく» のと同じ操作——全件処理し終えると (FPR,TPR)=(1,1) に到達する。",
      kind: "explain",
    },
    payload: { step: "overview", points: [allPoints[0]], allPoints, cumulativeAuc: 0 },
  });

  for (let i = 1; i < allPoints.length; i++) {
    const pt = allPoints[i];
    const sample = pt.sampleId !== undefined ? byId.get(pt.sampleId) : undefined;
    const pointsSoFar = allPoints.slice(0, i + 1);
    const cumulativeAuc = aucOf(pointsSoFar);
    const isPositive = sample?.label === 1;
    frames.push({
      highlights: [`roc-point-${i}`],
      callout: {
        title: `${i}/${samples.length}件目: 実際は${isPositive ? "陽性" : "陰性"}(スコア=${pt.threshold.toFixed(2)})`,
        body: isPositive
          ? "陽性を正しく検出=TPが1増える。曲線は上(TPR↑)へ1段進む。"
          : "陰性を陽性側に誤って含めた=FPが1増える。曲線は右(FPR↑)へ1段進む。",
        note: `ここまでの累積AUC=${cumulativeAuc.toFixed(3)}`,
        kind: "supplement",
      },
      payload: { step: "sample", points: pointsSoFar, allPoints, sample, cumulativeAuc },
    });
  }

  const finalAuc = aucOf(allPoints);
  frames.push({
    highlights: allPoints.map((_, i) => `roc-point-${i}`),
    callout: {
      title: `全件処理が終わった: AUC=${finalAuc.toFixed(3)}`,
      body: "ROC曲線が(0,0)から(1,1)まで描き終わった。台形則で下側の面積を積み上げるとAUCになる。",
      note: "AUC=1なら完全に分離できている、AUC=0.5なら«ランダムに予測している»のと同程度——陽性・陰性を1件ずつランダムに選んだとき、陽性の方が高いスコアになる確率と一致する(Mann-WhitneyのU統計量と同じ解釈)。",
      kind: "explain",
    },
    payload: { step: "summary", points: allPoints, allPoints, cumulativeAuc: finalAuc, finalAuc },
  });

  return frames;
}
