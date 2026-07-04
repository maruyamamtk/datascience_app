import {
  type Dart,
  estimatePi,
  runningPiEstimate,
  throwDarts,
} from "@/lib/stats/monte-carlo";
import { mulberry32 } from "@/lib/stats/random";
import { createTopicStore } from "./topicStore";

/** π 推定で投げられるダーツ数の候補（対数的に増やす）。 */
export const DART_STEPS = [50, 200, 800, 3200, 12800] as const;

/** 計算多用手法ラボの操作値。 */
export type MonteCarloControls = {
  /** 投げるダーツ数のインデックス（DART_STEPS の添字）。 */
  levelIndex: number;
};

/** 計算多用手法ラボの派生値。 */
export type MonteCarloDerived = {
  /** 投げたダーツ列（[-1,1]² 上・円内外つき）。 */
  darts: Dart[];
  /** 実際に投げた数。 */
  n: number;
  /** 円内の数。 */
  inside: number;
  /** π の推定値 = 4·inside/n。 */
  piHat: number;
  /** 真の π との誤差。 */
  error: number;
  /** 1個ずつ足したときの推定推移（収束の可視化用・末尾200点に間引き）。 */
  running: number[];
};

/**
 * 計算多用手法（L-3）トピックの Zustand ストア（single source of truth）。
 * Control 層（ダーツ数スライダー）は action を呼び、Render 層（ダーツ散布図・π推定・収束曲線・数式）は
 * controls・derived を購読する。n を増やすと推定が π に «1/√n の速さで» 近づくことを体感する。
 * データは固定シードで再現可能。frame はブートストラップのステッパーが使う。
 */
export const useMonteCarloStore = createTopicStore<MonteCarloControls, MonteCarloDerived>({
  initialControls: { levelIndex: 1 },
  derive: ({ levelIndex }) => {
    const n = DART_STEPS[Math.max(0, Math.min(DART_STEPS.length - 1, Math.round(levelIndex)))];
    const darts = throwDarts(n, mulberry32(20250057));
    const inside = darts.reduce((a, d) => a + (d.inside ? 1 : 0), 0);
    const piHat = estimatePi(darts);
    const full = runningPiEstimate(darts);
    // 収束曲線は最大200点に間引く（描画負荷を抑える）。
    const stride = Math.max(1, Math.floor(full.length / 200));
    const running = full.filter((_, i) => i % stride === 0 || i === full.length - 1);
    return { darts, n, inside, piHat, error: Math.abs(piHat - Math.PI), running };
  },
});
