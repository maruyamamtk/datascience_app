import { describe, expect, it } from "vitest";
import {
  ACTIONS,
  argmaxAction,
  bellmanUpdate,
  cellFromIndex,
  cloneQTable,
  createQTable,
  epsilonGreedyAction,
  GOAL_CELL,
  GOAL_REWARD,
  GRID_SIZE,
  isTerminalCell,
  makeLcg,
  manhattanOptimalSteps,
  maxQPerState,
  greedyPolicy,
  N_STATES,
  runEpisode,
  START_CELL,
  stateIndex,
  stepEnv,
  STEP_REWARD,
  trainEpisodes,
  TRAP_CELL,
  TRAP_REWARD,
} from "./reinforcement-learning";

describe("makeLcg（決定的乱数）", () => {
  it("同じ seed からは常に同じ数列を生成する", () => {
    const a = makeLcg(42);
    const b = makeLcg(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("[0,1) の範囲に収まる", () => {
    const rng = makeLcg(7);
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("状態インデックスの相互変換", () => {
  it("stateIndex と cellFromIndex は互いに逆関数", () => {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const idx = stateIndex({ row, col });
        expect(cellFromIndex(idx)).toEqual({ row, col });
      }
    }
  });

  it("状態数は GRID_SIZE の2乗", () => {
    expect(N_STATES).toBe(GRID_SIZE * GRID_SIZE);
  });
});

describe("stepEnv（環境の状態遷移）", () => {
  it("グリッド外へ出る行動はその場に留まる（壁）", () => {
    const { next } = stepEnv({ row: 0, col: 0 }, "up");
    expect(next).toEqual({ row: 0, col: 0 });
  });

  it("通常マスへの遷移は STEP_REWARD・done=false", () => {
    const { reward, done } = stepEnv({ row: 4, col: 0 }, "right");
    expect(reward).toBe(STEP_REWARD);
    expect(done).toBe(false);
  });

  it("ゴールに到達すると GOAL_REWARD・done=true", () => {
    const approach = { row: GOAL_CELL.row + 1, col: GOAL_CELL.col };
    const { next, reward, done } = stepEnv(approach, "up");
    expect(next).toEqual(GOAL_CELL);
    expect(reward).toBe(GOAL_REWARD);
    expect(done).toBe(true);
  });

  it("落とし穴に到達すると TRAP_REWARD・done=true", () => {
    const approach = { row: TRAP_CELL.row, col: TRAP_CELL.col - 1 };
    const { next, reward, done } = stepEnv(approach, "right");
    expect(next).toEqual(TRAP_CELL);
    expect(reward).toBe(TRAP_REWARD);
    expect(done).toBe(true);
  });

  it("isTerminalCell はゴール・落とし穴のみ true", () => {
    expect(isTerminalCell(GOAL_CELL)).toBe(true);
    expect(isTerminalCell(TRAP_CELL)).toBe(true);
    expect(isTerminalCell(START_CELL)).toBe(false);
  });
});

describe("argmaxAction", () => {
  it("最大値の添字を返す", () => {
    expect(argmaxAction([1, 3, 2, 0])).toBe(1);
  });

  it("同値のときは最小の添字を返す", () => {
    expect(argmaxAction([5, 5, 1, 0])).toBe(0);
  });
});

describe("epsilonGreedyAction", () => {
  it("epsilon=0 なら常に貪欲（argmax）を選ぶ", () => {
    const qRow = [0.1, 0.9, 0.3, 0.2];
    const rng = makeLcg(1);
    for (let i = 0; i < 50; i++) {
      const { action, explored } = epsilonGreedyAction(qRow, 0, rng);
      expect(action).toBe(1);
      expect(explored).toBe(false);
    }
  });

  it("epsilon=1 なら常に探索フラグが立つ（[0,1) の rng は必ず 1 未満）", () => {
    const qRow = [0.1, 0.9, 0.3, 0.2];
    const rng = makeLcg(2);
    for (let i = 0; i < 50; i++) {
      const { explored } = epsilonGreedyAction(qRow, 1, rng);
      expect(explored).toBe(true);
    }
  });

  it("探索時に返す行動は常に有効な範囲内", () => {
    const qRow = [0.1, 0.9, 0.3, 0.2];
    const rng = makeLcg(3);
    for (let i = 0; i < 200; i++) {
      const { action } = epsilonGreedyAction(qRow, 1, rng);
      expect(action).toBeGreaterThanOrEqual(0);
      expect(action).toBeLessThan(qRow.length);
    }
  });
});

describe("bellmanUpdate（Q学習の更新式）", () => {
  it("Q(s,a) ← Q(s,a) + α[r + γ·maxQ(s',a') − Q(s,a)] を正しく計算する", () => {
    const q = createQTable();
    q[5] = [0.2, 0.4, 0.1, 0.0];
    q[7] = [1.0, 0.5, 0.3, 0.2];
    const result = bellmanUpdate(q, 5, 1, 2, 7, 0.5, 0.9, false);
    // maxNextQ = max(q[7]) = 1.0
    expect(result.maxNextQ).toBe(1.0);
    // tdTarget = 2 + 0.9*1.0 = 2.9
    expect(result.tdTarget).toBeCloseTo(2.9, 10);
    // tdError = 2.9 - 0.4 = 2.5
    expect(result.tdError).toBeCloseTo(2.5, 10);
    // qAfter = 0.4 + 0.5*2.5 = 1.65
    expect(result.qAfter).toBeCloseTo(1.65, 10);
  });

  it("終端状態（done=true）では maxNextQ=0（その先の価値を持ち込まない）", () => {
    const q = createQTable();
    q[3] = [0, 0, 0, 0];
    q[9] = [100, 100, 100, 100]; // 終端側に大きな値があっても無視される
    const result = bellmanUpdate(q, 3, 0, 10, 9, 0.5, 0.9, true);
    expect(result.maxNextQ).toBe(0);
    expect(result.tdTarget).toBe(10);
    expect(result.qAfter).toBeCloseTo(5, 10);
  });

  it("qTable を直接変更しない（呼び出し側が q[state][action]=qAfter を代入する設計）", () => {
    const q = createQTable();
    const before = cloneQTable(q);
    bellmanUpdate(q, 0, 0, 1, 1, 0.5, 0.9, false);
    expect(q).toEqual(before);
  });
});

describe("runEpisode（1エピソードの実行）", () => {
  it("epsilon=0・alpha=0（更新なし）でもスタートから動き maxSteps 以内で止まる", () => {
    const q = createQTable();
    const rng = makeLcg(10);
    const result = runEpisode(q, 0, 0, 0.9, rng, 30);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps.length).toBeLessThanOrEqual(30);
  });

  it("十分学習した Qテーブルから epsilon=0 で走らせるとゴールに到達する", () => {
    const rng = makeLcg(999);
    const trained = trainEpisodes(200, 0.2, 0.5, 0.9, 20260601, 60).qTable;
    const result = runEpisode(trained, 0, 0.5, 0.9, rng, 60);
    const last = result.steps[result.steps.length - 1];
    expect(last.done).toBe(true);
    expect(last.reward).toBe(GOAL_REWARD);
  });

  it("元の qTable を書き換えない（イミュータブル）", () => {
    const q = createQTable();
    const before = cloneQTable(q);
    runEpisode(q, 0.5, 0.5, 0.9, makeLcg(1), 20);
    expect(q).toEqual(before);
  });
});

describe("trainEpisodes（学習ループ・self-correcting: 実測で収束を確認する）", () => {
  it("十分なエピソード数で学習すると、平均エピソード長が学習初期より短くなる（収束の実測）", () => {
    const result = trainEpisodes(150, 0.2, 0.5, 0.9, 12345, 60);
    const firstChunk = result.episodeLengths.slice(0, 15);
    const lastChunk = result.episodeLengths.slice(-15);
    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    expect(avg(lastChunk)).toBeLessThan(avg(firstChunk));
  });

  it("episodes=0 なら学習せずゼロ初期化のQテーブルのまま", () => {
    const result = trainEpisodes(0, 0.2, 0.5, 0.9, 1, 60);
    expect(result.qTable).toEqual(createQTable());
    expect(result.episodeLengths).toEqual([]);
    expect(result.lastEpisodeSteps).toEqual([]);
  });

  it("同じ引数（seed含む）なら常に同じ結果を返す（決定的）", () => {
    const a = trainEpisodes(50, 0.2, 0.5, 0.9, 555, 60);
    const b = trainEpisodes(50, 0.2, 0.5, 0.9, 555, 60);
    expect(a.qTable).toEqual(b.qTable);
    expect(a.episodeLengths).toEqual(b.episodeLengths);
  });

  it("十分学習後、ゴールの左隣マスでは «右» が、ゴールの真下マスでは «上» が最良行動になる", () => {
    // ゴール直近マスは最短経路が明確なので、貪欲方策が理にかなった行動を選ぶはず（実測で検証）。
    const result = trainEpisodes(200, 0.15, 0.5, 0.9, 20260601, 60);
    const policy = greedyPolicy(result.qTable);
    const leftOfGoal = stateIndex({ row: GOAL_CELL.row, col: GOAL_CELL.col - 1 });
    const belowGoal = stateIndex({ row: GOAL_CELL.row + 1, col: GOAL_CELL.col });
    expect(ACTIONS[policy[leftOfGoal]]).toBe("right");
    expect(ACTIONS[policy[belowGoal]]).toBe("up");
  });
});

describe("manhattanOptimalSteps", () => {
  it("スタート・ゴールのマンハッタン距離と一致する", () => {
    expect(manhattanOptimalSteps()).toBe(Math.abs(GOAL_CELL.row - START_CELL.row) + Math.abs(GOAL_CELL.col - START_CELL.col));
  });

  it("«右へ全部進んでから上へ全部進む» という最短経路の1つは落とし穴を通らない（設計の前提の検証）", () => {
    const path: { row: number; col: number }[] = [];
    let cell = { ...START_CELL };
    path.push(cell);
    while (cell.col < GOAL_CELL.col) {
      cell = { ...cell, col: cell.col + 1 };
      path.push(cell);
    }
    while (cell.row > GOAL_CELL.row) {
      cell = { ...cell, row: cell.row - 1 };
      path.push(cell);
    }
    expect(path).toHaveLength(manhattanOptimalSteps() + 1);
    expect(path.some((c) => c.row === TRAP_CELL.row && c.col === TRAP_CELL.col)).toBe(false);
    expect(path[path.length - 1]).toEqual(GOAL_CELL);
  });
});

describe("maxQPerState / greedyPolicy", () => {
  it("maxQPerState は各行の最大値を返す", () => {
    const q = createQTable();
    q[0] = [1, 2, 3, 0];
    q[1] = [-1, -2, -3, -0.5];
    expect(maxQPerState(q)[0]).toBe(3);
    expect(maxQPerState(q)[1]).toBe(-0.5);
  });

  it("greedyPolicy は各行の argmax を返す", () => {
    const q = createQTable();
    q[0] = [1, 2, 3, 0];
    expect(greedyPolicy(q)[0]).toBe(2);
  });
});
