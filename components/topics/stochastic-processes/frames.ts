/**
 * 代表的な確率過程 «ランダムウォーク→ブラウン運動→ポアソン過程» をコマ送りで見せるフレーム列ビルダー
 * （計算層・純関数）。各過程の標本パスと «性質»（増分の種類）を提示する。
 * 副作用なし（Vitest 対象）。描画（ProcessGalleryStepper.tsx）はこの結果を購読するだけ。
 */

import type { VizFrame } from "@/components/viz";
import { brownianMotion, poissonProcess, randomWalk } from "@/lib/stats/stochastic";
import { mulberry32 } from "@/lib/stats/random";

/** 各フレーム（ある過程）のスナップショット。 */
export type ProcessPayload = {
  kind: "walk" | "brownian" | "poisson";
  label: string;
  /** 標本パス（時刻ごとの値）。 */
  path: number[];
  /** 「増分」の種類の説明。 */
  increment: string;
  /** 階段状（ポアソン）か折れ線か。 */
  stepped: boolean;
};

/** 3つの過程のフレーム列を作る（決定的）。 */
export function buildProcessFrames(): VizFrame<ProcessPayload>[] {
  const walk = randomWalk({ length: 60, step: 1, pUp: 0.5, rng: mulberry32(101) });
  const bm = brownianMotion({ steps: 120, dt: 1 / 120, sigma: 1, mu: 0, rng: mulberry32(202) });
  const pois = poissonProcess({ steps: 60, dt: 1 / 6, rate: 3, rng: mulberry32(303) });

  return [
    {
      path: walk,
      kind: "walk" as const,
      label: "① ランダムウォーク",
      increment: "±1 の離散ステップ（独立・同分布）",
      stepped: false,
      note: "各時刻に ±1 を足すだけ。離散時間・離散空間の最も素朴な確率過程。歩数を増やすとブラウン運動に近づく。",
    },
    {
      path: bm,
      kind: "brownian" as const,
      label: "② ブラウン運動（ウィーナー過程）",
      increment: "正規分布の増分 N(0, σ²dt)（独立増分・連続）",
      stepped: false,
      note: "ランダムウォークの連続極限。増分は独立な正規で、分散が時間に比例（Var[B_t]=σ²t）。連続だが至る所で微分不可能。",
    },
    {
      path: pois,
      kind: "poisson" as const,
      label: "③ ポアソン過程",
      increment: "指数間隔で +1 のジャンプ（計数過程）",
      stepped: true,
      note: "イベントの到着回数を数える過程。到着間隔は指数分布、時刻 t までの到着数はポアソン分布 Po(λt)。階段状に増える。",
    },
  ].map((d) => ({
    payload: {
      kind: d.kind,
      label: d.label,
      path: d.path,
      increment: d.increment,
      stepped: d.stepped,
    },
    highlights: [`proc-${d.kind}`],
    callout: {
      title: d.label,
      body: `増分：${d.increment}。`,
      note: d.note,
      kind: d.kind === "brownian" ? "supplement" : "explain",
    },
  }));
}
