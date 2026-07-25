/**
 * StPetersburgStepper(L0)・RiskAttitudeStepper(L1)のフレーム構築(純関数・Vitest対象)。
 * `@/lib/stats/utility-theory`の計算結果から、コマ送り(StepPlayer)の1コマずつの
 * callout付きVizFrameへ変換する。
 */
import type { VizFrame } from "@/components/viz";
import {
  certaintyEquivalentCara,
  expectedValue,
  riskPremium,
  stPetersburgPartialExpectedUtility,
  stPetersburgPartialExpectedValue,
  stPetersburgPayoff,
  stPetersburgProbability,
  type RiskAttitude,
} from "@/lib/stats/utility-theory";
import { num, pct, riskAttitudeLabel } from "./format";

// ────────────────────────────────────────────────────────────
// StPetersburgStepper(L0): サンクトペテルブルクのパラドックス
// ────────────────────────────────────────────────────────────

export type StPetersburgFramePayload = {
  phase: "term" | "summary";
  /** phase="term"のときの対象n(コインが何回目で初めて表か)。summaryではnull。 */
  n: number | null;
  partialExpectedValue: number;
  partialExpectedUtility: number;
};

/**
 * 「①n回目で初めて表→②payoff=2^n・確率=(1/2)^nの項を加える→③部分和(期待金額は発散/
 * 期待log効用は2に収束)」を1コマずつ組み立てる。総フレーム数=maxN+1(最後は解決のまとめ)。
 */
export function buildStPetersburgFrames(maxN = 10): VizFrame<StPetersburgFramePayload>[] {
  const frames: VizFrame<StPetersburgFramePayload>[] = [];

  for (let n = 1; n <= maxN; n++) {
    const payoff = stPetersburgPayoff(n);
    const probability = stPetersburgProbability(n);
    const partialExpectedValue = stPetersburgPartialExpectedValue(n);
    const partialExpectedUtility = stPetersburgPartialExpectedUtility(n);
    frames.push({
      payload: { phase: "term", n, partialExpectedValue, partialExpectedUtility },
      callout: {
        title: `n=${n}: ${n}回目で初めて表が出るケース`,
        body: `払戻額 2^${n}=${num(payoff)}円、確率 (1/2)^${n}=${pct(probability, probability < 0.01 ? 2 : 0)}。この項の期待金額への寄与は (1/2^${n})×2^${n}=1(ちょうど1)。`,
        note: `期待金額の部分和(n=1〜${n})=${num(partialExpectedValue)}円。期待効用(u=log₂)の部分和=${num(partialExpectedUtility, 3)}。`,
        kind: "explain",
      },
    });
  }

  frames.push({
    payload: {
      phase: "summary",
      n: null,
      partialExpectedValue: stPetersburgPartialExpectedValue(maxN),
      partialExpectedUtility: stPetersburgPartialExpectedUtility(maxN),
    },
    callout: {
      title: "パラドックスの解決: 効用関数を導入すると有限になる",
      body: `期待金額は毎回ちょうど1ずつ増え続け、Nを大きくすると際限なく発散する(∞)。一方 u(x)=log₂ x を使った期待効用は n/2^n の和で、N=${maxN}時点で${num(stPetersburgPartialExpectedUtility(maxN), 3)}——理論上は2に収束する。`,
      note: "「金額そのもの」ではなく「効用」の期待値を最大化する、という発想がここから生まれる。",
      kind: "supplement",
    },
  });

  return frames;
}

// ────────────────────────────────────────────────────────────
// RiskAttitudeStepper(L1): リスク態度3分類の比較
// ────────────────────────────────────────────────────────────

/** 3分類を代表する固定のCARA α値(リスク回避的→中立→受容的の順)。 */
export const RISK_ATTITUDE_ALPHAS: readonly { attitude: RiskAttitude; alpha: number }[] = [
  { attitude: "risk-averse", alpha: 0.01 },
  { attitude: "risk-neutral", alpha: 0 },
  { attitude: "risk-loving", alpha: -0.01 },
];

export type RiskAttitudeFramePayload = {
  phase: "attitude" | "summary";
  /** phase="attitude"のときのRISK_ATTITUDE_ALPHASのindex。summaryではnull。 */
  attitudeIndex: number | null;
  alpha: number;
  attitude: RiskAttitude | null;
  expectedValue: number;
  certaintyEquivalent: number;
  riskPremium: number;
};

/**
 * 同じくじ(outcomes, probabilities)に対して、リスク回避的・リスク中立・リスク受容的の
 * 3つの効用関数(CARAのα違い)を1コマずつ切り替え、CEが期待値の左右どちらにズレるかを見せる。
 */
export function buildRiskAttitudeFrames(
  outcomes: readonly number[],
  probabilities: readonly number[],
): VizFrame<RiskAttitudeFramePayload>[] {
  const ex = expectedValue(outcomes, probabilities);
  const frames: VizFrame<RiskAttitudeFramePayload>[] = RISK_ATTITUDE_ALPHAS.map(
    ({ attitude, alpha }, i) => {
      const ce = certaintyEquivalentCara(outcomes, probabilities, alpha);
      const rp = riskPremium(outcomes, probabilities, alpha);
      const relation = rp > 1e-6 ? "CE < E[X]" : rp < -1e-6 ? "CE > E[X]" : "CE = E[X]";
      return {
        payload: {
          phase: "attitude",
          attitudeIndex: i,
          alpha,
          attitude,
          expectedValue: ex,
          certaintyEquivalent: ce,
          riskPremium: rp,
        },
        callout: {
          title: `${riskAttitudeLabel(attitude)}(α=${num(alpha, 3)})`,
          body: `確実同値額 CE=${num(ce)}、期待値 E[X]=${num(ex)}(${relation})。リスクプレミアム RP=E[X]−CE=${num(rp)}。`,
          note:
            attitude === "risk-averse"
              ? "効用関数が凹(上に凸)なので、くじより確実な金額の方を高く評価する——CEが期待値を下回る。"
              : attitude === "risk-neutral"
                ? "効用関数が直線なので、期待金額と期待効用による意思決定は常に一致する。"
                : "効用関数が凸(下に凸)なので、確実な金額よりくじ自体を高く評価する——CEが期待値を上回る。",
          kind: "explain",
        },
      };
    },
  );

  frames.push({
    payload: {
      phase: "summary",
      attitudeIndex: null,
      alpha: 0,
      attitude: null,
      expectedValue: ex,
      certaintyEquivalent: ex,
      riskPremium: 0,
    },
    callout: {
      title: "3分類のまとめ",
      body: "同じくじでも、効用関数の凹凸(=リスク態度)によってCEとリスクプレミアムの符号が変わる。",
      note: "リスク回避的: RP>0 / リスク中立: RP=0 / リスク受容的: RP<0。",
      kind: "supplement",
    },
  });

  return frames;
}
