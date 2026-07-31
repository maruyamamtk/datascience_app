import {
  AVERAGE_BLUR_3,
  SOBEL_X,
  SOBEL_Y,
  argmax,
  binarize,
  conv2d,
  generateAnchors,
  gradientMagnitude,
  intersectionArea,
  iou,
  softmax,
  topKPredictions,
  unionArea,
  windowPositions,
  type Box,
  type Matrix,
} from "@/lib/stats/image-analysis";
import { createTopicStore } from "./topicStore";

// ---------------------------------------------------------------------------
// トピック共有の定数
// ---------------------------------------------------------------------------

/**
 * FilterLab（L1 Interact）の元画像。左半分が暗く（10）右半分が明るい（200）縦エッジを持つ
 * 6×6グレースケール画像（issueの例示どおり）。エッジ検出フィルタが縦の境界に強く反応する様子と、
 * ぼかし・二値化の効果を同じ画像で比較できる。
 */
export const SOURCE_IMAGE: Matrix = [
  [10, 10, 10, 200, 200, 200],
  [10, 10, 10, 200, 200, 200],
  [10, 10, 10, 200, 200, 200],
  [10, 10, 10, 200, 200, 200],
  [10, 10, 10, 200, 200, 200],
  [10, 10, 10, 200, 200, 200],
];

export type FilterPresetName = "sobel-x" | "sobel-y" | "magnitude" | "blur" | "threshold";

export const FILTER_LABELS: Record<FilterPresetName, string> = {
  "sobel-x": "Sobel Gx（縦エッジ検出）",
  "sobel-y": "Sobel Gy（横エッジ検出）",
  magnitude: "勾配強度（Gx・Gyの合成）",
  blur: "平均化（ぼかし）",
  threshold: "二値化（閾値処理）",
};

const KERNELS: Record<"sobel-x" | "sobel-y" | "blur", Matrix> = {
  "sobel-x": SOBEL_X,
  "sobel-y": SOBEL_Y,
  blur: AVERAGE_BLUR_3,
};

/** 画像分類ラボ（L1 Interact）の3クラス。 */
export const CLASS_LABELS = ["猫", "犬", "鳥"] as const;

/** 物体検出ラボ（L1 Interact）の画像領域サイズ（IoU計算の座標系）。 */
export const DETECTION_CANVAS = { width: 100, height: 100 } as const;

/** アンカーボックス図（L2 Interact）の中心座標・スケール・縦横比の候補（issue #98: アンカーボックスの概念計算）。 */
export const ANCHOR_CENTER = { x: 50, y: 50 } as const;
export const ANCHOR_SCALES: readonly number[] = [20, 32];
export const ANCHOR_RATIOS: readonly number[] = [0.5, 1, 2];
export const ANCHOR_COLORS: readonly string[] = ["#2563eb", "#d97706"];

const clampIndex = (value: number, max: number): number => Math.max(0, Math.min(max, Math.round(value)));

export type IaControls = {
  // --- L1: 画像処理フィルタラボ ---
  /** 選んでいるフィルタ種別。 */
  filterPreset: FilterPresetName;
  /** threshold以外のとき、着目する出力窓の index（windowPositions順）。 */
  windowIndex: number;
  /** threshold のとき使う閾値（0-255）。 */
  threshold: number;

  // --- L1: 画像分類ラボ（ソフトマックス） ---
  /** 3クラスのロジット（生スコア）。 */
  logits: readonly [number, number, number];

  // --- L1: 物体検出ラボ（IoU） ---
  boxA: Box;
  boxB: Box;

  // --- L2: NMSラボ（IoUしきい値） ---
  nmsIouThreshold: number;

  // --- L2: アンカーボックス図 ---
  /** 着目しているアンカーの index（ANCHOR_SCALES×ANCHOR_RATIOSの組み合わせ順）。 */
  anchorHighlightIndex: number;
};

export type IaDerived = {
  filterPreset: FilterPresetName;
  filterOutput: Matrix;
  windowList: { row: number; col: number }[];
  windowIndex: number;
  activeWindow: { row: number; col: number };
  activeWindowValue: number;
  padding: number;
  /** 選んでいるフィルタに関わらず常に計算する Sobel Gx・Gy（勾配強度プリセットの内訳表示・数式連動に使う）。 */
  activeGx: number;
  activeGy: number;

  threshold: number;
  binarized: Matrix;

  logits: readonly [number, number, number];
  probs: number[];
  predictedIndex: number;
  topPredictions: ReturnType<typeof topKPredictions>;

  boxA: Box;
  boxB: Box;
  intersection: number;
  union: number;
  iouValue: number;

  nmsIouThreshold: number;

  anchorBoxes: ReturnType<typeof generateAnchors>;
  anchorHighlightIndex: number;
  activeAnchor: Box;
  activeAnchorScale: number;
  activeAnchorRatio: number;
};

/**
 * 画像解析（Q-4）トピックの Zustand ストア（single source of truth）。
 * Control 層（各ラボの select/slider/ドラッグ）は setControl を呼び、Render 層は
 * controls・derived を購読するだけ——1つの操作変更が対応するグラフ・数式へ一貫して反映される。
 */
export const useImageAnalysisStore = createTopicStore<IaControls, IaDerived>({
  initialControls: {
    filterPreset: "sobel-x",
    windowIndex: 4,
    threshold: 100,
    logits: [2.2, 0.8, -1.5],
    boxA: { x: 15, y: 15, w: 40, h: 40 },
    boxB: { x: 35, y: 30, w: 40, h: 40 },
    nmsIouThreshold: 0.5,
    anchorHighlightIndex: 2,
  },
  derive: ({ filterPreset, windowIndex, threshold, logits, boxA, boxB, nmsIouThreshold, anchorHighlightIndex }) => {
    // sobel-x/sobel-y/blur/magnitude は3x3カーネル由来でpadding=1（same、6x6のまま）、strideは常に1。
    const padding = filterPreset === "threshold" ? 0 : 1;
    // Gx・Gyは選んでいるフィルタに関わらず常に計算する（magnitudeプリセットの合成元、かつ
    // sobel-x/sobel-y選択時も「もう一方」の値を数式の補足表示に使えるようにするため）。
    const gxFull = conv2d(SOURCE_IMAGE, SOBEL_X, { stride: 1, padding: 1 });
    const gyFull = conv2d(SOURCE_IMAGE, SOBEL_Y, { stride: 1, padding: 1 });

    let filterOutput: Matrix;
    if (filterPreset === "threshold") filterOutput = binarize(SOURCE_IMAGE, threshold);
    else if (filterPreset === "magnitude") filterOutput = gradientMagnitude(gxFull, gyFull);
    else filterOutput = conv2d(SOURCE_IMAGE, KERNELS[filterPreset], { stride: 1, padding });

    const windowList = windowPositions(filterOutput.length, filterOutput[0]?.length ?? 0);
    const wIdx = clampIndex(windowIndex, Math.max(0, windowList.length - 1));
    const activeWindow = windowList[wIdx] ?? { row: 0, col: 0 };
    const activeWindowValue = filterOutput[activeWindow.row]?.[activeWindow.col] ?? 0;
    const activeGx = gxFull[activeWindow.row]?.[activeWindow.col] ?? 0;
    const activeGy = gyFull[activeWindow.row]?.[activeWindow.col] ?? 0;

    const binarized = binarize(SOURCE_IMAGE, threshold);

    const probs = softmax(logits);
    const predictedIndex = argmax(probs);
    const topPredictions = topKPredictions(CLASS_LABELS as unknown as string[], probs, 3);

    const intersection = intersectionArea(boxA, boxB);
    const union = unionArea(boxA, boxB);
    const iouValue = iou(boxA, boxB);

    // アンカーボックス: scales×ratios の組み合わせを generateAnchors と同じ順序（scaleの外側ループ→ratioの内側ループ）で列挙し、
    // どのアンカーがどの(scale,ratio)由来かを highlightIndex から逆算する。
    const anchorBoxes = generateAnchors(ANCHOR_CENTER, ANCHOR_SCALES, ANCHOR_RATIOS);
    const aIdx = clampIndex(anchorHighlightIndex, Math.max(0, anchorBoxes.length - 1));
    const activeAnchor = anchorBoxes[aIdx] ?? { x: 0, y: 0, w: 0, h: 0 };
    const activeAnchorScale = ANCHOR_SCALES[Math.floor(aIdx / ANCHOR_RATIOS.length)] ?? ANCHOR_SCALES[0];
    const activeAnchorRatio = ANCHOR_RATIOS[aIdx % ANCHOR_RATIOS.length] ?? ANCHOR_RATIOS[0];

    return {
      filterPreset,
      filterOutput,
      windowList,
      windowIndex: wIdx,
      activeWindow,
      activeWindowValue,
      padding,
      activeGx,
      activeGy,
      threshold,
      binarized,
      logits,
      probs,
      predictedIndex,
      topPredictions,
      boxA,
      boxB,
      intersection,
      union,
      iouValue,
      nmsIouThreshold,
      anchorBoxes,
      anchorHighlightIndex: aIdx,
      activeAnchor,
      activeAnchorScale,
      activeAnchorRatio,
    };
  },
});

/** EdgeDetectionStepper（Sobelフィルタのスライドをコマ送り）専用の空フレームストア（tasks/lessons.md #76）。 */
export const useEdgeStepperFrameStore = createTopicStore<Record<string, never>, Record<string, never>>({
  initialControls: {},
  derive: () => ({}),
});

/** NmsStepper（非最大値抑制の反復をコマ送り）専用の空フレームストア。 */
export const useNmsStepperFrameStore = createTopicStore<Record<string, never>, Record<string, never>>({
  initialControls: {},
  derive: () => ({}),
});
