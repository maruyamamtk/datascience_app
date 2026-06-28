import { fitSimple, leverage, standardizedResiduals } from "@/lib/stats/regression-diagnostics";
import { createTopicStore } from "./topicStore";

/** 診断ラボの «きれいな» 基準データ（y≈x、ノイズ小）。最後に可動の1点を加える。 */
const BASE_X = [1, 2, 3, 4, 5, 6, 7, 8];
const BASE_Y = [1.2, 2.1, 2.9, 4.2, 4.8, 6.1, 6.9, 8.2];

/** 回帰診断ラボの操作値（可動の1点）。 */
export type DiagControls = {
  /** 可動点の x（大きいほどてこ比が高い＝影響力が強い）。 */
  px: number;
  /** 可動点の y。 */
  py: number;
};

/** 回帰診断ラボの派生値。 */
export type DiagDerived = {
  /** 全 x（基準＋可動点）。 */
  x: number[];
  /** 全 y。 */
  y: number[];
  /** 可動点込みの当てはめ。 */
  slope: number;
  intercept: number;
  fitted: number[];
  residuals: number[];
  /** 可動点を除いた当てはめの傾き（影響の比較用）。 */
  slopeWithout: number;
  /** 可動点のてこ比。 */
  leverageP: number;
  /** 可動点の標準化残差（|>2| で外れ値の目安）。 */
  stdResidP: number;
};

/**
 * 回帰診断（F-3）トピックの Zustand ストア（single source of truth）。
 * Control 層（可動点の x,y スライダー）は action を呼び、Render 層（散布図＋直線・残差プロット・
 * てこ比/標準化残差の数値）は controls・derived を購読する。frame は残差パターン図鑑のステッパーが使う。
 */
export const useDiagStore = createTopicStore<DiagControls, DiagDerived>({
  initialControls: { px: 9, py: 9 },
  derive: ({ px, py }) => {
    const x = [...BASE_X, px];
    const y = [...BASE_Y, py];
    const fit = fitSimple(x, y);
    const lev = leverage(x);
    const sr = standardizedResiduals(fit.residuals, lev);
    const fitWithout = fitSimple(BASE_X, BASE_Y);
    return {
      x,
      y,
      slope: fit.slope,
      intercept: fit.intercept,
      fitted: fit.fitted,
      residuals: fit.residuals,
      slopeWithout: fitWithout.slope,
      leverageP: lev[lev.length - 1],
      stdResidP: sr[sr.length - 1],
    };
  },
});
