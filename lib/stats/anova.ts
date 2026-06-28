/**
 * 分散分析（G-1）トピックの計算層（純関数）。
 * 一元配置分散分析の «全変動 = 級間変動 + 級内変動» 分解と F 統計量・p 値を扱う。
 * 「群間の差は、群内のばらつきに比べて大きいか」を分散の比で判断する土台。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。F 分布密度は sampling-distributions を再利用。
 */

import { lnGamma } from "./continuous";

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** 一元配置分散分析の結果。 */
export type AnovaResult = {
  /** 総平均。 */
  grandMean: number;
  /** 級間変動（群平均の総平均からのずれ²×群サイズの和）。 */
  ssBetween: number;
  /** 級内変動（各値の群平均からのずれ²の和）。 */
  ssWithin: number;
  /** 全変動。 */
  ssTotal: number;
  /** 級間自由度 = 群数−1。 */
  dfBetween: number;
  /** 級内自由度 = 総数−群数。 */
  dfWithin: number;
  /** 級間平均平方 MS_between = SS_between/df_between。 */
  msBetween: number;
  /** 級内平均平方 MS_within = SS_within/df_within。 */
  msWithin: number;
  /** F 統計量 = MS_between/MS_within。 */
  F: number;
  /** 上側 p 値。 */
  p: number;
  /** 各群の平均。 */
  groupMeans: number[];
};

/**
 * 一元配置分散分析。複数群のデータから «全変動 = 級間 + 級内» を分解し F 統計量・p 値を返す。
 * 全変動 SS_total = Σ(yᵢ−ȳ)²、級間 SS_between = Σ nⱼ(ȳⱼ−ȳ)²、級内 SS_within = ΣΣ(yᵢⱼ−ȳⱼ)²。
 */
export function oneWayAnova(groups: readonly (readonly number[])[]): AnovaResult {
  const k = groups.length;
  const all = groups.flat();
  const N = all.length;
  const grandMean = mean(all);
  const groupMeans = groups.map((g) => mean(g));

  let ssBetween = 0;
  let ssWithin = 0;
  groups.forEach((g, j) => {
    ssBetween += g.length * (groupMeans[j] - grandMean) ** 2;
    g.forEach((y) => {
      ssWithin += (y - groupMeans[j]) ** 2;
    });
  });
  const ssTotal = ssBetween + ssWithin;

  const dfBetween = k - 1;
  const dfWithin = N - k;
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : Number.NaN;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : Number.NaN;
  const F = msWithin > 0 ? msBetween / msWithin : Number.POSITIVE_INFINITY;
  const p = fUpperTail(F, dfBetween, dfWithin);

  return {
    grandMean,
    ssBetween,
    ssWithin,
    ssTotal,
    dfBetween,
    dfWithin,
    msBetween,
    msWithin,
    F,
    p,
    groupMeans,
  };
}

/**
 * F 分布の上側確率 P(F_{d1,d2} ≥ x)。
 * F の CDF は正則化不完全ベータ関数 I_z(d1/2, d2/2)（z=d1·x/(d1·x+d2)）で閉形式に書ける。
 * 数値積分より堅牢（大きな x でも裾を正確に評価できる）。
 */
export function fUpperTail(x: number, d1: number, d2: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x <= 0) return 1;
  const z = (d1 * x) / (d1 * x + d2);
  const cdf = regularizedIncompleteBeta(z, d1 / 2, d2 / 2);
  return Math.min(1, Math.max(0, 1 - cdf));
}

/**
 * 正則化不完全ベータ関数 I_x(a,b)（連分数展開, Numerical Recipes betai 相当）。
 * F・t 分布の CDF やベータ分布の確率に使える汎用関数。0≤x≤1。
 */
export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lnGamma(a + b) - lnGamma(a) - lnGamma(b);
  const front = Math.exp(lbeta + a * Math.log(x) + b * Math.log(1 - x));
  // 収束が速い側を選ぶ（対称関係 I_x(a,b)=1−I_{1−x}(b,a)）。
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betacf(x, a, b)) / a;
  }
  return 1 - (front * betacf(1 - x, b, a)) / b;
}

/** ベータ連分数（Lentz のアルゴリズム）。 */
function betacf(x: number, a: number, b: number): number {
  const tiny = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return h;
}
