/**
 * Metropolis-Hastingsステッパー（Level0の中核可視化）のフレーム構築（純関数・Vitest対象）。
 * 「現在地→提案→受理/棄却→次の現在地」という1ステップを1コマとして、
 * これまでに«訪れた»状態（accepted/rejectedに関わらずnext）の列も一緒に持たせ、
 * ステップが進むごとにヒストグラムが目標分布へ近づく様子を描画層で描けるようにする。
 */
import type { CalloutContent, VizFrame } from "@/components/viz";
import type { MhStep } from "@/lib/stats/mcmc-methods";

export type MhFramePayload = {
  /** このフレームで実行されたステップ（初期フレームのみ null）。 */
  step: MhStep | null;
  /** このフレームまでに«訪れた»状態(next)の列（初期フレームは空配列）。 */
  visited: readonly number[];
};

function calloutFor(step: MhStep | null): CalloutContent {
  if (!step) {
    return {
      title: "初期状態（θ = 0.50 からスタート）",
      body: "灰色の曲線は目標分布 Beta(6,6) の核（正規化定数抜きの密度）。これは K-1 で共役事前分布から解析的に求めた事後分布と同じもの——今回は「正規化定数を知らないふり」をしてMCMCで近似する。",
      note: "▶ 再生で1ステップずつ「提案 → 受理/棄却 → 次の現在地」を見ていこう。",
      kind: "explain",
    };
  }
  const dir = step.proposed > step.current ? "右" : "左";
  if (step.accepted) {
    return {
      title: `${step.index}ステップ目: 受理（緑）`,
      body: `θ=${step.current.toFixed(3)} から${dir}へ θ'=${step.proposed.toFixed(3)} を提案。受理確率 r=${step.acceptRatio.toFixed(3)}、u=${step.u.toFixed(3)} < r なので受理——次の現在地は θ'=${step.proposed.toFixed(3)}。`,
      note: "目標密度が現在地と同じか高い候補は積極的に受理される（r=1のときは必ず受理）。",
      kind: "explain",
    };
  }
  return {
    title: `${step.index}ステップ目: 棄却（赤）`,
    body: `θ=${step.current.toFixed(3)} から${dir}へ θ'=${step.proposed.toFixed(3)} を提案。受理確率 r=${step.acceptRatio.toFixed(3)}、u=${step.u.toFixed(3)} ≥ r なので棄却——現在地 θ=${step.current.toFixed(3)} に留まる。`,
    note: "密度が低い方向への提案でも r の確率で受理されることがある——低密度領域を完全には無視しない探索になっている。",
    kind: "supplement",
  };
}

/** MHチェーンからステッパー用のフレーム列（長さ = chain.length + 1）を構築する。 */
export function buildMhFrames(x0: number, chain: readonly MhStep[]): VizFrame<MhFramePayload>[] {
  const frames: VizFrame<MhFramePayload>[] = [
    { highlights: ["cur"], callout: calloutFor(null), payload: { step: null, visited: [x0] } },
  ];
  const visited: number[] = [x0];
  for (const step of chain) {
    visited.push(step.next);
    frames.push({
      highlights: step.accepted ? ["cur", "prop", "ratio", "drawnDecision"] : ["cur", "prop", "ratio"],
      callout: calloutFor(step),
      payload: { step, visited: [...visited] },
    });
  }
  return frames;
}
