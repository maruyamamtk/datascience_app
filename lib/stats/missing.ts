/**
 * 欠測値の処理（O-1）の計算層（純関数）。
 * 欠測のメカニズム（MCAR/MAR/MNAR）と、代表的な処理（完全ケース分析・平均代入・回帰代入）が
 * 推定（Y の平均・ばらつき）をどう歪める/回復するかを扱う。
 * 補助変数 X（完全観測）と結果 Y（一部欠測）を使い、«なぜ MAR では X を使う回帰代入が効くか» を体感させる。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。回帰は regression.ts の olsFit を再利用。
 */

import { olsFit, type Point } from "./regression";
import type { Rng } from "./random";

/** ボックス–ミュラー法で標準正規。 */
function gauss(rng: Rng): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** 欠測メカニズム。 */
export type Mechanism = "MCAR" | "MAR" | "MNAR";

/** 1個体：補助変数 x（常に観測）、真の y、観測できたか。 */
export type MissUnit = {
  x: number;
  /** 真の Y（神の視点。欠測でも «本当は» この値）。 */
  yTrue: number;
  /** 観測できたか（true=観測, false=欠測）。 */
  observed: boolean;
};

function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Number.NaN;
}
function sd(xs: readonly number[]): number {
  if (xs.length < 2) return Number.NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, v) => a + (v - m) ** 2, 0) / (xs.length - 1));
}

/**
 * 欠測データ生成。
 * - X〜N(0,1)（補助変数・常に観測）。Y=beta0+beta1·X+雑音（beta1>0 で X↑→Y↑）。
 * - 欠測確率 p は missRate を中心に、メカニズムで «何に依存するか» が変わる（強さ strength）：
 *   - MCAR: p=missRate（完全に偶然。X,Y と無関係）。
 *   - MAR : p=missRate+strength·z_X（観測変数 X に依存。X が大きいほど欠測しやすい）。
 *   - MNAR: p=missRate+strength·z_Y（欠測する Y 自身に依存。Y が大きいほど欠測しやすい）。
 *   z_X,z_Y は標準化値。p は [0.02,0.98] にクランプ。
 */
export function generateMissing(params: {
  n: number;
  beta0?: number;
  beta1?: number;
  noise?: number;
  mechanism: Mechanism;
  missRate: number;
  strength?: number;
  rng: Rng;
}): MissUnit[] {
  const { n, beta0 = 10, beta1 = 3, noise = 2, mechanism, missRate, strength = 0.25, rng } = params;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = gauss(rng);
    xs.push(x);
    ys.push(beta0 + beta1 * x + noise * gauss(rng));
  }
  const mx = mean(xs);
  const sx = sd(xs);
  const my = mean(ys);
  const sy = sd(ys);

  return xs.map((x, i) => {
    let p = missRate;
    if (mechanism === "MAR") p = missRate + strength * ((x - mx) / sx);
    else if (mechanism === "MNAR") p = missRate + strength * ((ys[i] - my) / sy);
    p = Math.min(0.98, Math.max(0.02, p));
    return { x, yTrue: ys[i], observed: rng() >= p };
  });
}

/** 推定の要約（Y の平均・標準偏差）。 */
export type Estimate = { mean: number; sd: number; label: string };

/** 神の視点：全データ（欠測なし）の真の平均・SD。 */
export function fullDataEstimate(units: readonly MissUnit[]): Estimate {
  const y = units.map((u) => u.yTrue);
  return { mean: mean(y), sd: sd(y), label: "真値（全データ）" };
}

/** 完全ケース分析：観測できた Y だけで平均・SD。MCAR では不偏、MAR/MNAR では偏る。 */
export function completeCaseEstimate(units: readonly MissUnit[]): Estimate {
  const y = units.filter((u) => u.observed).map((u) => u.yTrue);
  return { mean: mean(y), sd: sd(y), label: "完全ケース分析" };
}

/**
 * 平均代入：欠測を «観測 Y の平均» で埋める。
 * 平均は完全ケースと同じだが、埋めた値が全部同じなのでばらつき（SD）が人工的に縮む。
 */
export function meanImputationEstimate(units: readonly MissUnit[]): Estimate {
  const obs = units.filter((u) => u.observed).map((u) => u.yTrue);
  const fill = mean(obs);
  const filled = units.map((u) => (u.observed ? u.yTrue : fill));
  return { mean: mean(filled), sd: sd(filled), label: "平均代入" };
}

/**
 * 回帰代入：観測データで Y〜X を回帰し、欠測 Y を X から予測して埋める。
 * MAR（欠測が観測 X に依存）なら X を使うので平均のバイアスを大きく減らせる。
 * ただし予測値に雑音を足さないと、ばらつきはやや過小のまま。
 */
export function regressionImputationEstimate(units: readonly MissUnit[]): Estimate {
  const obs = units.filter((u) => u.observed);
  const points: Point[] = obs.map((u) => ({ x: u.x, y: u.yTrue }));
  const { slope, intercept } = olsFit(points);
  const filled = units.map((u) => (u.observed ? u.yTrue : intercept + slope * u.x));
  return { mean: mean(filled), sd: sd(filled), label: "回帰代入" };
}

/**
 * 確率的回帰代入：回帰予測に «残差の散らばり» を足して埋める。
 * 平均のバイアスを抑えつつ、ばらつき（SD）も真値に近づける（多重代入の1手の直感）。
 */
export function stochasticRegressionEstimate(units: readonly MissUnit[], rng: Rng): Estimate {
  const obs = units.filter((u) => u.observed);
  const points: Point[] = obs.map((u) => ({ x: u.x, y: u.yTrue }));
  const fit = olsFit(points);
  const resSd = sd(fit.residuals);
  const filled = units.map((u) =>
    u.observed ? u.yTrue : fit.intercept + fit.slope * u.x + resSd * gauss(rng),
  );
  return { mean: mean(filled), sd: sd(filled), label: "確率的回帰代入" };
}

/** 観測された割合（実際の欠測率の裏）。 */
export function observedFraction(units: readonly MissUnit[]): number {
  return units.filter((u) => u.observed).length / units.length;
}
