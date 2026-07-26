import {
  conv2d,
  type LstmParams,
  lstmCellGradientProfile,
  type LstmStepResult,
  lstmUnroll,
  type Matrix,
  pool2d,
  type PoolMode,
  type RnnParams,
  rnnGradientProfile,
  type RnnStepResult,
  rnnUnroll,
  windowPositions,
} from "@/lib/stats/neural-network-models";
import { createTopicStore } from "./topicStore";

/**
 * CNN セクションで使う «小さな画像»（5×5）。中央付近で明るさが左(暗め)→右(明るめ)へ変わる
 * 単純な縦エッジを模した例——縦エッジ検出フィルタの応答が視覚的に分かりやすい題材にする。
 */
export const INPUT_GRID: Matrix = [
  [1, 1, 5, 8, 8],
  [1, 1, 5, 8, 8],
  [1, 2, 5, 8, 7],
  [1, 1, 5, 8, 8],
  [1, 1, 5, 8, 8],
];

export type FilterPresetName = "vertical-edge" | "blur" | "identity";

/** フィルタのプリセット（3×3）。縦エッジ検出・平均化（ぼかし）・恒等（素通し）。 */
export const FILTER_PRESETS: Record<FilterPresetName, Matrix> = {
  "vertical-edge": [
    [1, 0, -1],
    [1, 0, -1],
    [1, 0, -1],
  ],
  blur: [
    [1 / 9, 1 / 9, 1 / 9],
    [1 / 9, 1 / 9, 1 / 9],
    [1 / 9, 1 / 9, 1 / 9],
  ],
  identity: [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
  ],
};

export const FILTER_LABELS: Record<FilterPresetName, string> = {
  "vertical-edge": "縦エッジ検出",
  blur: "平均化（ぼかし）",
  identity: "恒等（素通し）",
};

/** RNN セクションで使う短い系列（時刻 t=1..6 に入力される値）。 */
export const SEQ_XS: number[] = [1, -0.6, 0.8, -1, 0.5, -0.7];

/** RNN セルのパラメータ（隠れ状態はスカラー、手計算で追える程度の値）。 */
export const RNN_PARAMS: RnnParams = { wxh: 0.9, whh: 0.7, bh: 0, why: 1, by: 0 };

/**
 * LSTM セルのベースパラメータ。forget ゲートのバイアス bf だけは
 * controls.forgetBias で上書きし、«ゲートを開ける/閉じる» 操作を体感できるようにする
 * （wf=uf=0 にして forget ゲートを x・h に依存させず、bf だけで開閉が決まる単純な設定にする）。
 */
export const LSTM_BASE_PARAMS: Omit<LstmParams, "bf"> & { wf: 0; uf: 0 } = {
  wf: 0,
  uf: 0,
  wi: 0.6,
  ui: 0.2,
  bi: 0,
  wg: 0.8,
  ug: 0.1,
  bg: 0,
  wo: 0.5,
  uo: 0.3,
  bo: 0,
};

/** 転移学習の概念図で使う層数（前半=事前学習ずみで凍結、後半=新タスク用に再学習）。 */
export const TRANSFER_LAYER_COUNT = 5;

export type NnmControls = {
  /** CNN: フィルタのプリセット。 */
  filterPreset: FilterPresetName;
  /** CNN: ストライド（1 か 2）。 */
  convStride: 1 | 2;
  /** CNN: パディング幅（0=valid, 1=same相当）。 */
  convPadding: 0 | 1;
  /** CNN: ConvLab で着目する出力窓の index（windowPositions の何番目か）。 */
  windowIndex: number;
  /** CNN: プーリングの方式。 */
  poolMode: PoolMode;
  /** CNN: プーリングのストライド。 */
  poolStride: 1 | 2;
  /** RNN: 通常のRNNかLSTMか（Lab・Stepperで共有するトグル）。 */
  rnnMode: "rnn" | "lstm";
  /** RNN: RnnLstmLab で着目する時刻 t（0=初期状態、1..xs.length）。 */
  seqT: number;
  /** LSTM: forget ゲートのバイアス。大きいほどゲートが開く（1に近づく）。 */
  forgetBias: number;
  /** 転移学習: 各層が凍結(true)か再学習対象(false)か。 */
  frozenLayers: boolean[];
};

export type NnmDerived = {
  inputGrid: Matrix;
  filter: Matrix;
  filterPreset: FilterPresetName;
  convStride: number;
  convPadding: number;
  convOut: Matrix;
  convOutRows: number;
  convOutCols: number;
  windowList: { row: number; col: number }[];
  windowIndex: number;
  activeWindow: { row: number; col: number };
  activeWindowValue: number;
  poolMode: PoolMode;
  poolStride: number;
  poolOut: Matrix;

  xs: number[];
  rnnSteps: RnnStepResult[];
  lstmSteps: LstmStepResult[];
  rnnGradProfile: number[];
  lstmGradProfile: number[];
  rnnMode: "rnn" | "lstm";
  seqT: number;
  forgetBias: number;

  frozenLayers: boolean[];
};

const clampIndex = (value: number, max: number): number => Math.max(0, Math.min(max, Math.round(value)));

/**
 * NNモデル（CNN・RNN, Q-2）トピックの Zustand ストア（single source of truth）。
 * CNN（畳み込み・プーリング）と RNN/LSTM（再帰・ゲート機構）という2つの独立したセクションの
 * controls/derived を1つのストアにまとめる（[ニューラルネットワークの仕組み]と同型のパターン）。
 * コマ送りステッパー（ConvPoolStepper・SequenceStepper）はそれぞれ専用の空ストアで frame を分離する
 * （tasks/lessons.md: 1トピックに複数のStepPlayerを置くときはstepperごとにストアを分ける）。
 */
export const useNeuralNetworkModelsStore = createTopicStore<NnmControls, NnmDerived>({
  initialControls: {
    filterPreset: "vertical-edge",
    convStride: 1,
    convPadding: 0,
    windowIndex: 4,
    poolMode: "max",
    poolStride: 1,
    rnnMode: "rnn",
    seqT: 3,
    forgetBias: 1,
    frozenLayers: Array.from({ length: TRANSFER_LAYER_COUNT }, (_, i) => i < 3),
  },
  derive: ({
    filterPreset,
    convStride,
    convPadding,
    windowIndex,
    poolMode,
    poolStride,
    rnnMode,
    seqT,
    forgetBias,
    frozenLayers,
  }) => {
    const filter = FILTER_PRESETS[filterPreset];
    const convOut = conv2d(INPUT_GRID, filter, { stride: convStride, padding: convPadding });
    const convOutRows = convOut.length;
    const convOutCols = convOut[0]?.length ?? 0;
    const windowList = windowPositions(convOutRows, convOutCols);
    const clampedWindowIndex = clampIndex(windowIndex, Math.max(0, windowList.length - 1));
    const activeWindow = windowList[clampedWindowIndex] ?? { row: 0, col: 0 };
    const activeWindowValue = convOut[activeWindow.row]?.[activeWindow.col] ?? 0;

    const poolOut = pool2d(convOut, 2, poolStride, poolMode);

    const lstmParams: LstmParams = { ...LSTM_BASE_PARAMS, bf: forgetBias };
    const rnnSteps = rnnUnroll(SEQ_XS, 0, RNN_PARAMS);
    const lstmSteps = lstmUnroll(SEQ_XS, 0, 0, lstmParams);
    const rnnGradProfile = rnnGradientProfile(rnnSteps, RNN_PARAMS.whh);
    const lstmGradProfile = lstmCellGradientProfile(lstmSteps);
    const clampedSeqT = clampIndex(seqT, SEQ_XS.length);

    return {
      inputGrid: INPUT_GRID,
      filter,
      filterPreset,
      convStride,
      convPadding,
      convOut,
      convOutRows,
      convOutCols,
      windowList,
      windowIndex: clampedWindowIndex,
      activeWindow,
      activeWindowValue,
      poolMode,
      poolStride,
      poolOut,

      xs: SEQ_XS,
      rnnSteps,
      lstmSteps,
      rnnGradProfile,
      lstmGradProfile,
      rnnMode,
      seqT: clampedSeqT,
      forgetBias,

      frozenLayers,
    };
  },
});

/** ConvPoolStepper（コマ送り: 畳み込み→プーリングの走査）専用の frame ストア（controls/derived は空）。 */
export const useConvPoolFrameStore = createTopicStore<Record<string, never>, Record<string, never>>({
  initialControls: {},
  derive: () => ({}),
});

/** SequenceStepper（コマ送り: RNN/LSTMの時間展開）専用の frame ストア（controls/derived は空）。 */
export const useSequenceFrameStore = createTopicStore<Record<string, never>, Record<string, never>>({
  initialControls: {},
  derive: () => ({}),
});
