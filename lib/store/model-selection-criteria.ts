import {
  argminBy,
  CV_FOLDS,
  cvMseForAllModels,
  DATA_SEED,
  fitNestedModels,
  generateDataset,
  type ModelFit,
  N_CANDIDATES,
  type RegressionDataset,
} from "@/lib/stats/model-selection-criteria";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// 固定データセット(決定的LCG)・ネストモデルの当てはめは静的(controlsに依存しない)
// ────────────────────────────────────────────────────────────

export const DATASET: RegressionDataset = generateDataset(DATA_SEED);
export const MODELS: ModelFit[] = fitNestedModels(DATASET);

export const AIC_BEST: ModelFit = argminBy(MODELS, "aic");
export const BIC_BEST: ModelFit = argminBy(MODELS, "bic");
export const CP_BEST: ModelFit = argminBy(MODELS, "cp");

export const INITIAL_SELECTED_K = 0;
export const FOLD_CHOICES = [2, 3, 4, 6, 8, 12] as const;
export const INITIAL_FOLD_COUNT: number = CV_FOLDS;

// ────────────────────────────────────────────────────────────
// メインストア(CriteriaLab + CvLabが共用。ステッパーは1つだけなので
// tasks/lessons.md #76の判断目安どおりmainストアのframeを共用してよい)
// ────────────────────────────────────────────────────────────

export type MainControls = {
  /** 操作ラボで選択中のモデルサイズ(説明変数の数、0〜N_CANDIDATES)。single source of truth。 */
  selectedK: number;
  /** CvLabで選択中の分割数k(交差検証)。single source of truth。 */
  foldCount: number;
};

export type MainDerived = {
  models: ModelFit[];
  selected: ModelFit;
  aicBest: ModelFit;
  bicBest: ModelFit;
  cpBest: ModelFit;
  /** 現在のfoldCountで計算し直した、モデルサイズごとの交差検証MSE。 */
  cvMse: number[];
  cvBestK: number;
};

/**
 * モデル選択基準トピックのZustandストア(single source of truth)。
 * Control層(モデルサイズ選択・分割数選択)はsetControlを呼び、Render層(RSS/AIC/BIC/Cpの折れ線グラフ・
 * 選択中モデルの数式・argminハイライト・交差検証曲線)はこのストアのcontrols・derivedを購読する。
 * CriteriaStepperは同じストアのframeを共用する(ステッパーは1つだけなので#76の判断目安どおり)。
 */
export const useModelSelectionCriteriaStore = createTopicStore<MainControls, MainDerived>({
  initialControls: { selectedK: INITIAL_SELECTED_K, foldCount: INITIAL_FOLD_COUNT },
  initialFrameCount: N_CANDIDATES + 3, // overview(1) + 各モデルサイズ(N_CANDIDATES+1個) + summary(1)
  derive: ({ selectedK, foldCount }) => {
    const cvMse = cvMseForAllModels(DATASET, foldCount);
    let cvBestK = 0;
    for (let k = 1; k < cvMse.length; k++) if (cvMse[k] < cvMse[cvBestK]) cvBestK = k;
    return {
      models: MODELS,
      selected: MODELS[selectedK],
      aicBest: AIC_BEST,
      bicBest: BIC_BEST,
      cpBest: CP_BEST,
      cvMse,
      cvBestK,
    };
  },
});
