/**
 * 欠測処理の «欠測発生→完全ケース→平均代入→回帰代入→確率的回帰代入» をコマ送りで見せる
 * フレーム列ビルダー（計算層・純関数）。固定 MAR シナリオで «どの補完が平均/ばらつきを回復するか» を追う
 * （アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。描画は ImputationStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import {
  completeCaseEstimate,
  fullDataEstimate,
  generateMissing,
  meanImputationEstimate,
  regressionImputationEstimate,
  stochasticRegressionEstimate,
  type Estimate,
} from "@/lib/stats/missing";
import { mulberry32 } from "@/lib/stats/random";

/** 固定 MAR シナリオ（X が大きいほど欠測しやすい → 高 Y が抜ける）。 */
const UNITS = generateMissing({
  n: 1200,
  beta0: 10,
  beta1: 3,
  noise: 2,
  mechanism: "MAR",
  missRate: 0.45,
  strength: 0.3,
  rng: mulberry32(20250671),
});

const FULL = fullDataEstimate(UNITS);
const CC = completeCaseEstimate(UNITS);
const MEAN_IMP = meanImputationEstimate(UNITS);
const REG_IMP = regressionImputationEstimate(UNITS);
const STOCH = stochasticRegressionEstimate(UNITS, mulberry32(20250672));

export const TRUE_MEAN = FULL.mean;
export const TRUE_SD = FULL.sd;

export type ImputeStage = "missing" | "complete" | "mean" | "regression" | "stochastic";

export type ImputeFramePayload = {
  stage: ImputeStage;
  /** その段階の推定（真値は基準）。 */
  estimate: Estimate;
  trueMean: number;
  trueSd: number;
  /** 平均のバイアス（推定−真）。 */
  meanBias: number;
  /** SD の比（推定/真）。1 に近いほどばらつきを保持。 */
  sdRatio: number;
};

function frame(stage: ImputeStage, est: Estimate, title: string, body: string, note: string, kind: "explain" | "supplement", hl: string): VizFrame<ImputeFramePayload> {
  return {
    payload: {
      stage,
      estimate: est,
      trueMean: TRUE_MEAN,
      trueSd: TRUE_SD,
      meanBias: est.mean - TRUE_MEAN,
      sdRatio: est.sd / TRUE_SD,
    },
    highlights: [hl],
    callout: { title, body, note, kind },
  };
}

/** 補完法の手順フレーム列を作る（固定 MAR）。 */
export function buildImputationFrames(): VizFrame<ImputeFramePayload>[] {
  return [
    frame(
      "missing",
      FULL,
      "① MAR で欠測が発生：高い Y が抜けやすい",
      `X が大きいほど欠測しやすい設定（MAR）。X↑→Y↑なので «高い Y» が観測から抜ける。真の平均は ${TRUE_MEAN.toFixed(2)}、真の SD は ${TRUE_SD.toFixed(2)}。`,
      "欠測は観測変数 X に依存（Y 自身ではない）＝MAR。X を使えば救えるのがポイント。",
      "explain",
      "missing",
    ),
    frame(
      "complete",
      CC,
      `② 完全ケース分析：平均が下振れ（${CC.mean.toFixed(2)}）`,
      `欠測を捨てて観測 Y だけで平均をとると ${CC.mean.toFixed(2)}。高い Y が抜けているので真値 ${TRUE_MEAN.toFixed(2)} より低い——バイアス ${(CC.mean - TRUE_MEAN).toFixed(2)}。`,
      "MCAR なら完全ケースは不偏だが、MAR では観測が偏るので平均が歪む。",
      "supplement",
      "complete",
    ),
    frame(
      "mean",
      MEAN_IMP,
      `③ 平均代入：ばらつきが縮む（SD ${MEAN_IMP.sd.toFixed(2)}）`,
      `欠測を «観測平均» で一律に埋める。平均は完全ケースと同じ ${MEAN_IMP.mean.toFixed(2)} のままで、埋めた値が全部同じなので SD が ${MEAN_IMP.sd.toFixed(2)}（真値 ${TRUE_SD.toFixed(2)}）へ人工的に縮む。`,
      "平均代入は «分散の過小評価»。標準誤差も過小になり、有意になりやすい危険。",
      "supplement",
      "mean",
    ),
    frame(
      "regression",
      REG_IMP,
      `④ 回帰代入：X で予測して平均を回復（${REG_IMP.mean.toFixed(2)}）`,
      `観測データで Y〜X を回帰し、欠測 Y を X から予測して埋める。X が欠測の原因なので平均が真値 ${TRUE_MEAN.toFixed(2)} 近くの ${REG_IMP.mean.toFixed(2)} に戻る。ただし予測は «線の上» に乗るので SD はやや過小（${REG_IMP.sd.toFixed(2)}）。`,
      "MAR では観測変数を使う補完が効く。平均のバイアスは消せてもばらつきは足りない。",
      "supplement",
      "regression",
    ),
    frame(
      "stochastic",
      STOCH,
      `⑤ 確率的回帰代入：ばらつきも回復（SD ${STOCH.sd.toFixed(2)}）`,
      `回帰予測に «残差の散らばり» を足して埋める。平均 ${STOCH.mean.toFixed(2)} を保ったまま、SD も ${STOCH.sd.toFixed(2)}（真値 ${TRUE_SD.toFixed(2)}）へ回復。これを複数回繰り返して不確実性まで見積もるのが多重代入。`,
      "多重代入の1手の直感。ただし MNAR（Y 自身に依存）は観測変数だけでは救えない。",
      "explain",
      "stochastic",
    ),
  ];
}
