import {
  accuracy,
  bestSplit,
  buildEnsemble,
  buildTree,
  type ClassPoint,
  collectSplitLines,
  countLeaves,
  type Criterion,
  decisionBoundaryGrid,
  type EnsembleMethod,
  ensemblePredict,
  generateClassificationData,
  generateRegressionData,
  type GbRound,
  gradientBoostingFit,
  type GridCell,
  impurity,
  oobErrorRate,
  predictTree,
  type RegPoint,
  type SplitLine,
  treeDepth as computeTreeDepth,
  type TreeNode,
} from "@/lib/stats/decision-trees-ensembles";
import { createTopicStore } from "./topicStore";

/**
 * 決定木・アンサンブル（I-3）で共通に使う判別データ（2特徴量、決定的LCG）。
 * «真の境界» は波打つ曲線——決定木が軸平行な矩形でしか分けられないため、深さを上げるほど
 * «階段状» に近似していく、という Level0〜2 共通の物語を作る（frames.ts / boosting-frames.ts も参照）。
 */
export const N_TRAIN = 60;
export const N_TEST = 50;
export const NOISE_P = 0.06;
const TRAIN_SEED = 20260101;
const TEST_SEED = 20260228;
export const CLASS_TRAIN: ClassPoint[] = generateClassificationData(N_TRAIN, TRAIN_SEED, NOISE_P);
export const CLASS_TEST: ClassPoint[] = generateClassificationData(N_TEST, TEST_SEED, NOISE_P);

/** 決定境界グリッドの解像度（小さく保って60fps目標・再計算コストを抑える）。 */
export const GRID_RESOLUTION = 28;
/** バギング／ランダムフォレストのブートストラップに使う決定的シード。 */
const ENSEMBLE_SEED = 424242;

export const MAX_DEPTH_MIN = 1;
export const MAX_DEPTH_MAX = 6;
export const N_TREES_MIN = 1;
export const N_TREES_MAX = 50;

/**
 * 勾配ブースティング（L3補足図）用の1次元回帰データと、あらかじめ計算したラウンド列。
 * 操作系を持たない静的な図なので、コントロールを介さずモジュール読み込み時に1回だけ計算する
 * （decision-trees-ensembles.ts の gradientBoostingFit をそのまま呼ぶだけ＝計算層のみに依存）。
 */
export const GB_N = 40;
export const GB_NOISE = 0.15;
export const GB_ROUNDS_TOTAL = 30;
export const GB_LEARNING_RATE = 0.25;
export const GB_MAX_DEPTH = 2;
const GB_SEED = 90210;
export const REG_POINTS: RegPoint[] = generateRegressionData(GB_N, GB_SEED, GB_NOISE);
export const GB_INITIAL = REG_POINTS.reduce((s, p) => s + p.y, 0) / REG_POINTS.length;
export const GB_ROUNDS: GbRound[] = gradientBoostingFit(REG_POINTS, GB_ROUNDS_TOTAL, GB_LEARNING_RATE, GB_MAX_DEPTH);

export type MainControls = {
  /** 決定木の最大深さ。 */
  maxDepth: number;
  /** 分岐基準（ジニ不純度 / エントロピー）。 */
  criterion: Criterion;
  /** アンサンブルの木の本数。 */
  nTrees: number;
  /** バギング（全特徴量）かランダムフォレスト（各分割で1特徴量）か。 */
  ensembleMethod: EnsembleMethod;
};

export type MainDerived = {
  maxDepth: number;
  criterion: Criterion;
  tree: TreeNode;
  treeTrainAcc: number;
  treeTestAcc: number;
  treeLeafCount: number;
  treeDepthActual: number;
  splitLines: SplitLine[];
  treeBoundary: GridCell[];
  /** 根ノードの分割（数式の強連動に使う: 親の不純度・情報利得）。 */
  rootImpurity: number;
  rootGain: number;
  rootFeature: 0 | 1;
  rootThreshold: number;

  nTrees: number;
  ensembleMethod: EnsembleMethod;
  ensembleBoundary: GridCell[];
  ensembleTestAcc: number;
  oobError: number;
  /** 比較用: アンサンブルの1本目の木（ブートストラップ標本1本ぶん）だけで予測したときのテスト精度。 */
  singleTreeTestAcc: number;
};

/**
 * Level0（DecisionTreeLab）・Level2（EnsembleLab）が購読するメインストア。
 * maxDepth・criterion は単木とアンサンブルの両方に効き、nTrees・ensembleMethod は
 * アンサンブル側だけに効く。すべて controls → derive(純関数, lib/stats) の単一経路で再計算する。
 */
export const useDecisionTreesEnsemblesStore = createTopicStore<MainControls, MainDerived>({
  initialControls: { maxDepth: 3, criterion: "gini", nTrees: 10, ensembleMethod: "bagging" },
  derive: ({ maxDepth, criterion, nTrees, ensembleMethod }) => {
    const tree = buildTree(CLASS_TRAIN, 0, { maxDepth, criterion });
    const treeTrainAcc = accuracy(CLASS_TRAIN, (x1, x2) => predictTree(tree, x1, x2));
    const treeTestAcc = accuracy(CLASS_TEST, (x1, x2) => predictTree(tree, x1, x2));
    const treeLeafCount = countLeaves(tree);
    const treeDepthActual = computeTreeDepth(tree);
    const splitLines = collectSplitLines(tree);
    const treeBoundary = decisionBoundaryGrid((x1, x2) => predictTree(tree, x1, x2), GRID_RESOLUTION);

    const rootImpurity = impurity(CLASS_TRAIN, criterion);
    const rootSplit = bestSplit(CLASS_TRAIN, criterion);

    const trees = buildEnsemble(CLASS_TRAIN, nTrees, ensembleMethod, criterion, maxDepth, ENSEMBLE_SEED);
    const ensembleBoundary = decisionBoundaryGrid((x1, x2) => ensemblePredict(trees, x1, x2).label, GRID_RESOLUTION);
    const ensembleTestAcc = accuracy(CLASS_TEST, (x1, x2) => ensemblePredict(trees, x1, x2).label);
    const oobError = oobErrorRate(CLASS_TRAIN, trees);

    // 比較用の「単木」は trees[0] と同一（同じシードの makeLcg は毎回同じ順で乱数を払い出すため、
    // 1本目のブートストラップ標本・分割はアンサンブルの本数によらず一致する）。
    // buildEnsemble を余分にもう一度呼ばず、既に育てた1本目を再利用する。
    const singleTreeTestAcc = accuracy(CLASS_TEST, (x1, x2) => ensemblePredict(trees.slice(0, 1), x1, x2).label);

    return {
      maxDepth,
      criterion,
      tree,
      treeTrainAcc,
      treeTestAcc,
      treeLeafCount,
      treeDepthActual,
      splitLines,
      treeBoundary,
      rootImpurity,
      rootGain: rootSplit?.gain ?? 0,
      rootFeature: rootSplit?.feature ?? 0,
      rootThreshold: rootSplit?.threshold ?? 0.5,
      nTrees,
      ensembleMethod,
      ensembleBoundary,
      ensembleTestAcc,
      oobError,
      singleTreeTestAcc,
    };
  },
});

/**
 * コマ送りステッパー専用の «空 controls» ストア（Level1 の分岐探索・Level3 の AdaBoost で使う）。
 * フレーム «中身» は各コンポーネントの frames.ts / boosting-frames.ts が純関数で作り、
 * ストアは `frame`（index/count/playing）だけを single source of truth として提供する
 * ——2つのステッパーが同一ページに同時に存在するため、メインストアの frame とは独立させる。
 */
export type EmptyControls = Record<string, never>;
export type EmptyDerived = Record<string, never>;

export const useSplitFinderStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});

export const useAdaBoostStepperStore = createTopicStore<EmptyControls, EmptyDerived>({
  initialControls: {},
  derive: () => ({}),
});
