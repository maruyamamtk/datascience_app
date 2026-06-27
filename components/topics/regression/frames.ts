/**
 * 最小二乗のコマ送り（LeastSquaresStepper）のフレーム列ビルダー（計算層・純関数）。
 * 直線を回す（傾きを 1 段ずつ変える）と残差平方和 RSS が放物線状に最小（=OLS 解）へ向かう様子を、
 * RSS 曲線の点を 1 つずつ開示するコマ送りで見せる。副作用なし（Vitest 対象, 3層疎結合）。
 * 各傾きでは切片を「重心 (x̄,ȳ) を通す」最適値 ȳ−slope·x̄ に取り、RSS が傾きだけの放物線になるようにする。
 */

import type { VizFrame } from "@/components/viz";
import { olsFit, residualSumOfSquares, type Point } from "@/lib/stats/regression";

/** RSS 曲線上の 1 点（傾きと RSS）。 */
export type RssPoint = {
  /** 直線の傾き。 */
  slope: number;
  /** その傾き（＋重心を通す切片）での RSS。 */
  rss: number;
};

/** 各フレームで描画層が使う、傾きを i 段まで進めた時点のスナップショット。 */
export type RssPayload = {
  /** いま注目している傾き。 */
  slope: number;
  /** いまの切片（重心を通す最適値）。 */
  intercept: number;
  /** いまの RSS。 */
  rss: number;
  /** いま開示した点の通し番号（1 始まり）。 */
  step: number;
  /** ここまでに開示した RSS 曲線の点。 */
  revealed: RssPoint[];
  /** この傾きが（候補の中で）RSS 最小か。 */
  isMin: boolean;
};

const fmt = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "—");

/**
 * 傾き列 slopes を 1 つずつ進める RSS コマ送りのフレーム列を作る。
 * 各傾きで切片は重心を通す最適値に取り、RSS=Σ残差² を計算する。最小 RSS の傾き（≒OLS 解）を
 * 各フレームで `isMin` として示し、放物線の底が最小二乗解であることを体感させる。
 */
export function buildRssFrames(
  slopes: readonly number[],
  points: readonly Point[],
): VizFrame<RssPayload>[] {
  const { meanX, meanY, slope: olsSlope, rss: olsRss } = olsFit(points);
  const pts: (RssPoint & { intercept: number })[] = slopes.map((slope) => {
    const intercept = meanY - slope * meanX;
    return { slope, intercept, rss: residualSumOfSquares(points, { slope, intercept }) };
  });
  // 候補内の最小 RSS（コマ送りで「底」を強調するため）。
  const minRss = pts.reduce((m, p) => Math.min(m, p.rss), Infinity);

  return pts.map((p, i) => {
    const step = i + 1;
    const isMin = p.rss === minRss;
    return {
      payload: {
        slope: p.slope,
        intercept: p.intercept,
        rss: p.rss,
        step,
        revealed: pts.slice(0, step).map(({ slope, rss }) => ({ slope, rss })),
        isMin,
      },
      // いま開示した点を強調。
      highlights: [`rss-${i}`],
      callout: {
        title: `傾き ${fmt(p.slope)}：RSS ${fmt(p.rss)}`,
        body: isMin
          ? `この傾きで RSS が最小（${fmt(p.rss)}）。これが最小二乗解にほぼ一致する（OLS 傾き ${fmt(
              olsSlope,
            )}・最小 RSS ${fmt(olsRss)}）。`
          : `傾き ${fmt(p.slope)} だと RSS は ${fmt(p.rss)}。最小（${fmt(
              minRss,
            )}）より大きい＝当てはまりが悪い。`,
        note: "切片は各傾きで重心 (x̄,ȳ) を通す最適値に固定。RSS は傾きについて下に凸の放物線で、その底が最小二乗解。",
        kind: isMin ? "supplement" : "explain",
      },
    };
  });
}
