import { brownianEnsemble, ensembleMean, type Path } from "@/lib/stats/stochastic";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** 時間離散化。T = STEPS·DT = 1。 */
export const STEPS = 60;
export const DT = 1 / STEPS;
/** 表示する標本パス数。 */
export const PATH_COUNT = 16;

/** 確率過程ラボの操作値。 */
export type StochasticControls = {
  /** ボラティリティ σ（拡散の速さ、分散∝σ²t）。 */
  sigma: number;
  /** ドリフト μ（平均の傾き、平均∝μt）。 */
  mu: number;
};

/** 確率過程ラボの派生値。 */
export type StochasticDerived = {
  /** 標本パス（ブラウン運動）。 */
  paths: Path[];
  /** 各時刻の理論平均 μ·t。 */
  meanSeq: number[];
  /** 各時刻の理論標準偏差 σ·√t（±2σ√t の帯に使う）。 */
  sdSeq: number[];
  /** 終端の理論分散 σ²·T。 */
  terminalVar: number;
};

/**
 * 確率過程（L-2）トピックの Zustand ストア（single source of truth）。
 * Control 層（ボラティリティ σ・ドリフト μ スライダー）は action を呼び、Render 層（標本パス・±2σ√t の拡散帯・
 * 平均ドリフト線・終端分散・数式）は controls・derived を購読する。σ を上げると帯が √t で広がる。
 * データは固定シードで再現可能。frame は確率過程ギャラリーのステッパーが使う。
 */
export const useStochasticStore = createTopicStore<StochasticControls, StochasticDerived>({
  initialControls: { sigma: 1, mu: 0 },
  derive: ({ sigma, mu }) => {
    const paths = brownianEnsemble({
      count: PATH_COUNT,
      steps: STEPS,
      dt: DT,
      sigma,
      mu,
      rng: mulberry32(20241501),
    });
    void ensembleMean; // 理論平均を使うため未使用（アンサンブル平均は検証用）。
    const meanSeq = Array.from({ length: STEPS + 1 }, (_, k) => mu * (k * DT));
    const sdSeq = Array.from({ length: STEPS + 1 }, (_, k) => sigma * Math.sqrt(k * DT));
    return { paths, meanSeq, sdSeq, terminalVar: sigma * sigma * (STEPS * DT) };
  },
});
