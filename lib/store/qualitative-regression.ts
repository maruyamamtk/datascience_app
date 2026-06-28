import { generateBinaryData, logLikelihood, oddsRatio } from "@/lib/stats/logistic";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 2値データの固定設定（真のモデル: P(y=1)=σ(−2+1.5x)）。 */
const TRUE_B0 = -2;
const TRUE_B1 = 1.5;
export const LOGIT_DATA = generateBinaryData({
  n: 60,
  b0: TRUE_B0,
  b1: TRUE_B1,
  xMin: -1,
  xMax: 5,
  rng: mulberry32(20240901),
});

/** 質的回帰ラボの操作値（手で動かすロジスティック係数）。 */
export type LogitControls = {
  /** 切片 b0。 */
  b0: number;
  /** 傾き b1（対数オッズの変化率）。 */
  b1: number;
};

/** 質的回帰ラボの派生値。 */
export type LogitDerived = {
  /** オッズ比 e^{b1}。 */
  oddsRatio: number;
  /** 現在の (b0,b1) での対数尤度。 */
  logLik: number;
  /** P=0.5 となる x（決定境界）= −b0/b1。 */
  x50: number;
};

/**
 * 質的回帰（F-4）トピックの Zustand ストア（single source of truth）。
 * Control 層（b0・b1 スライダー）は action を呼び、Render 層（シグモイド曲線・2値データ点・オッズ比・
 * 対数尤度）は controls・derived を購読する。frame は勾配上昇で当てはめるステッパーが使う。
 */
export const useLogitStore = createTopicStore<LogitControls, LogitDerived>({
  initialControls: { b0: -1, b1: 0.6 },
  derive: ({ b0, b1 }) => ({
    oddsRatio: oddsRatio(b1),
    logLik: logLikelihood(LOGIT_DATA.x, LOGIT_DATA.y, b0, b1),
    x50: b1 !== 0 ? -b0 / b1 : Number.NaN,
  }),
});
