/**
 * 予測手法の «訓練→検証で当て比べ» をコマ送りで見せるフレーム列ビルダー（計算層・純関数）。
 * 訓練/検証に分割し、素朴・平均・ドリフト・指数平滑化の各予測を1手法ずつ検証区間へ重ね、
 * RMSE を積み上げて比較する（アルゴリズム図鑑スタイル）。副作用なし（Vitest 対象）。
 * 描画は ForecastEvalStepper.tsx が購読する。
 */

import type { VizFrame } from "@/components/viz";
import { mulberry32 } from "@/lib/stats/random";
import { generateSeries } from "@/lib/stats/time-series";
import {
  forecastDrift,
  forecastES,
  forecastMean,
  forecastNaive,
  rmse,
  trainTestSplit,
} from "@/lib/stats/forecasting";

export const EVAL_TRAIN_RATIO = 0.75;

/** 体感用の固定系列（右上がりトレンド＋弱い季節＋ノイズ）。 */
export function evalSeries(): number[] {
  return generateSeries({
    n: 72,
    slope: 0.12,
    amp: 1.8,
    period: 12,
    noiseSd: 1,
    base: 8,
    rng: mulberry32(20250601),
  }).value;
}

/** 予測手法。 */
export type MethodKey = "split" | "naive" | "mean" | "drift" | "es";

/** 各フレームのスナップショット。 */
export type ForecastFramePayload = {
  method: MethodKey;
  /** 全系列。 */
  series: number[];
  /** 訓練/検証の境界インデックス（series 上）。 */
  cut: number;
  /** その手法の検証区間予測（method="split" は null）。 */
  pred: number[] | null;
  /** その手法の検証 RMSE（split は null）。 */
  rmse: number | null;
  /** これまで計算した手法の RMSE 一覧（バー比較用）。 */
  scores: { key: MethodKey; label: string; rmse: number }[];
};

const LABELS: Record<MethodKey, string> = {
  split: "分割",
  naive: "素朴（最後の値）",
  mean: "平均",
  drift: "ドリフト（傾き外挿）",
  es: "指数平滑化 α=0.4",
};

/** 予測手法比較のフレーム列を作る。 */
export function buildForecastFrames(): VizFrame<ForecastFramePayload>[] {
  const series = evalSeries();
  const { train, test } = trainTestSplit(series, EVAL_TRAIN_RATIO);
  const cut = train.length;
  const h = test.length;

  const methods: { key: MethodKey; pred: number[] }[] = [
    { key: "naive", pred: forecastNaive(train, h) },
    { key: "mean", pred: forecastMean(train, h) },
    { key: "drift", pred: forecastDrift(train, h) },
    { key: "es", pred: forecastES(train, h, 0.4) },
  ];

  const frames: VizFrame<ForecastFramePayload>[] = [];
  const scores: { key: MethodKey; label: string; rmse: number }[] = [];

  // フレーム0：訓練/検証分割。
  frames.push({
    payload: { method: "split", series, cut, pred: null, rmse: null, scores: [] },
    highlights: ["split"],
    callout: {
      title: "訓練期間と検証期間に «時間順» で分ける",
      body: `先頭 ${cut} 点を訓練（モデル作り）、残り ${h} 点を検証（答え合わせ）に使う。時系列は «未来を予測» するので、シャッフルせず必ず時間順に切る（未来を学習に使わない）。`,
      note: "検証区間の実測はモデルに見せず、予測だけをぶつけて誤差を測る（ホールドアウト）。これで «将来データでの当たり具合» を公平に評価できる。",
      kind: "explain",
    },
  });

  // 各手法を1つずつ検証。
  for (const m of methods) {
    const score = rmse(test, m.pred);
    scores.push({ key: m.key, label: LABELS[m.key], rmse: score });
    frames.push({
      payload: {
        method: m.key,
        series,
        cut,
        pred: m.pred,
        rmse: score,
        scores: [...scores],
      },
      highlights: [`method-${m.key}`, "pred"],
      callout: {
        title: `${LABELS[m.key]}：検証RMSE=${score.toFixed(2)}`,
        body: methodBody(m.key),
        note:
          m.key === "es"
            ? "全手法のRMSEが出そろった。RMSEが最小の手法が «この検証区間で最も当たった»。トレンドがある系列ではドリフトが強く、水平予測の素朴・平均・SESは遅れがち。"
            : "検証区間の実測との二乗誤差の平方根がRMSE。小さいほど良い。まず単純な手法をベースラインにし、高度なモデルがこれを上回るかで «価値» を測る。",
        kind: m.key === "es" ? "supplement" : "explain",
      },
    });
  }

  return frames;
}

function methodBody(key: MethodKey): string {
  switch (key) {
    case "naive":
      return "訓練最後の値をそのまま水平に伸ばすだけ。«明日は今日と同じ» の最小ベースライン。ランダムウォークには実は最適。";
    case "mean":
      return "訓練期間の平均を水平に伸ばす。トレンドがあると系列から離れていく。";
    case "drift":
      return "訓練の最初と最後を結ぶ傾きで外挿。右上がりトレンドを捉えるので、この系列では有利。";
    case "es":
      return "指数平滑化の最終水準を水平に伸ばす。直近を重視しつつ滑らかだが、単純SESはトレンドを外挿しない（水平）ので遅れる。";
    default:
      return "";
  }
}
