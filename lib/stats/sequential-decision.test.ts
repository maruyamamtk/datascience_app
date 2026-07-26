import { describe, expect, it } from "vitest";
import { PRIMARY_PAYOFF_MATRIX } from "./decision-analysis";
import {
  backwardInduction,
  backwardInductionCells,
  chronological,
  economyTransition,
  expectedTotalValue,
  type SequentialDecisionProblem,
} from "./sequential-decision";

// 出典第2章の利得行列(工場稼働台数×景気、単位:万円)をそのまま利用。
// actions=["0台稼働","1台稼働","2台稼働"], states=["好況","不況"]
// payoffs=[[-100,-100],[300,300],[700,-300]]

describe("economyTransition", () => {
  it("対角優位な2x2の行確率的な行列を作る", () => {
    const t = economyTransition(0.7);
    expect(t[0][0]).toBeCloseTo(0.7, 10);
    expect(t[0][1]).toBeCloseTo(0.3, 10);
    expect(t[1][0]).toBeCloseTo(0.3, 10);
    expect(t[1][1]).toBeCloseTo(0.7, 10);
    for (const row of t) {
      expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    }
  });

  it("0〜1の範囲外はクランプする", () => {
    expect(economyTransition(1.5)).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(economyTransition(-0.5)).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });
});

describe("backwardInduction", () => {
  it("period=1では各状態ごとの単純な最大利得(近視眼的な最適化)になる", () => {
    const problem: SequentialDecisionProblem = {
      matrix: PRIMARY_PAYOFF_MATRIX,
      transition: economyTransition(0.7),
      periods: 1,
      discount: 0.9,
    };
    const results = backwardInduction(problem);
    expect(results).toHaveLength(1);
    const [t1] = results;
    expect(t1.period).toBe(1);
    // 好況: max(-100,300,700)=700(2台稼働) / 不況: max(-100,300,-300)=300(1台稼働)
    expect(t1.valueByState).toEqual([700, 300]);
    expect(t1.actionIndexByState).toEqual([2, 1]);
  });

  it("period=2・割引率1・状態が変化しない遷移行列では、各期の最良利得の単純合計になる", () => {
    const problem: SequentialDecisionProblem = {
      matrix: PRIMARY_PAYOFF_MATRIX,
      transition: economyTransition(1), // 状態は変化しない(吸収的)
      periods: 2,
      discount: 1,
    };
    const results = backwardInduction(problem);
    expect(results).toHaveLength(2);

    const t2 = results.find((r) => r.period === 2)!;
    expect(t2.valueByState).toEqual([700, 300]);

    const t1 = results.find((r) => r.period === 1)!;
    // 好況: -100+700=600, 300+700=1000, 700+700=1400 → 1400(2台稼働)
    // 不況: -100+300=200, 300+300=600, -300+300=0 → 600(1台稼働)
    expect(t1.valueByState).toEqual([1400, 600]);
    expect(t1.actionIndexByState).toEqual([2, 1]);
  });

  it("period=2・割引率0.9・対角優位な遷移行列で手計算した値と一致する(Bellman方程式)", () => {
    const problem: SequentialDecisionProblem = {
      matrix: PRIMARY_PAYOFF_MATRIX,
      transition: economyTransition(0.7),
      periods: 2,
      discount: 0.9,
    };
    const results = backwardInduction(problem);

    const t2 = results.find((r) => r.period === 2)!;
    expect(t2.valueByState).toEqual([700, 300]);
    expect(t2.actionIndexByState).toEqual([2, 1]);

    const t1 = results.find((r) => r.period === 1)!;
    // 好況: future=0.7*700+0.3*300=580, Q=[-100+0.9*580, 300+0.9*580, 700+0.9*580]
    //      =[422, 822, 1222] → max=1222(2台稼働)
    expect(t1.qByState[0][0]).toBeCloseTo(422, 10);
    expect(t1.qByState[0][1]).toBeCloseTo(822, 10);
    expect(t1.qByState[0][2]).toBeCloseTo(1222, 10);
    // 不況: future=0.3*700+0.7*300=420, Q=[-100+0.9*420, 300+0.9*420, -300+0.9*420]
    //      =[278, 678, 78] → max=678(1台稼働)
    expect(t1.qByState[1][0]).toBeCloseTo(278, 10);
    expect(t1.qByState[1][1]).toBeCloseTo(678, 10);
    expect(t1.qByState[1][2]).toBeCloseTo(78, 10);

    expect(t1.valueByState[0]).toBeCloseTo(1222, 10);
    expect(t1.valueByState[1]).toBeCloseTo(678, 10);
    expect(t1.actionIndexByState).toEqual([2, 1]);
  });

  it("計算順はt=T→1(バックワード)", () => {
    const problem: SequentialDecisionProblem = {
      matrix: PRIMARY_PAYOFF_MATRIX,
      transition: economyTransition(0.7),
      periods: 3,
      discount: 0.9,
    };
    const results = backwardInduction(problem);
    expect(results.map((r) => r.period)).toEqual([3, 2, 1]);
  });

  it("transitionの次元が合わないとエラー", () => {
    const problem: SequentialDecisionProblem = {
      matrix: PRIMARY_PAYOFF_MATRIX,
      transition: [[1]],
      periods: 2,
      discount: 0.9,
    };
    expect(() => backwardInduction(problem)).toThrow();
  });

  it("periods<1はエラー", () => {
    const problem: SequentialDecisionProblem = {
      matrix: PRIMARY_PAYOFF_MATRIX,
      transition: economyTransition(0.7),
      periods: 0,
      discount: 0.9,
    };
    expect(() => backwardInduction(problem)).toThrow();
  });
});

describe("chronological", () => {
  it("t=1→Tの時系列順に並べ替える", () => {
    const problem: SequentialDecisionProblem = {
      matrix: PRIMARY_PAYOFF_MATRIX,
      transition: economyTransition(0.7),
      periods: 3,
      discount: 0.9,
    };
    const results = backwardInduction(problem);
    const ordered = chronological(results);
    expect(ordered.map((r) => r.period)).toEqual([1, 2, 3]);
    // 元の配列を破壊しない
    expect(results.map((r) => r.period)).toEqual([3, 2, 1]);
  });
});

describe("backwardInductionCells", () => {
  it("period*states 個のセルをpost-order(期T→1、各期は状態の順)で列挙する", () => {
    const problem: SequentialDecisionProblem = {
      matrix: PRIMARY_PAYOFF_MATRIX,
      transition: economyTransition(0.7),
      periods: 2,
      discount: 0.9,
    };
    const cells = backwardInductionCells(problem);
    expect(cells).toHaveLength(2 * PRIMARY_PAYOFF_MATRIX.states.length);
    expect(cells.map((c) => [c.period, c.stateIndex])).toEqual([
      [2, 0],
      [2, 1],
      [1, 0],
      [1, 1],
    ]);
    // 最後のセル(t=1,好況)は手計算のV_1(好況)=1222と一致
    expect(cells[2].value).toBeCloseTo(1222, 10);
    expect(cells[2].actionIndex).toBe(2);
  });
});

describe("expectedTotalValue", () => {
  it("t=1の価値関数を初期分布で重み付けした期待値を返す", () => {
    const problem: SequentialDecisionProblem = {
      matrix: PRIMARY_PAYOFF_MATRIX,
      transition: economyTransition(0.7),
      periods: 2,
      discount: 0.9,
    };
    const results = backwardInduction(problem);
    // V_1=[1222,678] (前テストで手計算済み)
    expect(expectedTotalValue(results, [0.5, 0.5])).toBeCloseTo((1222 + 678) / 2, 10);
    expect(expectedTotalValue(results, [1, 0])).toBeCloseTo(1222, 10);
    expect(expectedTotalValue(results, [0, 1])).toBeCloseTo(678, 10);
  });

  it("t=1が存在しない(periods=0相当)結果を渡すとエラー", () => {
    expect(() => expectedTotalValue([], [0.5, 0.5])).toThrow();
  });
});
