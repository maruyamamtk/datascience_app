/**
 * 元分布（母集団）の記述子（計算層・純関数）。
 * CLT 体験では「元の分布が何でも、標本平均は n を増やすと正規に近づく」を見せたいので、
 * 形の異なる 3 分布を用意し、**いずれも母平均 μ=5 に揃える**（中心を固定して "縮みながら正規化"
 * を観察しやすくする / walking-skeleton.md §6）。母標準偏差 σ は分布ごとに異なる。
 *
 * 各分布は理論値 (mean μ, sd σ) と、Rng から 1 観測を引く `sample` を持つ。副作用は持たない
 * （乱数の状態は呼び出し側が渡す Rng に閉じる）。
 */

import type { Rng } from "./random";

/** 元分布の種別（一様 / 指数 / 二項）。 */
export type DistKind = "uniform" | "exponential" | "binomial";

/** 元分布の記述子。理論値と 1 観測サンプラを持つ。 */
export type Distribution = {
  kind: DistKind;
  /** 表示名（日本語）。 */
  label: string;
  /** パラメータの短い説明（UI 補足用）。 */
  paramText: string;
  /** 母平均 μ。 */
  mean: number;
  /** 母標準偏差 σ。 */
  sd: number;
  /** 観測のとり得る下限（ヒストグラム軸用の目安）。 */
  min: number;
  /** 観測のとり得る上限（ヒストグラム軸用の目安。指数は実用上の打ち切り）。 */
  max: number;
  /** Rng から 1 観測を引く純関数（Rng の状態が進む）。 */
  sample: (rng: Rng) => number;
};

// すべて母平均 μ = 5 に揃える。
const TARGET_MEAN = 5;

// 一様分布 U[0,10]: μ=(a+b)/2=5, σ=(b-a)/√12。
const UNIFORM_A = 0;
const UNIFORM_B = 10;

// 指数分布: 平均 = 1/λ = 5 → λ=0.2, σ=平均=5。実用上 max は μ の 4 倍で打ち切り表示。
const EXP_MEAN = TARGET_MEAN;

// 二項分布 Bin(trials=10, p=0.5): μ=trials·p=5, σ=√(trials·p·(1-p))。
const BIN_TRIALS = 10;
const BIN_P = 0.5;

const UNIFORM: Distribution = {
  kind: "uniform",
  label: "一様分布",
  paramText: "U[0, 10]",
  mean: (UNIFORM_A + UNIFORM_B) / 2,
  sd: (UNIFORM_B - UNIFORM_A) / Math.sqrt(12),
  min: UNIFORM_A,
  max: UNIFORM_B,
  sample: (rng) => UNIFORM_A + (UNIFORM_B - UNIFORM_A) * rng(),
};

const EXPONENTIAL: Distribution = {
  kind: "exponential",
  label: "指数分布",
  paramText: "平均 5（右に裾を引く）",
  mean: EXP_MEAN,
  sd: EXP_MEAN, // 指数分布は σ = 平均。
  min: 0,
  max: EXP_MEAN * 4,
  // 逆関数法: X = -mean·ln(1-U)。U∈[0,1) なので 1-U∈(0,1] で log の発散を避ける。
  sample: (rng) => -EXP_MEAN * Math.log(1 - rng()),
};

const BINOMIAL: Distribution = {
  kind: "binomial",
  label: "二項分布",
  paramText: `Bin(${BIN_TRIALS}, ${BIN_P})`,
  mean: BIN_TRIALS * BIN_P,
  sd: Math.sqrt(BIN_TRIALS * BIN_P * (1 - BIN_P)),
  min: 0,
  max: BIN_TRIALS,
  // trials 回のベルヌーイ試行の成功数。
  sample: (rng) => {
    let k = 0;
    for (let i = 0; i < BIN_TRIALS; i++) {
      if (rng() < BIN_P) k++;
    }
    return k;
  },
};

const REGISTRY: Record<DistKind, Distribution> = {
  uniform: UNIFORM,
  exponential: EXPONENTIAL,
  binomial: BINOMIAL,
};

/** 全分布の一覧（UI のセレクタ表示順）。 */
export const DISTRIBUTIONS: readonly Distribution[] = [UNIFORM, EXPONENTIAL, BINOMIAL];

/** 種別から分布記述子を取得する。 */
export function getDistribution(kind: DistKind): Distribution {
  return REGISTRY[kind];
}
