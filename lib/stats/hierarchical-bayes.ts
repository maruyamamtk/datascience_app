/**
 * 階層ベイズモデル（K-3）の計算層（純関数・副作用なし・Vitest 対象）。
 *
 * 扱う道具（SPEC §3 K-3「階層ベイズモデル、ベイズ線形回帰、潜在変数モデル」
 * 出典: 『Pythonでスラスラわかるベイズ推論「超」入門』第5章「ベイズ推論プログラミング」）:
 *
 * - **階層ベイズモデル（正規-正規, グループ間の縮小推定/shrinkage）**: 複数グループ（本トピックは
 *   「6クラスのテスト平均点」を例にする、グループごとに生徒数=サンプルサイズが異なる）の
 *   データ y_ij ~ N(θ_j, σ²) を、(a) 各グループを完全独立に推定（プールなし, θ_j=ȳ_j）、
 *   (b) 全グループをプールして単一の共通平均で推定（完全プール, θ_j=μ）、
 *   (c) 階層ベイズ（θ_j ~ N(μ, τ²) というハイパー事前分布から生成されると考える, 部分プーリング）
 *   の3通りで比較できるようにする。(c) の事後平均は、[ベイズ計算法](mcmc-methods)・
 *   [ベイズ統計の基礎](bayesian-basics)と同じ「事後 ∝ 尤度 × 事前」の骨格から、
 *   **データ平均とハイパー事前平均の«精度で重みづけた平均»**（縮小推定）として閉形式で求まる
 *   （共役性があるため MCMC を使わずに解析的に求まる——この閉形式が本トピックの核心）。
 * - **ベイズ線形回帰**: 回帰係数（傾き）に正規事前分布 N(0, τ_β²) を置いた単純回帰。
 *   説明変数を中心化すると切片・傾きの最小二乗推定が直交し、傾きの事後平均が階層モデルと
 *   **全く同じ«精度加重平均»の式**（`precisionWeightedMean`）で閉形式に求まる——
 *   事前分散 τ_β² を小さくするほど傾きは0（無回帰）へ縮小され、この縮小推定は
 *   [正則化・スパースモデリング](regularization-sparse)のRidge回帰のMAP推定と一致する
 *   （λ=σ²/τ_β² が正則化の強さに対応する）。
 * - **潜在変数モデル**: 観測されない離散変数（2成分混合正規分布のクラス割当 z）を導入し、
 *   ベイズの定理で事後の所属確率（responsibility）を計算する入門的な例。
 *
 * 乱数は他トピック（mcmc-methods 等）と同じ決定的な整数演算 mulberry32 +
 * «一様乱数3個の和−1.5»（Irwin–Hall近似, 超越関数を使わない）に閉じ、SSR/CSR で結果がぶれない
 * （tasks/lessons.md «擬似乱数データは整数演算だけの決定的LCGで生成する» の教訓）。
 */

import { mulberry32, type Rng } from "./random";
import { mean } from "./monte-carlo";
import { normalPdf } from "./normal";

// ────────────────────────────────────────────────────────────
// 決定的な擬似ガウス乱数（例データの生成にのみ使う）
// ────────────────────────────────────────────────────────────

/** 一様乱数3個の和−1.5 で近似ガウス（Irwin–Hall、超越関数を使わず決定的）。 */
export function pseudoGaussian(rng: Rng): number {
  return rng() + rng() + rng() - 1.5;
}

/** pseudoGaussian（sd=0.5基準）を任意の標準偏差 sd にスケールする。sd<=0 は常に0を返す。 */
export function scaledGaussian(rng: Rng, sd: number): number {
  if (sd <= 0) return 0;
  return pseudoGaussian(rng) * (sd / 0.5);
}

// ────────────────────────────────────────────────────────────
// 例データ: 6クラスのテスト平均点（サンプルサイズ=生徒数がグループごとに異なる）
// ────────────────────────────────────────────────────────────

export type Group = {
  id: string;
  label: string;
  n: number;
  values: number[];
  sampleMean: number;
};

/** サンプルサイズが小さい順（=シュリンクが強く出るグループが先）に並べた6クラスの生徒数。 */
export const GROUP_SAMPLE_SIZES = [5, 8, 12, 18, 27, 40] as const;
export const GROUP_LABELS = ["A組", "B組", "C組", "D組", "E組", "F組"] as const;

/** データ生成に使う「真の」母集団パラメータ（学習者には見せない裏の値。テストで復元度を確認する）。 */
export const TRUE_GRAND_MEAN = 62;
export const TRUE_BETWEEN_SD = 6;
export const TRUE_WITHIN_SD = 10;

const DATA_SEED = 20260725;

/**
 * 6クラス分のテストデータを決定的に生成する。各クラスの「真の」平均 θ_j は
 * N(TRUE_GRAND_MEAN, TRUE_BETWEEN_SD²) から、生徒1人ずつの点数は N(θ_j, TRUE_WITHIN_SD²) から
 * 生成する——これがまさに階層モデルの生成過程そのもの（学習者が推定しようとする構造）。
 */
export function generateGroups(
  sizes: readonly number[] = GROUP_SAMPLE_SIZES,
  seed: number = DATA_SEED,
): Group[] {
  const rng = mulberry32(seed);
  return sizes.map((n, i) => {
    const trueTheta = TRUE_GRAND_MEAN + scaledGaussian(rng, TRUE_BETWEEN_SD);
    const values = Array.from({ length: n }, () => trueTheta + scaledGaussian(rng, TRUE_WITHIN_SD));
    return {
      id: `group-${i}`,
      label: GROUP_LABELS[i] ?? `第${i + 1}組`,
      n,
      values,
      sampleMean: mean(values),
    };
  });
}

export const DEFAULT_GROUPS: Group[] = generateGroups();

// ────────────────────────────────────────────────────────────
// プールなし / 完全プール / 部分プーリング（階層ベイズ・shrinkage）の比較
// ────────────────────────────────────────────────────────────

/**
 * 群内分散 σ² のプール推定（ANOVAの群内平方和と同じ考え方: 各グループの
 * 偏差平方和を合計し、自由度 Σ(n_j−1) で割る）。
 */
export function pooledWithinVariance(groups: readonly Group[]): number {
  let ssWithin = 0;
  let dfWithin = 0;
  for (const g of groups) {
    const m = g.sampleMean;
    ssWithin += g.values.reduce((acc, v) => acc + (v - m) ** 2, 0);
    dfWithin += g.n - 1;
  }
  return dfWithin > 0 ? ssWithin / dfWithin : 0;
}

/** 全グループの生データをまとめて1つにプールした全体平均（=完全プール推定量そのもの）。 */
export function grandMean(groups: readonly Group[]): number {
  const all = groups.flatMap((g) => g.values);
  return mean(all);
}

/**
 * 精度（分散の逆数）で重みづけた2つの平均の加重平均。
 * 階層ベイズの事後平均・ベイズ線形回帰の係数事後平均、どちらもこの1つの式に帰着する
 * ——「不確実性が小さい（精度が高い）情報ほど強く信じる」という直感の定式化。
 * 分母が0（両方の精度が0）のときは priorMean を返す。
 */
export function precisionWeightedMean(
  dataMean: number,
  dataPrecision: number,
  priorMean: number,
  priorPrecision: number,
): number {
  const denom = dataPrecision + priorPrecision;
  if (!(denom > 0)) return priorMean;
  return (dataPrecision * dataMean + priorPrecision * priorMean) / denom;
}

/**
 * 縮小の重み B_j ∈ [0,1]（ハイパー事前平均 μ 側にどれだけ引き寄せられるか）。
 * B_j = (1/τ²) / (n_j/σ² + 1/τ²)。
 * - τ²→0（グループ間にばらつきが無いと信じる）: B_j→1 = 完全プール（μ にべったり）
 * - τ²→∞（グループ間は無関係と信じる）: B_j→0 = プールなし（自グループの平均ȳ_jそのまま）
 * - n_j が大きいほど（自グループのデータが豊富なほど）B_j は小さくなる＝縮小されにくい。
 */
export function shrinkageWeight(n: number, sigma2: number, tau2: number): number {
  if (!(sigma2 > 0) || !(n > 0)) return 0;
  if (tau2 <= 0) return 1;
  if (!Number.isFinite(tau2)) return 0;
  const dataPrecision = n / sigma2;
  const priorPrecision = 1 / tau2;
  return priorPrecision / (dataPrecision + priorPrecision);
}

/** 縮小の重み weight を使い、自グループ平均とハイパー事前平均 mu の加重平均をとる。 */
export function partialPoolingMean(sampleMean: number, mu: number, weight: number): number {
  return weight * mu + (1 - weight) * sampleMean;
}

export type GroupEstimate = {
  group: Group;
  /** (a) プールなし: 自グループの標本平均そのまま。 */
  noPooling: number;
  /** (b) 完全プール: 全グループ共通の単一平均 μ。 */
  completePooling: number;
  /** (c) 階層ベイズ（部分プーリング）: (a)と(b)の精度加重平均。 */
  partialPooling: number;
  /** 縮小の重み B_j（μ側の重み）。0=プールなしに一致、1=完全プールに一致。 */
  weight: number;
};

/**
 * 全グループについて (a)(b)(c) の3推定量をまとめて計算する。
 * σ²・μ は既定でデータから推定（プール分散・全体平均）し、τ² だけを操作可能な引数として渡す
 * ——Labのτスライダーがこの1引数を動かす。
 */
export function compareEstimates(
  groups: readonly Group[],
  tau2: number,
  sigma2: number = pooledWithinVariance(groups),
  mu: number = grandMean(groups),
): GroupEstimate[] {
  return groups.map((g) => {
    const weight = shrinkageWeight(g.n, sigma2, tau2);
    return {
      group: g,
      noPooling: g.sampleMean,
      completePooling: mu,
      partialPooling: partialPoolingMean(g.sampleMean, mu, weight),
      weight,
    };
  });
}

// ────────────────────────────────────────────────────────────
// ベイズ線形回帰（説明変数を中心化し、傾きの事後平均を精度加重平均の閉形式で求める）
// ────────────────────────────────────────────────────────────

export type RegressionPoint = { x: number; y: number };

export type RegressionPosterior = {
  /** 通常の最小二乗（傾き）。 */
  slopeOls: number;
  /** 最小二乗の切片（中心化のもとでは ȳ に一致）。 */
  interceptOls: number;
  /** 事後平均（傾き）。 */
  slopePosterior: number;
  /** 切片は無情報事前分布のまま(Ridge回帰の慣例と同じく切片には罰則を掛けない)なのでOLSと一致。 */
  interceptPosterior: number;
  /** 傾きの縮小の重み（0=傾きの事前分布を無視してOLSに一致、1=事前平均0に完全に縮小）。 */
  slopeWeight: number;
  /** 中心化後の説明変数の平方和 S_xx（精度の計算に使う）。 */
  sxx: number;
};

/** 説明変数を中心化する（切片と傾きの最小二乗推定を直交させ、閉形式を単純にするための前処理）。 */
export function centerX(points: readonly RegressionPoint[]): { xBar: number; xc: number[] } {
  const xBar = mean(points.map((p) => p.x));
  return { xBar, xc: points.map((p) => p.x - xBar) };
}

/**
 * 単回帰 y=β0+β1x に、傾き β1 だけ正規事前分布 N(priorMeanSlope, priorVarSlope) を置いた
 * ベイズ線形回帰の事後平均を解析的に求める（σ² は既知として扱う）。
 * 説明変数を中心化しているため切片と傾きの最小二乗推定が直交し、
 * 傾きの事後平均は precisionWeightedMean（階層ベイズと全く同じ式）にそのまま帰着する。
 */
export function bayesianLinearRegression(
  points: readonly RegressionPoint[],
  sigma2: number,
  priorVarSlope: number,
  priorMeanSlope = 0,
): RegressionPosterior {
  const yBar = mean(points.map((p) => p.y));
  const { xc } = centerX(points);
  const sxx = xc.reduce((acc, xi) => acc + xi * xi, 0);
  const sxy = xc.reduce((acc, xi, i) => acc + xi * (points[i].y - yBar), 0);
  const slopeOls = sxx > 0 ? sxy / sxx : 0;

  const dataPrecision = sigma2 > 0 ? sxx / sigma2 : 0;
  const priorPrecision = priorVarSlope > 0 ? 1 / priorVarSlope : 0;
  const denom = dataPrecision + priorPrecision;
  const slopeWeight = denom > 0 ? priorPrecision / denom : 0;
  const slopePosterior = precisionWeightedMean(slopeOls, dataPrecision, priorMeanSlope, priorPrecision);

  return {
    slopeOls,
    interceptOls: yBar,
    slopePosterior,
    interceptPosterior: yBar,
    slopeWeight,
    sxx,
  };
}

/** 回帰直線の予測値 y=β0+β1(x−x̄)（中心化済みの傾き・切片から元のxで評価する）。 */
export function predictCentered(x: number, xBar: number, intercept: number, slope: number): number {
  return intercept + slope * (x - xBar);
}

export const REGRESSION_TRUE_INTERCEPT = 50;
export const REGRESSION_TRUE_SLOPE = 3;
export const REGRESSION_NOISE_SD = 15;
export const REGRESSION_N = 8;
const REGRESSION_SEED = 20260726;

/** 小標本(既定n=8)・大きめのノイズで作る回帰データ——縮小の効果が見えやすい設定。 */
export function generateRegressionData(
  n: number = REGRESSION_N,
  seed: number = REGRESSION_SEED,
): RegressionPoint[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const x = i + 1;
    const y = REGRESSION_TRUE_INTERCEPT + REGRESSION_TRUE_SLOPE * x + scaledGaussian(rng, REGRESSION_NOISE_SD);
    return { x, y };
  });
}

export const DEFAULT_REGRESSION_DATA: RegressionPoint[] = generateRegressionData();

// ────────────────────────────────────────────────────────────
// 潜在変数モデル（2成分混合正規分布、クラス割当zの事後所属確率=responsibility）
// ────────────────────────────────────────────────────────────

export type MixtureComponent = { mu: number; sigma: number; weight: number };

export const DEFAULT_MIXTURE: readonly MixtureComponent[] = [
  { mu: 40, sigma: 8, weight: 0.5 },
  { mu: 75, sigma: 10, weight: 0.5 },
];

/**
 * 観測値 x が各成分から生成された事後確率（responsibility）を、ベイズの定理
 * P(z=k|x) ∝ π_k・N(x;μ_k,σ_k) で計算する。潜在変数 z（どちらの成分から生成されたか）は
 * 直接観測できないが、ベイズの定理で事後分布として推定できる、という最小の具体例。
 */
export function responsibility(x: number, components: readonly MixtureComponent[]): number[] {
  const weighted = components.map((c) => c.weight * normalPdf(x, c.mu, c.sigma));
  const total = weighted.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return components.map(() => 1 / components.length);
  return weighted.map((w) => w / total);
}

export type LatentPoint = { x: number; trueComponent: 0 | 1 };

const MIXTURE_SEED = 20260727;

/** 2成分混合正規分布から決定的にサンプルを生成する（trueComponentは学習者に見せる「答え合わせ」用）。 */
export function generateMixtureData(
  n = 14,
  components: readonly MixtureComponent[] = DEFAULT_MIXTURE,
  seed: number = MIXTURE_SEED,
): LatentPoint[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const z: 0 | 1 = rng() < components[0].weight ? 0 : 1;
    const c = components[z];
    const x = c.mu + scaledGaussian(rng, c.sigma);
    return { x, trueComponent: z };
  });
}

export const DEFAULT_MIXTURE_DATA: LatentPoint[] = generateMixtureData();
