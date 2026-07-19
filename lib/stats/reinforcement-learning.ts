/**
 * 強化学習（I-5）の計算層（純関数・副作用なし・Vitest 対象）。
 *
 * 題材: 5×5 グリッドワールド上のエージェントが、ε-greedy 方策で行動しながら
 * Q学習（Q-learning）で行動価値関数 Q(s,a) を更新していく過程。
 * - «環境» はマルコフ決定過程（MDP）: 状態 s（マス目）・行動 a（上下左右）・報酬 r・
 *   遷移が s と a だけで決まる（前提トピック markov-chains の «マルコフ性» を状態遷移が
 *   確率的でなく決定的な特殊ケースとして引き継ぐ）。
 * - «エージェント» は環境の遷移確率を知らないまま、試行錯誤（サンプルされた r, s'）だけから
 *   最適方策を学ぶ（モデルフリー学習）——これが「動的計画法（価値反復）」との違い。
 * - Q学習の更新式: Q(s,a) ← Q(s,a) + α[r + γ·max_a' Q(s',a') − Q(s,a)]。
 *
 * 乱数は決定的な整数演算 LCG（tasks/lessons.md の教訓・naive-bayes-knn.ts と同じ方式）。
 * `trainEpisodes` は controls（episodesTrained 等）だけから毎回ゼロから再計算する **純関数**
 * にすることで、lib/store/topicStore.ts の「derived = derive(controls) の単一経路」という
 * single source of truth の設計にそのまま乗せる（増分的な外部状態を持たない）。
 */

// ────────────────────────────────────────────────────────────
// 決定的乱数（整数演算だけの LCG。SSR とブラウザで結果がぶれない）
// ────────────────────────────────────────────────────────────

/** 決定的な線形合同法（整数演算だけなので SSR とブラウザで結果がぶれない）。 */
export function makeLcg(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const clampInt = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.floor(v)));

// ────────────────────────────────────────────────────────────
// グリッドワールド（環境）
// ────────────────────────────────────────────────────────────

export const GRID_SIZE = 5;
export const N_STATES = GRID_SIZE * GRID_SIZE;

export type Cell = { row: number; col: number };

/** スタート（左下）・ゴール（右上, +報酬）・落とし穴（中央, −報酬・最短の対角線上）。 */
export const START_CELL: Cell = { row: 4, col: 0 };
export const GOAL_CELL: Cell = { row: 0, col: 4 };
export const TRAP_CELL: Cell = { row: 2, col: 2 };

/** 通常の1歩ごとの報酬（負で「遠回りしない」動機づけ）。ゴール・落とし穴は上書きされる。 */
export const STEP_REWARD = -1;
export const GOAL_REWARD = 10;
export const TRAP_REWARD = -10;

export const ACTIONS = ["up", "down", "left", "right"] as const;
export type Action = (typeof ACTIONS)[number];
export const N_ACTIONS = ACTIONS.length;

/** 表示用の矢印グリフ（up=行が減る方向=グリッド上部）。 */
export const ACTION_ARROW: Record<Action, string> = { up: "↑", down: "↓", left: "←", right: "→" };

const ACTION_DELTA: Record<Action, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

const sameCell = (a: Cell, b: Cell): boolean => a.row === b.row && a.col === b.col;

/** マス (row,col) を状態インデックス 0..N_STATES-1 に変換する。 */
export function stateIndex(cell: Cell): number {
  return cell.row * GRID_SIZE + cell.col;
}

/** 状態インデックスをマス (row,col) に戻す。 */
export function cellFromIndex(index: number): Cell {
  return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
}

/** ゴール・落とし穴のどちらかに到達した終端状態か。 */
export function isTerminalCell(cell: Cell): boolean {
  return sameCell(cell, GOAL_CELL) || sameCell(cell, TRAP_CELL);
}

/**
 * 環境の状態遷移（決定的）。壁（グリッド外）に向かう行動はその場に留まる。
 * ゴール・落とし穴に着地した場合はエピソード終了（done=true）、報酬もそこで確定する。
 */
export function stepEnv(cell: Cell, action: Action): { next: Cell; reward: number; done: boolean } {
  const { dr, dc } = ACTION_DELTA[action];
  const next: Cell = {
    row: clampInt(cell.row + dr, 0, GRID_SIZE - 1),
    col: clampInt(cell.col + dc, 0, GRID_SIZE - 1),
  };
  if (sameCell(next, GOAL_CELL)) return { next, reward: GOAL_REWARD, done: true };
  if (sameCell(next, TRAP_CELL)) return { next, reward: TRAP_REWARD, done: true };
  return { next, reward: STEP_REWARD, done: false };
}

// ────────────────────────────────────────────────────────────
// Qテーブル・ε-greedy 行動選択
// ────────────────────────────────────────────────────────────

/** N_STATES × N_ACTIONS の行動価値テーブル。 */
export type QTable = number[][];

/** 全状態・全行動を0で初期化したQテーブル。 */
export function createQTable(): QTable {
  return Array.from({ length: N_STATES }, () => Array(N_ACTIONS).fill(0) as number[]);
}

/** Qテーブルの複製（イミュータブルに扱うため）。 */
export function cloneQTable(q: readonly (readonly number[])[]): QTable {
  return q.map((row) => [...row]);
}

/** ある状態の行動価値の中で最大の行動（同値は添字が小さい方を採用）。 */
export function argmaxAction(qRow: readonly number[]): number {
  let best = 0;
  for (let a = 1; a < qRow.length; a++) if (qRow[a] > qRow[best]) best = a;
  return best;
}

export type ActionChoice = { action: number; explored: boolean };

/**
 * ε-greedy 行動選択: 確率 ε でランダムな行動（探索）、確率 1−ε で現在最良の行動（活用）。
 * 探索・活用のどちらを選んだかも返す（可視化で色分けするため）。
 */
export function epsilonGreedyAction(qRow: readonly number[], epsilon: number, rng: () => number): ActionChoice {
  if (rng() < epsilon) {
    const action = Math.min(qRow.length - 1, Math.floor(rng() * qRow.length));
    return { action, explored: true };
  }
  return { action: argmaxAction(qRow), explored: false };
}

// ────────────────────────────────────────────────────────────
// Q学習の更新式（ベルマン方程式に基づく TD 更新）
// ────────────────────────────────────────────────────────────

export type QUpdateResult = {
  /** 更新前の Q(s,a)。 */
  qBefore: number;
  reward: number;
  alpha: number;
  gamma: number;
  /** max_a' Q(s',a')（終端状態なら 0 — 「その先の価値」が存在しないため）。 */
  maxNextQ: number;
  /** TD目標: r + γ·max_a' Q(s',a')。 */
  tdTarget: number;
  /** TD誤差: TD目標 − Q(s,a)（「予想とのズレ」）。 */
  tdError: number;
  /** 更新後の Q(s,a)。 */
  qAfter: number;
};

/**
 * Q学習の更新式（1ステップ分）: Q(s,a) ← Q(s,a) + α[r + γ·max_a' Q(s',a') − Q(s,a)]。
 * 各項を分解して返すことで、可視化層が数式の該当項をそのままハイライトできる。
 */
export function bellmanUpdate(
  qTable: QTable,
  state: number,
  action: number,
  reward: number,
  nextState: number,
  alpha: number,
  gamma: number,
  done: boolean,
): QUpdateResult {
  const qBefore = qTable[state][action];
  const maxNextQ = done ? 0 : Math.max(...qTable[nextState]);
  const tdTarget = reward + gamma * maxNextQ;
  const tdError = tdTarget - qBefore;
  const qAfter = qBefore + alpha * tdError;
  return { qBefore, reward, alpha, gamma, maxNextQ, tdTarget, tdError, qAfter };
}

// ────────────────────────────────────────────────────────────
// エピソードの実行・学習ループ
// ────────────────────────────────────────────────────────────

export type EpisodeStep = {
  state: number;
  action: number;
  nextState: number;
  reward: number;
  done: boolean;
  /** ε-greedy で探索（ランダム）だったか活用（最良）だったか。 */
  explored: boolean;
  update: QUpdateResult;
};

export type EpisodeResult = {
  qTable: QTable;
  steps: EpisodeStep[];
  totalReward: number;
};

/**
 * 1エピソード（スタートから終端まで、または maxSteps 到達まで）を実行し、
 * 各ステップで Q学習の更新を行う。qTable は複製してから更新するため呼び出し側の元データは変えない。
 */
export function runEpisode(
  qTable: QTable,
  epsilon: number,
  alpha: number,
  gamma: number,
  rng: () => number,
  maxSteps: number,
): EpisodeResult {
  const q = cloneQTable(qTable);
  let cell: Cell = { ...START_CELL };
  const steps: EpisodeStep[] = [];
  let totalReward = 0;

  for (let t = 0; t < maxSteps; t++) {
    const state = stateIndex(cell);
    const { action, explored } = epsilonGreedyAction(q[state], epsilon, rng);
    const { next, reward, done } = stepEnv(cell, ACTIONS[action]);
    const nextState = stateIndex(next);
    const update = bellmanUpdate(q, state, action, reward, nextState, alpha, gamma, done);
    q[state][action] = update.qAfter;
    totalReward += reward;
    steps.push({ state, action, nextState, reward, done, explored, update });
    cell = next;
    if (done) break;
  }

  return { qTable: q, steps, totalReward };
}

export type TrainingResult = {
  qTable: QTable;
  /** エピソードごとの歩数（学習曲線に使う）。 */
  episodeLengths: number[];
  /** エピソードごとの合計報酬。 */
  episodeRewards: number[];
  /** 最後に実行したエピソードのステップ列（コマ送り再生に使う）。 */
  lastEpisodeSteps: EpisodeStep[];
};

/**
 * ゼロ初期化した Qテーブルから episodes 回分の学習を行う純関数。
 * seed が同じなら常に同じ結果（決定的）——controls（epsilon/alpha/gamma/episodesTrained）
 * だけから毎回ゼロから再計算することで、増分的な外部状態を持たない single source of truth を保つ。
 */
export function trainEpisodes(
  episodes: number,
  epsilon: number,
  alpha: number,
  gamma: number,
  seed: number,
  maxSteps: number,
): TrainingResult {
  const rng = makeLcg(seed);
  let q = createQTable();
  const episodeLengths: number[] = [];
  const episodeRewards: number[] = [];
  let lastEpisodeSteps: EpisodeStep[] = [];

  const n = Math.max(0, Math.floor(episodes));
  for (let e = 0; e < n; e++) {
    const result = runEpisode(q, epsilon, alpha, gamma, rng, maxSteps);
    q = result.qTable;
    episodeLengths.push(result.steps.length);
    episodeRewards.push(result.totalReward);
    lastEpisodeSteps = result.steps;
  }

  return { qTable: q, episodeLengths, episodeRewards, lastEpisodeSteps };
}

// ────────────────────────────────────────────────────────────
// Qテーブルから読み取る指標（ヒートマップ・方策矢印）
// ────────────────────────────────────────────────────────────

/** 各状態の最大行動価値 max_a Q(s,a)（ヒートマップの色に使う）。 */
export function maxQPerState(qTable: QTable): number[] {
  return qTable.map((row) => Math.max(...row));
}

/** 各状態の貪欲方策（最良の行動の添字, 方策矢印に使う）。 */
export function greedyPolicy(qTable: QTable): number[] {
  return qTable.map((row) => argmaxAction(row));
}

/**
 * スタート→ゴールのマンハッタン距離（上下左右移動のみのグリッドでの最短歩数の下限）。
 * このグリッドワールドはスタートとゴールを結ぶマンハッタン最短経路の1つ（右へ4回・上へ4回の
 * 並べ替えのどれか）が落とし穴 TRAP_CELL を必ず避けられるよう配置してあるため、これがそのまま
 * «実現可能な» 最短歩数になる（学習曲線の目安線に使う）。
 */
export function manhattanOptimalSteps(): number {
  return Math.abs(GOAL_CELL.row - START_CELL.row) + Math.abs(GOAL_CELL.col - START_CELL.col);
}
