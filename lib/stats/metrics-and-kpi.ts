/**
 * 評価指標とKPI設計（J-1）の計算層（純関数・副作用なし・Vitest 対象）。
 *
 * 題材は2つ:
 * 1) **技術指標とビジネスKPIの乖離**: ECサイトの休眠ユーザーへのクーポン施策を例に、
 *    «陽性らしさスコア» に対する分類しきい値を動かすと、正解率（accuracy, 技術指標）を
 *    最大化するしきい値と、コスト・収益を反映した期待ビジネスインパクト（KPI）を最大化する
 *    しきい値が **一致しない** ことを示す（詳細_第1章_評価指標とKPI §1.6 のクーポン施策の例）。
 *    - TP（送って買った）: 純利益 revenueTP
 *    - FP（送ったが買わなかった）: クーポンが無駄になったコスト costFP
 *    - FN（送らなかったが本当は買った）: 見逃した機会損失 costFN
 *    - TN（送らず、実際買わなかった）: 0
 * 2) **KPIの分解**: 売上 = トラフィック × 転換率 × 客単価（付録A.2）のような乗法分解で、
 *    どの要素を何%改善すれば売上が何%動くかを見る（乗法分解では、単一要素への相対%変化は
 *    そのまま売上の同じ相対%変化になる——«どの要素でも%インパクトは対称» という性質）。
 *
 * 乱数は決定的な整数演算 LCG（tasks/lessons.md の教訓・imbalanced-anomaly.ts と同じ方式）。
 */

// ────────────────────────────────────────────────────────────
// 決定的乱数（整数演算だけの LCG。SSR とブラウザで結果がぶれない）
// ────────────────────────────────────────────────────────────

/** 決定的な線形合同法（整数演算だけなので SSR とブラウザで結果がぶれない）。 */
export function makeLcg(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** 一様乱数3個の和−1.5 で近似ガウス（Irwin–Hall、超越関数を使わず決定的）。 */
export function pseudoGaussian(rng: () => number): number {
  return rng() + rng() + rng() - 1.5;
}

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

// ────────────────────────────────────────────────────────────
// 顧客データ（休眠ユーザーへのクーポン施策）
// ────────────────────────────────────────────────────────────

export type Customer = {
  /** 真の «反応しやすさ»（潜在変数, 観測不可）。 */
  quality: number;
  /** 真のラベル: 1 = クーポンを送れば購入する, 0 = 購入しない。 */
  label: 0 | 1;
  /** モデルが出す «陽性らしさ» スコア（0〜1, quality を反映するがノイズを含む）。 */
  score: number;
};

export const N_CUSTOMERS = 60;

/**
 * 休眠ユーザー N_CUSTOMERS 人を決定的に生成する。真の反応しやすさ quality に
 * ノイズを加えた閾値判定で真のラベルを決め、モデルスコアは quality をさらにノイズを
 * 加えて観測した«予測»として作る——完全一致ではないため、しきい値を動かすと
 * 混同行列の4象限すべてが現れる。
 */
export function generateCustomers(seed: number): Customer[] {
  const rng = makeLcg(seed);
  const customers: Customer[] = [];
  for (let i = 0; i < N_CUSTOMERS; i++) {
    const quality = clamp01(rng());
    const label: 0 | 1 = quality + 0.3 * pseudoGaussian(rng) > 0.5 ? 1 : 0;
    const score = clamp01(quality + 0.22 * pseudoGaussian(rng));
    customers.push({ quality, label, score });
  }
  return customers;
}

// ────────────────────────────────────────────────────────────
// 混同行列・正解率・期待ビジネスインパクト
// ────────────────────────────────────────────────────────────

export type ConfusionCounts = { tp: number; fp: number; tn: number; fn: number };

/** しきい値でスコアを二値分類する。 */
export function classifyByThreshold(score: number, threshold: number): 0 | 1 {
  return score >= threshold ? 1 : 0;
}

/** しきい値を適用したときの混同行列。 */
export function confusionAt(customers: readonly Customer[], threshold: number): ConfusionCounts {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const c of customers) {
    const pred = classifyByThreshold(c.score, threshold);
    if (c.label === 1 && pred === 1) tp++;
    else if (c.label === 0 && pred === 1) fp++;
    else if (c.label === 0 && pred === 0) tn++;
    else fn++;
  }
  return { tp, fp, tn, fn };
}

/** 正解率（技術指標）。 */
export function accuracyOf(counts: ConfusionCounts): number {
  const total = counts.tp + counts.fp + counts.tn + counts.fn;
  return total > 0 ? (counts.tp + counts.tn) / total : 0;
}

/**
 * 期待ビジネスインパクト（KPI）＝ TP×revenueTP − FP×costFP − FN×costFN（TN=0）。
 * revenueTP はクーポン送付＋購入のときの純利益（売上−クーポン原価）、costFP は購入しなかった
 * 相手に送った分の無駄コスト、costFN は «送っていれば買っていた» 相手を逃した機会損失。
 */
export function businessValueOf(counts: ConfusionCounts, revenueTP: number, costFP: number, costFN: number): number {
  return counts.tp * revenueTP - counts.fp * costFP - counts.fn * costFN;
}

export type ThresholdPoint = { threshold: number; accuracy: number; businessValue: number };

export const THRESHOLD_STEPS = 41;

/** しきい値 0..1 を等間隔にスイープし、各しきい値での正解率と期待ビジネスインパクトを並べる。 */
export function sweepThresholds(
  customers: readonly Customer[],
  revenueTP: number,
  costFP: number,
  costFN: number,
  steps: number = THRESHOLD_STEPS,
): ThresholdPoint[] {
  const points: ThresholdPoint[] = [];
  const n = Math.max(2, Math.floor(steps));
  for (let i = 0; i < n; i++) {
    const threshold = i / (n - 1);
    const counts = confusionAt(customers, threshold);
    points.push({ threshold, accuracy: accuracyOf(counts), businessValue: businessValueOf(counts, revenueTP, costFP, costFN) });
  }
  return points;
}

/** 配列中で keyFn が最大になる要素の index（同値なら最初の要素）。空配列は 0 を返す。 */
export function argmaxIndex<T>(items: readonly T[], keyFn: (item: T) => number): number {
  let bestIdx = 0;
  let bestVal = Number.NEGATIVE_INFINITY;
  items.forEach((item, i) => {
    const v = keyFn(item);
    if (v > bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  });
  return bestIdx;
}

/** 曲線を min-max 正規化して 0..1 に揃える（比較チャート表示用）。全要素が同値なら 0.5 を返す。 */
export function normalizeToUnit(values: readonly number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 1e-9) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

// ────────────────────────────────────────────────────────────
// KPI の分解（売上 = トラフィック × 転換率 × 客単価）
// ────────────────────────────────────────────────────────────

export type RevenueFactors = { traffic: number; conversionRate: number; aov: number };

/** 売上 = トラフィック × 転換率 × 客単価（付録A.2 の乗法分解）。 */
export function decomposeRevenue(f: RevenueFactors): number {
  return f.traffic * f.conversionRate * f.aov;
}

export type FactorKey = "traffic" | "conversionRate" | "aov";

export type FactorSensitivity = {
  factor: FactorKey;
  before: number;
  after: number;
  revenueBefore: number;
  revenueAfter: number;
  /** 売上の相対変化（%）。乗法分解では単一要素の相対変化 deltaPct と厳密に一致する。 */
  revenueDeltaPct: number;
};

/**
 * ある要素だけを相対 deltaPct(%) だけ動かしたときの売上感応度。
 * 売上=トラフィック×転換率×客単価という «掛け算» の構造上、他の2要素を固定して
 * 1要素だけを (1+deltaPct/100) 倍すると、売上もちょうど (1+deltaPct/100) 倍になる
 * ——«どの要素に注力しても同じ%改善なら売上への%インパクトは対称» という KPI 分解の性質。
 */
export function factorSensitivity(f: RevenueFactors, factor: FactorKey, deltaPct: number): FactorSensitivity {
  const before = f[factor];
  const after = before * (1 + deltaPct / 100);
  const revenueBefore = decomposeRevenue(f);
  const revenueAfter = decomposeRevenue({ ...f, [factor]: after });
  const revenueDeltaPct = revenueBefore > 0 ? ((revenueAfter - revenueBefore) / revenueBefore) * 100 : 0;
  return { factor, before, after, revenueBefore, revenueAfter, revenueDeltaPct };
}
