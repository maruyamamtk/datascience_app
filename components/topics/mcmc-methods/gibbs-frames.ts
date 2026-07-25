/**
 * ギブスサンプリングステッパー（Level1の中核可視化）のフレーム構築（純関数・Vitest対象）。
 * xを固定してyを更新→yを固定してxを更新、という半ステップを1コマとして、
 * これまでに訪れた点の列（軌跡）も一緒に持たせる。Metropolis-Hastingsと異なり
 * 常に受理されるため、フレームに「棄却」は存在しない。
 */
import type { CalloutContent, VizFrame } from "@/components/viz";
import type { GibbsHalfStep, GibbsPoint } from "@/lib/stats/mcmc-methods";

export type GibbsFramePayload = {
  /** このフレームで実行された半ステップ（初期フレームのみ null）。 */
  step: GibbsHalfStep | null;
  /** このフレームまでの軌跡（初期フレームは開始点1点のみ）。 */
  trail: readonly GibbsPoint[];
};

function calloutFor(step: GibbsHalfStep | null, rho: number): CalloutContent {
  if (!step) {
    return {
      title: "初期状態（(x,y) = (0, 0) からスタート）",
      body: `目標は相関 ρ=${rho.toFixed(2)} の2変量正規分布。ギブスサンプリングは「もう一方を固定した条件付き分布」から交互にサンプリングする——2変量正規分布ならこの条件付き分布が解析的に正規分布として求まる。`,
      note: "▶ 再生でx更新(横移動)→y更新(縦移動)を交互に見ていこう。Metropolis-Hastingsと違い、ギブスは棄却が存在しない(常に受理)。",
      kind: "explain",
    };
  }
  if (step.updated === "x") {
    return {
      title: `スイープ${step.sweep}: xを更新（横移動）`,
      body: `yを${step.before.y.toFixed(3)}に固定し、条件付き分布 X∣Y=y ～ N(ρy, 1−ρ²) から新しい x=${step.after.x.toFixed(3)} を直接サンプリング。`,
      note: "条件付き分布から直接引くので、Metropolis-Hastingsのような受理確率の計算は不要——必ず受理される。",
      kind: "explain",
    };
  }
  return {
    title: `スイープ${step.sweep}: yを更新（縦移動）`,
    body: `xを${step.before.x.toFixed(3)}に固定し、条件付き分布 Y∣X=x ～ N(ρx, 1−ρ²) から新しい y=${step.after.y.toFixed(3)} を直接サンプリング。`,
    note: "x更新→y更新の2手で1スイープ。これを繰り返すと、点の軌跡は相関ρの2変量正規分布の形（楕円状の雲）を描いていく。",
    kind: step.sweep % 3 === 0 ? "supplement" : "explain",
  };
}

/** ギブスの半ステップ列からステッパー用のフレーム列（長さ = steps.length + 1）を構築する。 */
export function buildGibbsFrames(
  start: GibbsPoint,
  steps: readonly GibbsHalfStep[],
  rho: number,
): VizFrame<GibbsFramePayload>[] {
  const frames: VizFrame<GibbsFramePayload>[] = [
    { highlights: [], callout: calloutFor(null, rho), payload: { step: null, trail: [start] } },
  ];
  const trail: GibbsPoint[] = [start];
  for (const step of steps) {
    trail.push(step.after);
    frames.push({
      highlights: step.updated === "x" ? ["condValX", "drawnX"] : ["condValY", "drawnY"],
      callout: calloutFor(step, rho),
      payload: { step, trail: [...trail] },
    });
  }
  return frames;
}
