/**
 * BrierScoreStepper(L0)のフレーム構築(純関数・Vitest対象)。
 * `@/lib/stats/probabilistic-forecasting`の計算結果から、コマ送り(StepPlayer)の
 * 1コマずつのcallout付きVizFrameへ変換する。
 */
import type { VizFrame } from "@/components/viz";
import {
  cumulativeBrierTerms,
  STEPPER_SAMPLES,
  type BrierStepperSample,
} from "@/lib/stats/probabilistic-forecasting";
import { num } from "./format";

export type BrierStepperFramePayload = {
  phase: "term" | "summary";
  /** phase="term"のときのSTEPPER_SAMPLES内のindex。summaryではnull。 */
  rowIndex: number | null;
  predicted: number;
  outcome: 0 | 1;
  squaredError: number;
  cumulativeSum: number;
  runningScore: number;
};

/**
 * 「①1件ずつ予測p̂と実際yを確認→②二乗誤差(p̂-y)²を計算→③累積和・途中経過の
 * ブライアスコアを更新」を1コマずつ組み立てる。総フレーム数=サンプル数+1(最後はまとめ)。
 */
export function buildBrierScoreFrames(
  samples: readonly BrierStepperSample[] = STEPPER_SAMPLES,
): VizFrame<BrierStepperFramePayload>[] {
  const rows = cumulativeBrierTerms(samples);
  const frames: VizFrame<BrierStepperFramePayload>[] = rows.map((r, i) => {
    const confident = r.predicted >= 0.65 || r.predicted <= 0.35;
    const correct = r.squaredError < 0.15;
    const verdict =
      confident && correct
        ? "自信を持って的中"
        : confident && !correct
          ? "自信満々で外れ"
          : "半信半疑";
    return {
      payload: {
        phase: "term",
        rowIndex: i,
        predicted: r.predicted,
        outcome: r.outcome,
        squaredError: r.squaredError,
        cumulativeSum: r.cumulativeSum,
        runningScore: r.runningScore,
      },
      callout: {
        title: `${i + 1}件目: p̂=${num(r.predicted, 2)}, 実際 y=${r.outcome}(${verdict})`,
        body: `この1件の二乗誤差 (p̂-y)²=(${num(r.predicted, 2)}-${r.outcome})²=${num(r.squaredError, 3)}。`,
        note: `${i + 1}件までの累積和=${num(r.cumulativeSum, 3)}、途中経過のブライアスコア(累積和÷件数)=${num(r.runningScore, 3)}。`,
        kind: "explain",
      },
    };
  });

  const last = rows[rows.length - 1];
  frames.push({
    payload: {
      phase: "summary",
      rowIndex: null,
      predicted: last.predicted,
      outcome: last.outcome,
      squaredError: last.squaredError,
      cumulativeSum: last.cumulativeSum,
      runningScore: last.runningScore,
    },
    callout: {
      title: `全${rows.length}件のブライアスコア = ${num(last.runningScore, 3)}`,
      body: "自信を持って的中させた項の二乗誤差はほぼ0に近く、自信満々で外した項は二乗誤差が跳ね上がる——ブライアスコアはこの「自信×正誤」の両方を1つの数字に圧縮したもの。",
      note: "0が最良(完全な予測)、1が最悪(常に自信満々で外す予測)。回帰の平均二乗誤差(MSE)を0/1の分類結果に適用した式そのもの。",
      kind: "supplement",
    },
  });

  return frames;
}
