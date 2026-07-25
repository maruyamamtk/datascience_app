/**
 * ベイズ計算法（K-2, MCMC）の計算層（純関数・副作用なし・Vitest 対象）。
 *
 * 扱う道具（SPEC §3 K-2「ギブスサンプリング、Metropolis-Hastings法、MCMC、
 * PyMC・収束診断(ArviZ)」出典: 『Pythonでスラスラわかるベイズ推論「超」入門』第4-5章）:
 *
 * - [ベイズ統計の基礎](bayesian-basics)（K-1）は共役事前分布があるため事後分布 Beta(α,β) が
 *   «解析的に» 求まった。本トピックは «共役性が無い一般のモデルでは事後分布の正規化定数
 *   （分母の積分）を解析的に求められないことが多い» という発展的な立ち位置から出発し、
 *   K-1 と **同じ Beta(6,6) 事後分布**（コイン投げ5勝5敗+一様事前分布 Beta(1,1) の結果）を
 *   «正規化定数を知らないふりをして» MCMC で近似する——既に答えを知っている題材だから、
 *   MCMC が本当に正しい分布を復元できているかを直接比較検証できる。
 * - **Metropolis-Hastings 法**: 現在地から提案分布（ランダムウォーク）で次の候補を作り、
 *   目標分布の«比»（正規化定数が約分されて消える）だけで受理確率を決め、確率的に受理/棄却する。
 * - **ギブスサンプリング**: 多変量の場合に、各変数を «他を固定した条件付き分布» から順番に
 *   サンプリングする。[モンテカルロ・ブートストラップ](monte-carlo-methods)の前提である
 *   [マルコフ連鎖](markov-chains)の定常分布の考え方をそのまま使う。2変量正規分布は条件付き分布が
 *   解析的に正規分布として求まる（教科書的な具体例）。
 * - **収束診断**: 分割 R-hat（チェーンを前半・後半に分け、チェーン間分散とチェーン内分散を比較）、
 *   有効サンプルサイズ（自己相関が高いほど「実質的に効いている」独立標本数は減る）。
 *
 * 乱数は決定的な整数演算 LCG 相当の mulberry32（lib/stats/random.ts、Math.imul のみで
 * 超越関数を使わない）に閉じ、ガウス風ノイズは Box–Muller ではなく «一様乱数3個の和−1.5»
 * （Irwin–Hall近似, 他トピックと同じ方式）で作る。SSR とブラウザで結果がぶれない
 * （tasks/lessons.md «擬似乱数データは整数演算だけの決定的LCGで生成する» の教訓）。
 */

import { mean, sampleStd } from "./monte-carlo";
import { acf } from "./time-series";

export type Rng = () => number;

// ────────────────────────────────────────────────────────────
// 決定的な擬似ガウス乱数（提案分布・条件付き分布のノイズに使う）
// ────────────────────────────────────────────────────────────

/**
 * 一様乱数3個の和−1.5 で近似ガウス（Irwin–Hall、超越関数を使わず決定的）。
 * 平均0・標準偏差 √(3·(1/12)) = 0.5 の近似正規分布になる。
 */
export function pseudoGaussian(rng: Rng): number {
  return rng() + rng() + rng() - 1.5;
}

/** pseudoGaussian（sd=0.5基準）を任意の標準偏差 sd にスケールする。sd<=0 は常に0を返す。 */
export function scaledGaussian(rng: Rng, sd: number): number {
  if (sd <= 0) return 0;
  return pseudoGaussian(rng) * (sd / 0.5);
}

// ────────────────────────────────────────────────────────────
// Metropolis-Hastings 法（1次元、Beta(α,β) 事後分布の核をターゲットにする）
// ────────────────────────────────────────────────────────────

export type BetaParams = { alpha: number; beta: number };

/**
 * Beta(α,β) 事後分布の核（正規化定数 B(α,β) を無視した密度そのもの）。定義域外(0,1)は0。
 * Metropolis-Hastings の受理確率は «比» なので、この正規化されていない核だけで計算できる
 * ——これが MCMC の核心（正規化定数を求めなくてよい）。
 *
 * 描画層（lib/store/mcmc-methods.ts）は数値を曲線の高さと一致させるため正規化済みの
 * betaPdf（continuous.ts）を使うが、受理判定はどちらを使っても数学的に同一になる。
 * この関数はその主張を直接テストする用（本ファイルの test「正規化定数の有無に関わらず
 * 受理判定は完全に一致する」参照）に残している——呼び出し側が本体側に見当たらないのは
 * 意図通りで、デッドコードではない。
 */
export function betaTargetKernel(theta: number, p: BetaParams): number {
  if (theta <= 0 || theta >= 1) return 0;
  return theta ** (p.alpha - 1) * (1 - theta) ** (p.beta - 1);
}

/** Metropolis-Hastings の1ステップ（提案→受理確率→受理/棄却）の記録。 */
export type MhStep = {
  /** 1始まりのステップ番号。 */
  index: number;
  /** ステップ前の現在地。 */
  current: number;
  /** 提案分布から生成した候補。 */
  proposed: number;
  /** 受理確率 min(1, target(proposed)/target(current))。 */
  acceptRatio: number;
  /** 受理判定に使った一様乱数 u（u < acceptRatio なら受理）。 */
  u: number;
  /** 受理したか。 */
  accepted: boolean;
  /** このステップ後の状態（受理なら proposed、棄却なら current のまま）。 */
  next: number;
};

/**
 * Metropolis-Hastings の1ステップ。対称なランダムウォーク提案（正規近似）を使うため、
 * 提案分布の比は打ち消し合い、受理確率は目標分布の比 min(1, π(x')/π(x)) だけで決まる
 * （詳細釣り合いを満たす最も単純な選び方）。
 */
export function metropolisHastingsStep(
  index: number,
  current: number,
  targetDensity: (x: number) => number,
  proposalSd: number,
  rng: Rng,
): MhStep {
  const proposed = current + scaledGaussian(rng, proposalSd);
  const pCurrent = targetDensity(current);
  const pProposed = targetDensity(proposed);
  const acceptRatio = pCurrent <= 0 ? (pProposed > 0 ? 1 : 0) : Math.min(1, pProposed / pCurrent);
  const u = rng();
  const accepted = u < acceptRatio;
  return { index, current, proposed, acceptRatio, u, accepted, next: accepted ? proposed : current };
}

/** Metropolis-Hastings のチェーンを nSteps 分まとめて生成する。 */
export function metropolisHastingsChain(
  x0: number,
  targetDensity: (x: number) => number,
  proposalSd: number,
  nSteps: number,
  rng: Rng,
): MhStep[] {
  const steps: MhStep[] = [];
  let x = x0;
  for (let i = 0; i < nSteps; i++) {
    const step = metropolisHastingsStep(i + 1, x, targetDensity, proposalSd, rng);
    steps.push(step);
    x = step.next;
  }
  return steps;
}

/** チェーンの受理率（受理ステップ数 / 総ステップ数）。 */
export function mhAcceptanceRate(steps: readonly MhStep[]): number {
  if (steps.length === 0) return 0;
  return steps.filter((s) => s.accepted).length / steps.length;
}

/** チェーンから「各ステップ後の状態」だけを取り出した標本列。 */
export function mhSamples(steps: readonly MhStep[]): number[] {
  return steps.map((s) => s.next);
}

// ────────────────────────────────────────────────────────────
// ギブスサンプリング（2変量正規分布、条件付き分布が解析的に求まる例）
// ────────────────────────────────────────────────────────────

export type GibbsPoint = { x: number; y: number };

/** ギブスサンプリングの半ステップ（x または y のどちらか一方だけを更新する）。 */
export type GibbsHalfStep = {
  /** 0始まりの半ステップ通し番号。 */
  index: number;
  /** 1始まりの「スイープ」番号（x更新+y更新で1スイープ）。 */
  sweep: number;
  /** このステップで更新した変数。 */
  updated: "x" | "y";
  before: GibbsPoint;
  after: GibbsPoint;
};

/**
 * 相関係数 ρ・標準正規周辺分布を持つ2変量正規分布の条件付き標準偏差 √(1−ρ²)。
 * X|Y=y ~ N(ρy, 1−ρ²)、Y|X=x ~ N(ρx, 1−ρ²) —— 相関があるほど条件付き分布は「痩せる」。
 */
export function gibbsConditionalSd(rho: number): number {
  return Math.sqrt(Math.max(0, 1 - rho * rho));
}

/**
 * ギブスサンプリングのチェーンを nSweeps スイープ分（= 2·nSweeps 半ステップ）生成する。
 * 各スイープは「yを固定してxを条件付き分布から更新→更新後のxを固定してyを更新」の順。
 * 条件付き分布から直接サンプリングするため、Metropolis-Hastingsと違い**常に受理**される
 * （棄却という概念がない）。
 */
export function gibbsChain(
  start: GibbsPoint,
  rho: number,
  nSweeps: number,
  rng: Rng,
): GibbsHalfStep[] {
  const condSd = gibbsConditionalSd(rho);
  const steps: GibbsHalfStep[] = [];
  let current = start;
  for (let sweep = 1; sweep <= nSweeps; sweep++) {
    const beforeX = current;
    const newX = rho * current.y + scaledGaussian(rng, condSd);
    const afterX: GibbsPoint = { x: newX, y: current.y };
    steps.push({ index: steps.length, sweep, updated: "x", before: beforeX, after: afterX });

    const beforeY = afterX;
    const newY = rho * afterX.x + scaledGaussian(rng, condSd);
    const afterY: GibbsPoint = { x: afterX.x, y: newY };
    steps.push({ index: steps.length, sweep, updated: "y", before: beforeY, after: afterY });

    current = afterY;
  }
  return steps;
}

/** 半ステップ列から、各スイープ終了時点（y更新後）の点だけを取り出す。 */
export function gibbsSweepPoints(steps: readonly GibbsHalfStep[]): GibbsPoint[] {
  return steps.filter((s) => s.updated === "y").map((s) => s.after);
}

// ────────────────────────────────────────────────────────────
// 収束診断（分割R-hat・有効サンプルサイズ）
// ────────────────────────────────────────────────────────────

/**
 * 簡易 split R-hat（Gelman-Rubin統計量の2分割版）。
 * チェーンを前半・後半の2本とみなし、チェーン間分散B・チェーン内分散Wを比較する。
 * 1.0に近いほど「前半と後半が同じ分布から来ている」＝収束の目安。1.01以下が実務の目安。
 * 長さ不足（前後半とも2点未満）は NaN。
 */
export function splitRhat(chain: readonly number[]): number {
  const half = Math.floor(chain.length / 2);
  if (half < 2) return Number.NaN;
  const chains = [chain.slice(0, half), chain.slice(chain.length - half)];
  const means = chains.map((c) => mean(c));
  const grandMean = mean(means);
  const n = half;
  const m = chains.length;
  const between = (n / (m - 1)) * means.reduce((acc, mu) => acc + (mu - grandMean) ** 2, 0);
  const within = mean(chains.map((c) => sampleStd(c) ** 2));
  if (!(within > 0)) return Number.NaN;
  const varHat = ((n - 1) / n) * within + between / n;
  return Math.sqrt(varHat / within);
}

/**
 * 自己相関の和から有効サンプルサイズ（ESS）を近似する簡易版：
 * ESS ≈ n / (1 + 2·Σ_{k≥1} ρ(k))、和は ρ(k) が最初に負になるところで打ち切る
 * （Geyerの初期正系列の考え方の簡略版）。自己相関が強いほど ESS は n より小さくなる
 * ——「n本サンプルを引いたが、実質的に独立な情報量はそれより少ない」ことを表す。
 */
export function effectiveSampleSize(chain: readonly number[], maxLag: number): number {
  const n = chain.length;
  if (n < 2) return n;
  const lag = Math.min(maxLag, n - 1);
  const values = acf(chain, lag); // values[0] === 1
  let sum = 0;
  for (let k = 1; k < values.length; k++) {
    if (values[k] < 0) break;
    sum += values[k];
  }
  const denom = 1 + 2 * sum;
  return denom > 0 ? n / denom : n;
}

/** チェーンの先頭 n 個（バーンイン期間）を捨てる。n がチェーン長を超えれば空配列。 */
export function dropBurnIn<T>(chain: readonly T[], n: number): T[] {
  return chain.slice(Math.min(Math.max(0, Math.floor(n)), chain.length));
}
