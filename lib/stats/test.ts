/**
 * 仮説検定（σ既知の母平均 z 検定）トピックの計算層（純関数）。
 * 検定統計量 Z=(x̄−μ0)/(σ/√n)・p値・棄却域の臨界値・第一種(α)/第二種(β)の過誤・検出力 1−β を
 * すべて副作用なしの純関数で提供する（CLAUDE.md §2「計算層は純関数」, Vitest 対象）。
 *
 * 標準正規の cdf Φ と分位点 Φ⁻¹ は正規分布／信頼区間と同じ `normal.ts` を再利用する
 * （実装の単一性・整合性）。可視化は H0:N(0,1) と H1:N(δ,1) を z スケールで重ね描きするため、
 * このファイルは σ をスケール 1 に正規化した「標準化スケール」で完結させる。
 */

import { standardNormalCdf, zQuantile } from "./normal";

/** 対立仮説の種別（両側 / 右片側 / 左片側）。 */
export type Alternative = "two-sided" | "greater" | "less";

/**
 * 仮説検定トピックの操作値（ユーザーが直接いじる single source of truth）。
 * 標準化スケールで扱うため σ・μ0 は陽に持たず、効果量 d=(μ1−μ0)/σ で H1 の位置を決める。
 */
export type HypothesisControls = {
  /** 効果量 d=(μ1−μ0)/σ（H0 と H1 の標準化距離。0 なら H1=H0）。 */
  effectSize: number;
  /** 標本サイズ n（>=1 を想定。大きいほど検出力は上がる）。 */
  n: number;
  /** 有意水準 α（0<α<1。第一種の過誤の許容確率。例 0.05）。 */
  alpha: number;
  /** 対立仮説の種別。 */
  alternative: Alternative;
};

/** 仮説検定トピックの派生値（controls から純関数で再計算。直接書き換えない）。 */
export type HypothesisDerived = {
  /** 非心度 δ=d√n（H1 側の検定統計量分布 N(δ,1) の中心。x̄=μ1 のときの代表的 Z 値）。 */
  delta: number;
  /** 棄却域の臨界値（両側は |z|>z_{1−α/2}、片側は z_{1−α} の大きさ）。 */
  critical: number;
  /** z=δ（H1 平均で観測した代表値）に対する p値。 */
  pValue: number;
  /** 検出力 1−β（H1 が真のとき正しく H0 を棄却する確率）。 */
  power: number;
  /** 第二種の過誤 β（H1 が真なのに H0 を棄却し損ねる確率）。 */
  beta: number;
};

/**
 * 検定統計量 z（と対立仮説）から p値を計算する純関数。
 * - greater（右片側）: P(Z≥z)=1−Φ(z)
 * - less（左片側）: P(Z≤z)=Φ(z)
 * - two-sided（両側）: 2·(1−Φ(|z|))
 */
export function pValue(z: number, alternative: Alternative): number {
  switch (alternative) {
    case "greater":
      return 1 - standardNormalCdf(z);
    case "less":
      return standardNormalCdf(z);
    case "two-sided":
      return 2 * (1 - standardNormalCdf(Math.abs(z)));
  }
}

/**
 * 有意水準 α・対立仮説に対する棄却域の臨界値（正の大きさ）。
 * - two-sided: z_{1−α/2}（例 α=0.05 → 1.96）。|z| がこれを超えたら棄却。
 * - 片側: z_{1−α}（例 α=0.05 → 1.645）。α∉(0,1) は NaN。
 */
export function criticalValue(alpha: number, alternative: Alternative): number {
  if (alpha <= 0 || alpha >= 1) return Number.NaN;
  return alternative === "two-sided" ? zQuantile(1 - alpha / 2) : zQuantile(1 - alpha);
}

/** z 検定の計算入力（観測した標本平均 x̄ から検定する）。 */
export type ZTestInput = {
  /** 観測した標本平均 x̄。 */
  mean: number;
  /** 帰無仮説の母平均 μ0。 */
  mu0: number;
  /** 母標準偏差 σ（既知）。 */
  sigma: number;
  /** 標本サイズ n。 */
  n: number;
  /** 有意水準 α。 */
  alpha: number;
  /** 対立仮説の種別。 */
  alternative: Alternative;
};

/** z 検定の結果。 */
export type ZTestResult = {
  /** 検定統計量 Z=(x̄−μ0)/(σ/√n)。 */
  z: number;
  /** p値。 */
  pValue: number;
  /** 棄却域の臨界値（正の大きさ）。 */
  critical: number;
  /** H0 を棄却するか（z が棄却域に入るか）。 */
  reject: boolean;
};

/**
 * σ既知の母平均 z 検定 H0:μ=μ0 を行う純関数。
 * 検定統計量 Z=(x̄−μ0)/(σ/√n) を作り、p値・臨界値・棄却判定を返す。
 * 棄却判定は棄却域（two-sided: |z|>c、greater: z>c、less: z<−c）で行い、p<α と等価。
 */
export function zTest({ mean, mu0, sigma, n, alpha, alternative }: ZTestInput): ZTestResult {
  const se = sigma / Math.sqrt(n);
  const z = (mean - mu0) / se;
  const critical = criticalValue(alpha, alternative);
  const p = pValue(z, alternative);
  let reject: boolean;
  switch (alternative) {
    case "greater":
      reject = z > critical;
      break;
    case "less":
      reject = z < -critical;
      break;
    case "two-sided":
      reject = Math.abs(z) > critical;
      break;
  }
  return { z, pValue: p, critical, reject };
}

/** 検出力計算の入力（効果量で H1 の位置を決める）。 */
export type PowerInput = {
  /** 効果量 d=(μ1−μ0)/σ。 */
  effectSize: number;
  /** 標本サイズ n。 */
  n: number;
  /** 有意水準 α。 */
  alpha: number;
  /** 対立仮説の種別。 */
  alternative: Alternative;
};

/**
 * 検出力 1−β を計算する純関数。
 * H1 が真のとき検定統計量は N(δ,1)（δ=d√n）に従う。棄却域に入る確率が検出力。
 * - greater: P(Z>c)=1−Φ(c−δ)
 * - less: P(Z<−c)=Φ(−c−δ)
 * - two-sided: P(Z>c)+P(Z<−c)=[1−Φ(c−δ)]+Φ(−c−δ)
 * α∉(0,1) は NaN。
 */
export function power({ effectSize, n, alpha, alternative }: PowerInput): number {
  const delta = effectSize * Math.sqrt(n);
  const c = criticalValue(alpha, alternative);
  if (!Number.isFinite(c)) return Number.NaN;
  switch (alternative) {
    case "greater":
      return 1 - standardNormalCdf(c - delta);
    case "less":
      return standardNormalCdf(-c - delta);
    case "two-sided":
      return 1 - standardNormalCdf(c - delta) + standardNormalCdf(-c - delta);
  }
}

/** 第二種の過誤 β=1−検出力。 */
export function betaError(input: PowerInput): number {
  return 1 - power(input);
}

/**
 * 操作値から派生値を導出する純関数。ストアの `derive` に渡す唯一の計算入口。
 * δ=d√n（H1 分布の中心 = x̄=μ1 で観測した代表的 Z 値）を軸に、臨界値・p値・検出力・β を返す。
 */
export function deriveTest({
  effectSize,
  n,
  alpha,
  alternative,
}: HypothesisControls): HypothesisDerived {
  const delta = effectSize * Math.sqrt(n);
  const critical = criticalValue(alpha, alternative);
  const pw = power({ effectSize, n, alpha, alternative });
  return {
    delta,
    critical,
    pValue: pValue(delta, alternative),
    power: pw,
    beta: 1 - pw,
  };
}
