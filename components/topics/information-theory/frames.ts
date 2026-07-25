/**
 * SelfInformationStepper(L1)のフレーム構築(純関数・Vitest対象)。
 * 「確率pの事象が起きたと知ったときの自己情報量 I=-log2 p」を、pが小さくなる
 * (=珍しい事象になる)につれてI が増えていく様子を具体例で1コマずつ見せる。
 */
import type { VizFrame } from "@/components/viz";
import { selfInformation } from "@/lib/stats/information-theory";

export type SelfInfoFramePayload = {
  /** この事象の確率p。 */
  p: number;
  /** 具体例の短い名前("公正なコイン"など)。 */
  label: string;
};

export type SelfInfoExample = { p: number; label: string; body: string };

/**
 * 自己情報量の具体例(確率が小さくなる順)。p=1(確実)→p=0.01(珍しい事象)まで、
 * -log2 p が単調に増えていくことを1コマずつ確認できるよう並べる。
 */
export const SELF_INFO_EXAMPLES: readonly SelfInfoExample[] = [
  {
    p: 1,
    label: "必ず起きる事象",
    body: "「明日、太陽が昇る」のように確率p=1で必ず起きる事象——起きたと知っても何も驚かない。自己情報量は0 bit。",
  },
  {
    p: 0.5,
    label: "公正なコインの表",
    body: "公正なコインで「表が出た」と知ったときの情報量。p=0.5の自己情報量はちょうど1 bit——ビットという単位はこの«五分五分の1回分»を基準に定義される。",
  },
  {
    p: 0.25,
    label: "4択クイズを当てる",
    body: "4択(等確率)のクイズで「正解した」と知ったときの情報量。p=1/4=0.25で2 bit——公正なコイン2回分の情報量に等しい(独立な2択×2択=4択)。",
  },
  {
    p: 0.125,
    label: "8面サイコロで特定の目",
    body: "8面体サイコロで「指定した目が出た」と知ったときの情報量。p=1/8=0.125で3 bit——コイン3回分。等確率N通りならI=log2 Nと一致する。",
  },
  {
    p: 0.01,
    label: "珍しい事象(100人に1人)",
    body: "100人に1人しか起きない珍しい事象が「実際に起きた」と知ったときの情報量。p=0.01で約6.64 bit——確率が小さいほど「驚き」が急激に大きくなる。",
  },
] as const;

/**
 * 自己情報量の具体例を、コマ送り(StepPlayer)の1コマずつのVizFrameへ変換する。
 * 総フレーム数は SELF_INFO_EXAMPLES.length。
 */
export function buildSelfInformationFrames(): VizFrame<SelfInfoFramePayload>[] {
  return SELF_INFO_EXAMPLES.map((ex) => {
    const info = selfInformation(ex.p);
    return {
      highlights: ["p", "result"],
      payload: { p: ex.p, label: ex.label },
      callout: {
        title: `${ex.label}(p=${ex.p})`,
        body: ex.body,
        note: `I(x)=-log2(${ex.p})=${info.toFixed(2)} bit`,
        kind: "explain",
      },
    };
  });
}
