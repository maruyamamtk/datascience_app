/**
 * 逐次決定(P-6)の計算層(純関数・副作用なし・Vitest対象)。
 *
 * 扱う道具(SPEC §3 P-6「動的計画法、後ろ向き帰納法、マルコフ決定過程」出典:
 * 『意思決定分析と予測の活用』第3部「決定分析の活用」第5章「逐次決定問題における予測の活用」):
 *
 * - 逐次決定問題: 意思決定を複数期間にわたって繰り返す問題。将来の意思決定が現在の意思決定に
 *   影響し、時点ごとに状態が変わる。<Term id="policy">政策(方策)</Term>=各状態でとるべき行動を定めたルール全体。
 * - マルコフ決定過程(MDP): 逐次決定問題を表現する標準的な枠組み。出典の表では
 *   「時点・状態・選択肢・政策・推移確率・報酬」の6要素として整理されている
 *   (content/terms/markov-decision-process.mdx の (S,A,P,R,γ) と対応)。
 * - 動的計画法と後ろ向き帰納法: 「①最終時点の価値関数を求める→②一時点前に戻り、
 *   現在の最適行動=現在の報酬+将来の価値の最大値→③これを繰り返して最初の時点まで遡る」
 *   (出典の3ステップをそのまま実装する)。
 *
 * 具体例(CLAUDE.md「まず小さな具体例で原理を見せる」/「前提トピックを取りこぼさない」):
 * decision-analysis(P-1)の工場稼働の利得行列(行動=稼働台数0/1/2台、状態=好況/不況)を
 * 「毎期の即時報酬」としてそのまま再利用し(重複実装を避けるため import する)、
 * 景気(状態)はmarkov-chains(L-1)と同じ行確率的な遷移行列で期をまたいで確率的に遷移する。
 * decision-analysisにおける「Θ=状態空間=コントロールできない自然の状態」という定義を
 * そのまま踏襲するため、行動は状態遷移確率に影響しない(P(s'|s,a)=P(s'|s))
 * ——一般のMDPの特殊ケースだが、決定分析の決定木(1期版の後ろ向き帰納法)を
 * 複数期間へ素直に拡張する例として一貫性がある。
 */

import { PRIMARY_PAYOFF_MATRIX, type PayoffMatrix } from "./decision-analysis";

// ────────────────────────────────────────────────────────────
// 問題設定: 有限期間MDP = 利得行列(即時報酬) + 遷移行列(状態) + 期間数T + 割引率γ
// ────────────────────────────────────────────────────────────

/** 遷移行列(行確率的: transition[s][s']=P(次=s'|今=s))。markov-chainsと同じ形。 */
export type TransitionMatrix = readonly (readonly number[])[];

/** 有限期間の逐次決定問題(MDP)。 */
export type SequentialDecisionProblem = {
  /** 即時報酬 r(a,s)=matrix.payoffs[a][s](decision-analysisの利得行列を再利用)。 */
  matrix: PayoffMatrix;
  /** 状態遷移確率 P(s'|s)(行動に依存しない、自然の状態の定義に基づく)。 */
  transition: TransitionMatrix;
  /** 期間数T(意思決定が行われる時点の数、t=1,...,T)。 */
  periods: number;
  /** 割引率γ(0〜1)。将来の価値を「今の価値」に換算する係数。 */
  discount: number;
};

/**
 * 景気(好況/不況)の遷移行列。「好況は好況を、不況は不況を維持しやすい」という
 * 対角優位の仮定を1つのパラメータ(persistence=維持しやすさ)で表す
 * ——markov-chainsのrainStick(雨の続きやすさ)と同じ発想の単純化。
 */
export function economyTransition(persistence: number): TransitionMatrix {
  const p = Math.min(1, Math.max(0, persistence));
  return [
    [p, 1 - p],
    [1 - p, p],
  ];
}

export const DEFAULT_PERSISTENCE = 0.7;
export const DEFAULT_PERIODS = 3;
export const DEFAULT_DISCOUNT = 0.9;
export const MIN_PERIODS = 2;
export const MAX_PERIODS = 5;

export const DEFAULT_PROBLEM: SequentialDecisionProblem = {
  matrix: PRIMARY_PAYOFF_MATRIX,
  transition: economyTransition(DEFAULT_PERSISTENCE),
  periods: DEFAULT_PERIODS,
  discount: DEFAULT_DISCOUNT,
};

function argmax(values: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}

// ────────────────────────────────────────────────────────────
// 後ろ向き帰納法(バックワードインダクション) = 動的計画法によるBellman方程式の求解
// ────────────────────────────────────────────────────────────

/** 期tでの状態sごとの計算結果(Q値・最適価値・最適行動)。 */
export type PeriodResult = {
  /** 時点t(1..T、Tが最終期)。 */
  period: number;
  /** qByState[s][a]=Q_t(s,a)=r(a,s)+γ・Σ_s' P(s'|s)V_{t+1}(s')。 */
  qByState: number[][];
  /** V_t(s)=max_a Q_t(s,a)。 */
  valueByState: number[];
  /** π_t(s)=argmax_a Q_t(s,a)(最適方策)。 */
  actionIndexByState: number[];
};

/**
 * 後ろ向き帰納法で全期間のV_t(s)・π_t(s)を計算する(動的計画法)。
 * 返り値は計算順(t=T→1、最終期から先に確定する)。
 * 有限期間なのでV_{T+1}(s)=0(期間終了後の残存価値なし)から出発する
 * (出典の3ステップ「①最終時点→②一時点前へ→③最初の時点まで繰り返す」そのもの)。
 */
export function backwardInduction(problem: SequentialDecisionProblem): PeriodResult[] {
  const { matrix, transition, periods, discount } = problem;
  const nStates = matrix.states.length;
  const nActions = matrix.actions.length;
  if (transition.length !== nStates || transition.some((row) => row.length !== nStates)) {
    throw new Error("transition は states と同じ次元の正方行列である必要がある");
  }
  if (periods < 1) throw new Error("periods は1以上である必要がある");

  const results: PeriodResult[] = [];
  let nextValue = new Array(nStates).fill(0); // V_{T+1}(s) = 0

  for (let t = periods; t >= 1; t--) {
    const qByState: number[][] = [];
    const valueByState: number[] = [];
    const actionIndexByState: number[] = [];

    for (let s = 0; s < nStates; s++) {
      const qRow: number[] = [];
      for (let a = 0; a < nActions; a++) {
        const immediate = matrix.payoffs[a][s];
        const future = transition[s].reduce((sum, p, sPrime) => sum + p * nextValue[sPrime], 0);
        qRow.push(immediate + discount * future);
      }
      const bestA = argmax(qRow);
      qByState.push(qRow);
      valueByState.push(qRow[bestA]);
      actionIndexByState.push(bestA);
    }

    results.push({ period: t, qByState, valueByState, actionIndexByState });
    nextValue = valueByState;
  }

  return results;
}

/** backwardInductionの結果を時系列順(t=1→T)に並べ替える(政策表・レポート表示用)。 */
export function chronological(results: readonly PeriodResult[]): PeriodResult[] {
  return [...results].sort((a, b) => a.period - b.period);
}

// ────────────────────────────────────────────────────────────
// ステッパー用: 1コマ=1つの(期,状態)セルの計算(post-order、最終期から)
// ────────────────────────────────────────────────────────────

export type BackwardInductionCell = {
  period: number;
  stateIndex: number;
  qValues: number[];
  value: number;
  actionIndex: number;
};

/**
 * 後ろ向き帰納法の1コマずつの計算ステップ(期T→1、各期は状態の順に1セルずつ)。
 * decision-analysisのbackwardInductionSteps(決定木)と同じ「post-orderで1つずつ確定」設計を
 * 期×状態の格子に適用したもの。
 */
export function backwardInductionCells(
  problem: SequentialDecisionProblem,
): BackwardInductionCell[] {
  const results = backwardInduction(problem);
  const cells: BackwardInductionCell[] = [];
  for (const r of results) {
    for (let s = 0; s < r.valueByState.length; s++) {
      cells.push({
        period: r.period,
        stateIndex: s,
        qValues: r.qByState[s],
        value: r.valueByState[s],
        actionIndex: r.actionIndexByState[s],
      });
    }
  }
  return cells;
}

/**
 * 初期時点(t=1)における状態分布のもとでの期待総価値(方策の価値)。
 * V_1の期待値=Σ_s π0(s)・V_1(s)——「今の景気の見立てがp:1-pなら、今後T期でいくら期待できるか」を表す。
 */
export function expectedTotalValue(
  results: readonly PeriodResult[],
  initialDistribution: readonly number[],
): number {
  const first = results.find((r) => r.period === 1);
  if (!first) throw new Error("t=1の結果が見つからない");
  return first.valueByState.reduce((sum, v, s) => sum + v * (initialDistribution[s] ?? 0), 0);
}
