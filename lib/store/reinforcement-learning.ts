import {
  type EpisodeStep,
  greedyPolicy,
  maxQPerState,
  type QTable,
  trainEpisodes,
} from "@/lib/stats/reinforcement-learning";
import { createTopicStore } from "./topicStore";

/** グリッドワールド学習ラボ（Level0）の乱数 seed・学習パラメータの上限。 */
const TRAIN_SEED = 20260601;
const MAX_STEPS = 60;
export const EPISODES_MIN = 0;
export const EPISODES_MAX = 200;
export const EPISODES_STEP = 5;

export type MainControls = {
  /** ε-greedy の探索率。 */
  epsilon: number;
  /** 学習率 α。 */
  alpha: number;
  /** 割引率 γ。 */
  gamma: number;
  /** これまでに学習させたエピソード数（このLabの「時計の針」）。 */
  episodesTrained: number;
};

export type MainDerived = {
  epsilon: number;
  alpha: number;
  gamma: number;
  episodesTrained: number;
  qTable: QTable;
  /** 各状態の max_a Q(s,a)（ヒートマップの色に使う）。 */
  maxQ: number[];
  /** 各状態の貪欲方策（矢印表示に使う）。 */
  policy: number[];
  /** エピソードごとの歩数（学習曲線）。 */
  episodeLengths: number[];
  /** エピソードごとの合計報酬。 */
  episodeRewards: number[];
  /** 最後に学習したエピソードのステップ列（コマ送り再生に使う）。 */
  lastEpisodeSteps: EpisodeStep[];
};

/**
 * グリッドワールド Q学習ラボ（Level0 GridWorldLab, Level2 LearningCurveChart が購読）のメインストア。
 *
 * `trainEpisodes` は controls（epsilon/alpha/gamma/episodesTrained）だけから **毎回ゼロから
 * 学習をやり直す純関数** なので、controls が変われば常に決定的に同じ結果になる
 * （seed 固定・増分的な外部状態を持たない）。episodesTrained ≤ EPISODES_MAX（200）×
 * maxSteps=60 は数千ステップ程度で軽量なので、スライダー操作のたびに再計算しても 60fps 目標を
 * 妨げない（CLAUDE.md §2「MVP範囲の統計計算はJSで完結」）。
 *
 * 実測: `trainEpisodes(200, ...)`（最悪ケース）は Node.js 上で約0.56ms/回
 * （20回実行の平均、lib/stats配下のVitestで計測）。range input の onChange はドラッグ中でも
 * ブラウザの描画レートに束ねられて発火するため、60fps予算（16.6ms/フレーム）に対して十分小さく、
 * naive-bayes-knn.ts の `KNN_BOUNDARY_BY_K` のような事前計算テーブルは不要と判断した
 * （kのような離散で小さい範囲と異なり、epsilon/alpha/gammaは連続スライダーで組み合わせ数が
 * 膨大なため、そもそも全パターンの事前計算は現実的でない）。
 */
export const useReinforcementLearningStore = createTopicStore<MainControls, MainDerived>({
  initialControls: { epsilon: 0.2, alpha: 0.5, gamma: 0.9, episodesTrained: 40 },
  derive: ({ epsilon, alpha, gamma, episodesTrained }) => {
    const result = trainEpisodes(episodesTrained, epsilon, alpha, gamma, TRAIN_SEED, MAX_STEPS);
    return {
      epsilon,
      alpha,
      gamma,
      episodesTrained,
      qTable: result.qTable,
      maxQ: maxQPerState(result.qTable),
      policy: greedyPolicy(result.qTable),
      episodeLengths: result.episodeLengths,
      episodeRewards: result.episodeRewards,
      lastEpisodeSteps: result.lastEpisodeSteps,
    };
  },
});

/**
 * 「Q学習の更新式」ステッパー（Level1 QUpdateStepper）専用の «空 controls» ストア。
 * フレーム «中身»（各ステップの状態・行動・報酬・Q値）は qupdate-frames.ts が固定データから
 * 純関数で作り、このストアは `frame`（index/count/playing）だけを single source of truth
 * として提供する——Level0 の GridWorldLab は自身の frame（最終エピソードの再生）を持つので、
 * 2つ目の StepPlayer は専用の空ストアに分離する（tasks/lessons.md #76 の教訓）。
 */
export type EmptyControls = Record<string, never>;
export type EmptyDerived = Record<string, never>;

export const useQUpdateStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});
