/**
 * 生存時間解析（O-2）の計算層（純関数）。
 * «イベント（死亡・故障・解約）までの時間» を、途中で観測が終わる «打ち切り» を含めて扱う。
 * カプラン–マイヤー推定量（積・極限法）で生存関数 S(t)=P(T>t) を階段関数として推定し、
 * 生存中央値、真の指数生存との比較、2群のログランク検定までを提供する。
 *
 * 副作用を持たず Vitest で単体テスト可能（CLAUDE.md §2）。標準正規CDFは normal.ts を再利用。
 */

import { standardNormalCdf } from "./normal";
import type { Rng } from "./random";

/** 1個体の観測：観測時間と «イベント発生か打ち切りか»。 */
export type SurvObs = {
  /** 観測された時間（イベント or 打ち切りまで）。 */
  time: number;
  /** true=イベント発生（例：死亡）、false=打ち切り（追跡終了・脱落）。 */
  event: boolean;
};

/**
 * 生存データ生成。
 * - 真のイベント時刻 T〜指数分布(hazard)（ハザード一定）。中央値は ln2/hazard。
 * - 打ち切り時刻 C〜指数分布(censorRate)。observed=min(T,C)、event=（T≤C かつ T≤maxTime）。
 * - maxTime を超えたら管理的打ち切り（研究終了）。
 */
export function generateSurvival(params: {
  n: number;
  hazard: number;
  censorRate: number;
  maxTime?: number;
  rng: Rng;
}): SurvObs[] {
  const { n, hazard, censorRate, maxTime = Infinity, rng } = params;
  const out: SurvObs[] = [];
  for (let i = 0; i < n; i++) {
    const t = -Math.log(Math.max(1e-12, rng())) / hazard;
    const c = censorRate > 0 ? -Math.log(Math.max(1e-12, rng())) / censorRate : Infinity;
    const admin = Math.min(c, maxTime);
    if (t <= admin) out.push({ time: t, event: true });
    else out.push({ time: admin, event: false });
  }
  return out;
}

/** カプラン–マイヤーの1ステップ（1つのイベント時刻）。 */
export type KMStep = {
  /** イベント時刻。 */
  time: number;
  /** その直前のリスク集合の大きさ n_i（time 以上の個体数）。 */
  atRisk: number;
  /** その時刻のイベント数 d_i。 */
  events: number;
  /** その時刻の打ち切り数（表示用）。 */
  censored: number;
  /** そのステップ後の生存確率 S(t)=Π(1−d_i/n_i)。 */
  survival: number;
};

/**
 * カプラン–マイヤー推定量（積・極限法）。
 * 各イベント時刻 t_i で、直前のリスク集合 n_i と イベント数 d_i から S を Π(1−d_i/n_i) で更新。
 * 打ち切りはリスク集合を減らすだけで «段差» は作らない。返すのはイベント時刻ごとのステップ列。
 */
export function kaplanMeier(obs: readonly SurvObs[]): KMStep[] {
  const sorted = [...obs].sort((a, b) => a.time - b.time);
  const n = sorted.length;
  // 距離ごとに events / censored を集計。
  const times = [...new Set(sorted.map((o) => o.time))].sort((a, b) => a - b);
  const steps: KMStep[] = [];
  let survival = 1;
  for (const t of times) {
    const atRisk = sorted.filter((o) => o.time >= t).length;
    const events = sorted.filter((o) => o.time === t && o.event).length;
    const censored = sorted.filter((o) => o.time === t && !o.event).length;
    if (events > 0 && atRisk > 0) {
      survival *= 1 - events / atRisk;
      steps.push({ time: t, atRisk, events, censored, survival });
    }
  }
  void n;
  return steps;
}

/** 生存中央値：S(t) が初めて 0.5 以下になるイベント時刻。届かなければ NaN（未到達）。 */
export function medianSurvival(steps: readonly KMStep[]): number {
  for (const s of steps) {
    if (s.survival <= 0.5) return s.time;
  }
  return Number.NaN;
}

/** ステップ列から時刻 t での KM 生存確率 S(t)（右連続の階段）。 */
export function survivalAt(steps: readonly KMStep[], t: number): number {
  let s = 1;
  for (const step of steps) {
    if (step.time <= t) s = step.survival;
    else break;
  }
  return s;
}

/** 真の指数生存関数 S(t)=exp(−hazard·t)（比較用の理論値）。 */
export function trueExponentialSurvival(t: number, hazard: number): number {
  return Math.exp(-hazard * t);
}

/**
 * ログランク検定（2群の生存曲線の差）。
 * 各イベント時刻で «群Aのイベント期待数 E=d·(nA/n)» と «分散（超幾何）» を積み上げ、
 * χ²=(OA−EA)²/Var（自由度1）で検定。帰無仮説：2群の生存分布は同じ。
 */
export function logRankTest(
  groupA: readonly SurvObs[],
  groupB: readonly SurvObs[],
): { chi2: number; pValue: number; observedA: number; expectedA: number } {
  const all = [...groupA, ...groupB];
  const eventTimes = [...new Set(all.filter((o) => o.event).map((o) => o.time))].sort((a, b) => a - b);
  let observedA = 0;
  let expectedA = 0;
  let variance = 0;
  for (const t of eventTimes) {
    const nA = groupA.filter((o) => o.time >= t).length;
    const nB = groupB.filter((o) => o.time >= t).length;
    const n = nA + nB;
    const dA = groupA.filter((o) => o.time === t && o.event).length;
    const dB = groupB.filter((o) => o.time === t && o.event).length;
    const d = dA + dB;
    if (n <= 1 || d === 0) continue;
    observedA += dA;
    expectedA += (d * nA) / n;
    // 超幾何分布の分散。
    variance += (d * (nA / n) * (nB / n) * (n - d)) / (n - 1);
  }
  const chi2 = variance > 0 ? (observedA - expectedA) ** 2 / variance : 0;
  // 自由度1のχ²のp値 = 2(1−Φ(√χ²))。
  const pValue = 2 * (1 - standardNormalCdf(Math.sqrt(chi2)));
  return { chi2, pValue, observedA, expectedA };
}

/** 打ち切りの割合。 */
export function censoredFraction(obs: readonly SurvObs[]): number {
  return obs.length ? obs.filter((o) => !o.event).length / obs.length : Number.NaN;
}
