/**
 * OvrStepper(Level1)の純粋なフレームビルダー。
 * N×N混同行列を、クラスを1つずつ「そのクラス vs 残り全部」の2値問題として切り出す
 * One-vs-Rest分解のコマ送りで見せ、最後にMacro/Micro/Weighted平均を数式付きで積み上げる
 * (SPEC §3 J-4「Micro/Macro/Weighted平均」、詳細_第4章 §4.3〜4.7)。
 *
 * フレーム構成: [overview, class(0)..class(n-1), summary] = n+2 フレーム
 * (binary-classification-metrics/frames.ts の buildRocFrames と同じ構成パターン)。
 */
import type { VizFrame } from "@/components/viz";
import {
  type AverageMetrics,
  type ConfusionMatrixNxN,
  macroAverageOf,
  microAverageOf,
  type PerClassMetrics,
  perClassMetricsOf,
  weightedAverageOf,
} from "@/lib/stats/multiclass-metrics";

export type OvrStepPayload = {
  step: "overview" | "class" | "summary";
  /** このフレームで切り出しているクラス(overview/summaryではundefined)。 */
  current?: PerClassMetrics;
  /** ここまでに切り出し終えたクラスの一覧(表を少しずつ埋めていく)。 */
  revealed: PerClassMetrics[];
  /** 全クラス分のOne-vs-Rest指標(常に一定、背景の完成形として使う)。 */
  all: PerClassMetrics[];
  /** summaryフレームのみ: Macro/Micro/Weighted平均。 */
  macro?: AverageMetrics;
  micro?: AverageMetrics;
  weighted?: AverageMetrics;
};

/** 混同行列とクラスラベルからOvrStepperのフレーム列を作る純関数。 */
export function buildOvrFrames(
  matrix: ConfusionMatrixNxN,
  labels: readonly string[],
): VizFrame<OvrStepPayload>[] {
  const all = perClassMetricsOf(matrix, labels);
  const frames: VizFrame<OvrStepPayload>[] = [];

  frames.push({
    highlights: [],
    callout: {
      title: `${labels.length}クラスの混同行列を、クラスごとに2値問題へ切り出す`,
      body: "各クラスを「そのクラス vs 残り全部」とみなすと(One-vs-Rest)、二値分類と同じTP・FP・FN・TNが定義できる。",
      note: "これを1クラスずつ繰り返し、最後にMacro・Micro・Weightedの3通りで平均する。",
      kind: "explain",
    },
    payload: { step: "overview", revealed: [], all },
  });

  for (let k = 0; k < all.length; k++) {
    const current = all[k];
    const revealed = all.slice(0, k + 1);
    frames.push({
      highlights: [`ovr-class-${k}`],
      callout: {
        title: `${k + 1}/${all.length}クラス目:「${current.label}」 vs 残り全部`,
        body: `TP=${current.counts.tp}, FP=${current.counts.fp}, FN=${current.counts.fn} から precision・recall・F1 を計算する。`,
        note: `support(実際に「${current.label}」であるサンプル数)=${current.support}件。`,
        kind: "supplement",
      },
      payload: { step: "class", current, revealed, all },
    });
  }

  const macro = macroAverageOf(all);
  const micro = microAverageOf(all);
  const weighted = weightedAverageOf(all);
  frames.push({
    highlights: all.map((_, k) => `ovr-class-${k}`),
    callout: {
      title: "全クラス分そろった: Macro・Micro・Weightedの3通りで平均する",
      body: "Macro=クラスごとの値を単純平均、Weighted=サンプル数で重み付け平均、Micro=TP・FP・FNを合算してから1回だけ計算。",
      note: "クラスの大きさに偏りがあると、Macroだけが少数派クラスの低い性能に強く引っ張られて他の2つと大きく乖離する。",
      kind: "explain",
    },
    payload: { step: "summary", revealed: all, all, macro, micro, weighted },
  });

  return frames;
}
