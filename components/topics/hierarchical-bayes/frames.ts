/**
 * ShrinkageStepper（L0の中核可視化）のフレーム構築(純関数・Vitest対象)。
 * サンプルサイズが小さい順に並んだグループを1つずつ見せ、各グループの
 * 「プールなし推定 vs 階層ベイズ推定(shrinkage)」がどう違うかをコマ送りで体感させる。
 */
import type { CalloutContent, VizFrame } from "@/components/viz";
import type { GroupEstimate } from "@/lib/stats/hierarchical-bayes";
import { num, pct } from "./format";

function calloutFor(e: GroupEstimate, isSmallest: boolean, isLargest: boolean): CalloutContent {
  const pulled = Math.abs(e.partialPooling - e.noPooling);
  const title = `${e.group.label}（生徒数 n=${e.group.n}）`;
  const body = `自グループの平均は${num(e.noPooling)}点。階層ベイズの推定値は${num(
    e.partialPooling,
  )}点——全体平均${num(e.completePooling)}点の方向に${num(pulled)}点だけ引き寄せられた（縮小の重み${pct(
    e.weight,
  )}）。`;
  let note: string;
  if (isSmallest) {
    note = `n=${e.group.n}は6クラス中もっとも少ない。自グループのデータだけでは信頼性が低いため、全体平均への引力(重み${pct(
      e.weight,
    )})がもっとも強い。`;
  } else if (isLargest) {
    note = `n=${e.group.n}は6クラス中もっとも多い。自グループのデータだけで十分信頼できるため、全体平均への引力(重み${pct(
      e.weight,
    )})はもっとも弱く、推定値はほぼ自グループの平均のまま。`;
  } else {
    note = "サンプルサイズが増えるほど、階層ベイズの推定値は自グループの平均に近づいていく——この後のグループで確かめよう。";
  }
  return { title, body, note, kind: isSmallest || isLargest ? "explain" : "supplement" };
}

/** ShrinkageStepperのフレーム列(長さ = estimates.length)を構築する。 */
export function buildShrinkageFrames(estimates: readonly GroupEstimate[]): VizFrame<GroupEstimate>[] {
  return estimates.map((e, i) => ({
    // ShrinkageLabのMathFormulaが実際に持つ項id(n/sigma2/tau2/ybarj/mu/Bj/oneMinusBj/thetaHat)に合わせる。
    highlights: ["n", "ybarj", "mu", "Bj", "oneMinusBj", "thetaHat"],
    callout: calloutFor(e, i === 0, i === estimates.length - 1),
    payload: e,
  }));
}
