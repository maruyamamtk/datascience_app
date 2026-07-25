/**
 * EvpiStepper(L0)のフレーム構築(純関数・Vitest対象)。
 * 「①事前情報のみでの意思決定 → ②状態ごとに"完全情報ならこう選ぶ"を1つずつ確定 →
 *  ③その差=EVPI」という手順を、`@/lib/stats/value-of-information`の計算結果から
 * コマ送り(StepPlayer)の1コマずつのcallout付きVizFrameへ変換する。
 */
import type { VizFrame } from "@/components/viz";
import type { PayoffMatrix } from "@/lib/stats/decision-analysis";
import { num, pct } from "./format";

export type EvpiFramePayload = {
  phase: "prior" | "state" | "final";
  /** phase="state"のときの対象状態index(それ以外はnull)。 */
  stateIndex: number | null;
  /** "完全情報なら"の最善行動が明らかになった状態indexの一覧(表の描画に使う)。 */
  revealedStates: number[];
};

/**
 * EVPIの核心的可視化(アルゴリズム図鑑スタイル)を1コマずつ組み立てる。
 * 総フレーム数 = 1(事前情報のみ) + states.length(状態ごとの完全情報選択) + 1(EVPIの差)。
 */
export function buildEvpiFrames(
  matrix: PayoffMatrix,
  probabilities: readonly number[],
  priorBestIndex: number,
  priorBestScore: number,
  perfectInfoBestAction: readonly number[],
  perfectInfoEsvValue: number,
  evpiValue: number,
): VizFrame<EvpiFramePayload>[] {
  const frames: VizFrame<EvpiFramePayload>[] = [
    {
      payload: { phase: "prior", stateIndex: null, revealedStates: [] },
      callout: {
        title: "① 事前情報のみでの意思決定",
        body: `状態(景気)がまだ分からないとき、事前確率だけを使ったESVが最大の行動は「${
          matrix.actions[priorBestIndex]
        }」(${num(priorBestScore)})。`,
        note: "これが情報を何も得ないときの基準点になる。",
        kind: "explain",
      },
    },
  ];

  matrix.states.forEach((stateLabel, s) => {
    const revealedBefore = matrix.states.slice(0, s).map((_, i) => i);
    const bestAction = perfectInfoBestAction[s];
    const bestPayoff = Math.max(...matrix.payoffs.map((row) => row[s]));
    frames.push({
      payload: { phase: "state", stateIndex: s, revealedStates: [...revealedBefore, s] },
      callout: {
        title: `② もし状態「${stateLabel}」だと確実に分かっていたら`,
        body: `最善の行動は「${matrix.actions[bestAction]}」(${num(bestPayoff)})——事前情報のみのとき(${
          matrix.actions[priorBestIndex]
        })と食い違うことがある。`,
        note: `この状態が起きる確率は P(${stateLabel})=${pct(probabilities[s])}。`,
        kind: "explain",
      },
    });
  });

  frames.push({
    payload: {
      phase: "final",
      stateIndex: null,
      revealedStates: matrix.states.map((_, i) => i),
    },
    callout: {
      title: "③ 完全情報の期待利得と、その差=EVPI",
      body: `状態ごとの最善行動を確率で重み付けた平均は ${num(
        perfectInfoEsvValue,
      )}。事前情報のみの最善(${num(priorBestScore)})との差 EVPI=${num(
        perfectInfoEsvValue,
      )}−${num(priorBestScore)}=${num(evpiValue)}。`,
      note: "これが「情報を得るために支払ってよい金額の上限」になる。",
      kind: "explain",
    },
  });

  return frames;
}
