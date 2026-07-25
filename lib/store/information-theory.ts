import {
  binaryEntropy,
  klDivergence,
  mutualInformation,
  mutualInformationViaKL,
  normalize,
  normalizeJoint,
  marginalX,
  marginalY,
  entropy,
  jointEntropy,
  type Distribution,
  type JointDistribution,
} from "@/lib/stats/information-theory";
import { createTopicStore } from "./topicStore";

// ────────────────────────────────────────────────────────────
// メインストア(single source of truth)
// - BinaryEntropyLab(L0/L1)の確率p、MutualInformationLab(L2)の同時分布(天気×傘、4セル)、
//   KlDivergenceLab(L2)の2つの分布(4カテゴリ)を操作値に持つ。
// - SelfInformationStepper(L1)はこのトピック唯一のコマ送りステッパーなので、
//   メインストアのframeを共用する(tasks/lessons.md #76の判断目安どおり)。
// ────────────────────────────────────────────────────────────

export type MainControls = {
  /** BinaryEntropyLab(L0/L1)で動かす確率p(表が出る確率など)。 */
  coinP: number;
  /** MutualInformationLab(L2)の同時分布(天気×傘の目撃回数、行=天気/列=傘)。 */
  jointCounts: number[][];
  /** KlDivergenceLab(L2)の「実際の分布P」(4カテゴリの重み、正規化前)。 */
  klPWeights: number[];
  /** KlDivergenceLab(L2)の「予測分布Q」(4カテゴリの重み、正規化前)。 */
  klQWeights: number[];
};

export type MainDerived = {
  // BinaryEntropyLab
  binaryEntropyValue: number;
  // MutualInformationLab
  jointTable: JointDistribution;
  px: Distribution;
  py: Distribution;
  hx: number;
  hy: number;
  hxy: number;
  mutualInfo: number;
  mutualInfoViaKL: number;
  // KlDivergenceLab
  klP: Distribution;
  klQ: Distribution;
  klPQ: number;
  klQP: number;
};

/** 天気(晴れ/雨)×傘(持つ/持たない)の目撃回数。相関ありの初期値(雨の日は傘を持つことが多い)。 */
export const INITIAL_JOINT_COUNTS: number[][] = [
  [35, 10], // 晴れ: 傘を持つ=35, 持たない=10
  [8, 47], // 雨: 傘を持つ=8, 持たない=47
];

export const JOINT_ROW_LABELS = ["晴れ", "雨"] as const;
export const JOINT_COL_LABELS = ["傘を持つ", "傘を持たない"] as const;

/** KLダイバージェンスLabの4カテゴリ(天気予報の例: 晴れ/曇り/雨/雪)。 */
export const KL_CATEGORY_LABELS = ["晴れ", "曇り", "雨", "雪"] as const;

/** SelfInformationStepper(L1)の例の数。 */
export const SELF_INFO_EXAMPLE_COUNT = 5;

export const INITIAL_CONTROLS: MainControls = {
  coinP: 0.5,
  jointCounts: INITIAL_JOINT_COUNTS.map((row) => [...row]),
  // 実際の分布P: 雨が多め、予測分布Q: 一様(=何も知らないと仮定した予測)
  klPWeights: [10, 20, 60, 10],
  klQWeights: [25, 25, 25, 25],
};

/**
 * 情報理論(P-2)トピックのZustandストア(single source of truth)。
 * Control層(確率pスライダー、同時分布セル編集、2分布のカテゴリ重み編集)はsetControl/patchControlsを
 * 呼び、Render層(H(p)曲線・同時分布バー・相互情報量・KLダイバージェンス・数式)はこのストアの
 * controls・derivedを購読するだけ(3層疎結合)。
 */
export const useInformationTheoryStore = createTopicStore<MainControls, MainDerived>({
  initialControls: INITIAL_CONTROLS,
  initialFrameCount: SELF_INFO_EXAMPLE_COUNT,
  derive: (controls) => {
    const jointTable = normalizeJoint(controls.jointCounts);
    const px = marginalX(jointTable);
    const py = marginalY(jointTable);

    const klP = normalize(controls.klPWeights);
    const klQ = normalize(controls.klQWeights);

    return {
      binaryEntropyValue: binaryEntropy(controls.coinP),

      jointTable,
      px,
      py,
      hx: entropy(px),
      hy: entropy(py),
      hxy: jointEntropy(jointTable),
      mutualInfo: mutualInformation(jointTable),
      mutualInfoViaKL: mutualInformationViaKL(jointTable),

      klP,
      klQ,
      klPQ: klDivergence(klP, klQ),
      klQP: klDivergence(klQ, klP),
    };
  },
});
