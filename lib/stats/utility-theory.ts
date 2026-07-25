/**
 * 効用理論(P-4)の計算層(純関数・副作用なし・Vitest対象)。
 *
 * 扱う道具(SPEC §3 P-4「vNM定理、リスク態度、確実同値額・リスクプレミアム」
 * 出典: 『意思決定分析と予測の活用』第4部「効用理論入門」):
 *
 * - **サンクトペテルブルクのパラドックス**: 「初めて表が出るまでコインを投げ続け、n回目で表が
 *   出たら $2^n$ 円もらえる」くじの期待金額は無限大に発散するが、多くの人は有限の金額しか
 *   払わない——期待金額を意思決定の指標とすることの限界を示す古典的問題(第1章)。
 *   $u(x)=\log_2 x$ のような効用関数を導入すると期待"効用"は有限値(=2)に収束し、
 *   パラドックスが解消する(第1章の解決例をそのまま実装する)。
 * - **vNMの定理**: 完備性・推移性・連続性・独立性の4公理を満たす選好関係が存在すれば、
 *   期待効用 $E[u(X)]$ を最大化する効用関数 $u$ が存在する(第1章の表)。
 * - **リスク態度の3分類**: 効用関数が凹(concave)ならリスク回避的、線形ならリスク中立、
 *   凸(convex)ならリスク受容的(第2章の表)。判定は2階の凹凸(高校数学の「上に凸/下に凸」)による。
 * - **確実同値額(CE)**: くじと無差別な確実な金額。$CE=u^{-1}(E[u(\tilde X)])$(第2章)。
 * - **リスクプレミアム**: $\mathrm{RP}=E[\tilde X]-CE$。リスク回避的な人は正になる(第2章)。
 * - **期待金額 vs 期待効用**: 期待金額最大化は「リスク中立」を仮定した特殊ケース。
 *   リスク回避的な意思決定者では、期待金額(ESV)が最大の行動と期待効用(EU)が最大の行動が
 *   食い違うことがある——本ファイルの `compareEvAndEuDecisions` で
 *   [決定分析](decision-analysis.ts)(P-1)の工場稼働の利得行列を使って具体的に示す。
 *
 * 効用関数の実装(第2章のPython例 `u(x)=1-e^{-αx}` に対応):
 * 生の $1-e^{-\alpha x}$ は $\alpha\to0$ で恒等的に $0$ に潰れて「リスク中立(直線 $u(x)=x$)」と
 * 連続的につながらない。vNMの効用関数は正のアフィン変換で不変(カーディナルな尺度)なので、
 * $\alpha$ で割った正規化形 $u(x;\alpha)=\dfrac{1-e^{-\alpha x}}{\alpha}$(標準的なCARA効用の
 * 正規化形、$\alpha\to0$ の極限で $u(x;\alpha)\to x$)を採用する——意思決定(CE・リスクプレミアム・
 * どの行動を選ぶか)への影響はBookmemoの生の式と完全に同じで、$\alpha=0$(リスク中立)を
 * スライダーで連続的に含められる形。$\alpha>0$ で凹(リスク回避)・$\alpha=0$ で線形(リスク中立)・
 * $\alpha<0$ で凸(リスク受容)になる(CARA: Constant Absolute Risk Aversion)。
 *
 * データは乱数を使わず固定の小さな具体例(工場稼働の利得行列、サンクトペテルブルクの整数n)に
 * するためSSR/CSRのハイドレーション不一致の心配は生じない。
 */

import {
  expectedValueCriterion,
  type CriterionResult,
  type PayoffMatrix,
} from "./decision-analysis";

// ────────────────────────────────────────────────────────────
// 効用関数
// ────────────────────────────────────────────────────────────

/**
 * CARA(Constant Absolute Risk Aversion)効用関数の正規化形。
 * α>0: 凹関数(リスク回避的)。α=0: 直線 u(x)=x(リスク中立)。α<0: 凸関数(リスク受容的)。
 * α→0 の極限で (1-e^{-αx})/α → x になるため、α=0 で場合分けして連続につなぐ。
 */
export function utilityCara(x: number, alpha: number): number {
  if (alpha === 0) return x;
  return (1 - Math.exp(-alpha * x)) / alpha;
}

/**
 * √x 型の効用関数(第2章の一般的な凹関数の例)。x<0 は定義域外なので 0 に丸める
 * (このトピックの主要な例は工場稼働の利得行列で負の利得もあるため、CARAを主に使う。
 * √x はCE/リスクプレミアムの数値探索(certaintyEquivalentBisection)のテスト用に用意する)。
 */
export function utilitySqrt(x: number): number {
  return Math.sqrt(Math.max(0, x));
}

/** 直線(リスク中立)の効用関数。u(x)=x。CARAのα=0の場合と一致する。 */
export function utilityLinear(x: number): number {
  return x;
}

export type RiskAttitude = "risk-averse" | "risk-neutral" | "risk-loving";

/**
 * CARA効用のαの符号からリスク態度を判定する(α>0:リスク回避的、α=0:リスク中立、α<0:リスク受容的)。
 */
export function classifyRiskAttitudeFromAlpha(alpha: number, epsilon = 1e-9): RiskAttitude {
  if (Math.abs(alpha) < epsilon) return "risk-neutral";
  return alpha > 0 ? "risk-averse" : "risk-loving";
}

export type ConcavityProbe = {
  /** 2点の中点(入力側)。 */
  midpointInput: number;
  /** 中点における効用 u((x1+x2)/2)。 */
  utilityOfMidpoint: number;
  /** 両端の効用の平均 (u(x1)+u(x2))/2。 */
  averageOfEndpointUtilities: number;
  /** 中点の効用と両端の平均の差(正なら上に凸=凹関数)。 */
  gap: number;
  classification: RiskAttitude;
};

/**
 * 効用関数の凹凸を、2点 x1・x2 の「中点での効用」と「両端の効用の平均」を比べる数値的な検査で判定する
 * (高校数学の「上に凸/下に凸」の定義そのもの: 弦が曲線の下にあれば上に凸=凹関数)。
 * gap = u(中点) − (u(x1)+u(x2))/2 が正なら凹(リスク回避的)、0なら線形(リスク中立)、負なら凸(リスク受容的)。
 */
export function concavityProbe(u: (x: number) => number, x1: number, x2: number): ConcavityProbe {
  const midpointInput = (x1 + x2) / 2;
  const utilityOfMidpoint = u(midpointInput);
  const averageOfEndpointUtilities = (u(x1) + u(x2)) / 2;
  const gap = utilityOfMidpoint - averageOfEndpointUtilities;
  const epsilon = 1e-9;
  const classification: RiskAttitude =
    Math.abs(gap) < epsilon ? "risk-neutral" : gap > 0 ? "risk-averse" : "risk-loving";
  return { midpointInput, utilityOfMidpoint, averageOfEndpointUtilities, gap, classification };
}

// ────────────────────────────────────────────────────────────
// 期待金額・期待効用・確実同値額・リスクプレミアム
// ────────────────────────────────────────────────────────────

/** 期待金額 E[X]=Σ x・P(x)(高校数学の加重平均そのもの)。 */
export function expectedValue(
  outcomes: readonly number[],
  probabilities: readonly number[],
): number {
  if (outcomes.length !== probabilities.length) {
    throw new Error("outcomes と probabilities の長さは一致させる必要がある");
  }
  return outcomes.reduce((sum, x, i) => sum + x * probabilities[i], 0);
}

/** 期待効用 E[u(X)]=Σ u(x)・P(x)。期待値の定義の x を u(x) に置き換えるだけ。 */
export function expectedUtility(
  outcomes: readonly number[],
  probabilities: readonly number[],
  u: (x: number) => number,
): number {
  if (outcomes.length !== probabilities.length) {
    throw new Error("outcomes と probabilities の長さは一致させる必要がある");
  }
  return outcomes.reduce((sum, x, i) => sum + u(x) * probabilities[i], 0);
}

/**
 * 確実同値額 CE = u^{-1}(E[u(X)])(CARA効用の閉形式の逆関数を使う版)。
 * u(x;α)=(1-e^{-αx})/α の逆関数は u^{-1}(y)=-ln(1-αy)/α(α=0のときはCE=E[u(X)]=E[X])。
 */
export function certaintyEquivalentCara(
  outcomes: readonly number[],
  probabilities: readonly number[],
  alpha: number,
): number {
  const eu = expectedUtility(outcomes, probabilities, (x) => utilityCara(x, alpha));
  if (alpha === 0) return eu;
  const inside = 1 - alpha * eu;
  if (inside <= 0) {
    throw new Error("CARA効用の逆関数の定義域外(αとE[u(X)]の組み合わせが不正)");
  }
  return -Math.log(inside) / alpha;
}

/**
 * 確実同値額を二分探索(数値探索)で求める汎用版。u は狭義単調増加を仮定する。
 * E[u(X)]=E[u(x)]、[lo,hi] の中で u(CE)=target となる CE を探す
 * (SPEC/Issueの要求「E[u(X)]=u(CE)を満たすCEを求める（逆関数または数値探索）」に対応)。
 */
export function certaintyEquivalentBisection(
  u: (x: number) => number,
  target: number,
  lo: number,
  hi: number,
  tol = 1e-9,
  maxIter = 200,
): number {
  let a = lo;
  let b = hi;
  if (u(a) > u(b)) {
    throw new Error("u は [lo, hi] 上で狭義単調増加である必要がある");
  }
  for (let i = 0; i < maxIter; i++) {
    const mid = (a + b) / 2;
    const value = u(mid);
    if (Math.abs(value - target) < tol) return mid;
    if (value < target) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}

/**
 * リスクプレミアム RP = E[X] − CE(CARA効用)。
 * リスク回避的(α>0)なら正、リスク中立(α=0)なら0、リスク受容的(α<0)なら負になる
 * (第2章「リスク回避的な人はリスクプレミアムが正」)。
 */
export function riskPremium(
  outcomes: readonly number[],
  probabilities: readonly number[],
  alpha: number,
): number {
  return (
    expectedValue(outcomes, probabilities) - certaintyEquivalentCara(outcomes, probabilities, alpha)
  );
}

// ────────────────────────────────────────────────────────────
// 期待金額による意思決定 vs 期待効用による意思決定(決定分析(P-1)の利得行列を再利用)
// ────────────────────────────────────────────────────────────

function argmax(values: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}

/**
 * 期待効用による意思決定(CriterionResult互換): 各行動の期待効用 E[u(c(a,Θ))] が最大の行動を選ぶ。
 * [決定分析](decision-analysis.ts)の expectedValueCriterion と同じ形の結果を返すので、
 * scores・bestIndex をそのまま比較できる。
 */
export function expectedUtilityCriterion(
  matrix: PayoffMatrix,
  probabilities: readonly number[],
  alpha: number,
): CriterionResult {
  if (probabilities.length !== matrix.states.length) {
    throw new Error("probabilities の長さは states の数と一致させる必要がある");
  }
  const scores = matrix.payoffs.map((row) =>
    expectedUtility(row, probabilities, (x) => utilityCara(x, alpha)),
  );
  return { scores, bestIndex: argmax(scores) };
}

export type EvEuComparison = {
  esv: CriterionResult;
  eu: CriterionResult;
  /** ESVの最善行動とEUの最善行動が食い違うか。 */
  diverge: boolean;
};

/**
 * 期待金額(ESV)による意思決定と期待効用(EU)による意思決定を同じ利得行列・確率で比べる。
 * リスク回避的(α>0)だと、ハイリスク・ハイリターンな行動(2台稼働: 好況700/不況−300)が
 * ESVでは選ばれても、EUでは下振れの大きさが嫌われて選ばれなくなることがある——
 * 「期待金額と期待効用で意思決定が異なる」ことの具体例(第4部の主張の実例)。
 */
export function compareEvAndEuDecisions(
  matrix: PayoffMatrix,
  probabilities: readonly number[],
  alpha: number,
): EvEuComparison {
  const esv = expectedValueCriterion(matrix, probabilities);
  const eu = expectedUtilityCriterion(matrix, probabilities, alpha);
  return { esv, eu, diverge: esv.bestIndex !== eu.bestIndex };
}

// ────────────────────────────────────────────────────────────
// サンクトペテルブルクのパラドックス
// ────────────────────────────────────────────────────────────

/** n回目で初めて表が出たときの払戻額 2^n(円)。 */
export function stPetersburgPayoff(n: number): number {
  return 2 ** n;
}

/** n回目で初めて表が出る確率 (1/2)^n(n-1回連続で裏、n回目に表)。 */
export function stPetersburgProbability(n: number): number {
  return (1 / 2) ** n;
}

/**
 * 期待金額の部分和 Σ_{n=1}^{N} P(n)・payoff(n)。各項は (1/2^n)・2^n=1 なので、
 * 部分和は常に N に一致する——項を1つ足すたびにちょうど1ずつ増え続け、発散する
 * (第1章「期待金額 = 1/2×2+1/4×4+1/8×8+...=∞」をNコマ目までの部分和として実装したもの)。
 */
export function stPetersburgPartialExpectedValue(N: number): number {
  let sum = 0;
  for (let n = 1; n <= N; n++) sum += stPetersburgProbability(n) * stPetersburgPayoff(n);
  return sum;
}

/** log2効用 u(x)=log2(x)。payoff(n)=2^n に適用すると u(payoff(n))=n になり計算が高校数学レベルで追える。 */
export function stPetersburgLogUtility(x: number): number {
  return Math.log2(x);
}

/**
 * 期待効用の部分和 Σ_{n=1}^{N} P(n)・u(payoff(n))。u=log2のとき各項は n/2^n で、
 * N→∞ で Σ n/2^n = 2 に収束する(第1章「効用関数を導入することで期待効用が有限になる」の実装、
 * 出典の式 $E[u(X)]=\sum_{n=1}^\infty \frac1{2^n}\log_2(2^n)=\sum_{n=1}^\infty \frac{n}{2^n}=2$ と一致)。
 */
export function stPetersburgPartialExpectedUtility(
  N: number,
  u: (x: number) => number = stPetersburgLogUtility,
): number {
  let sum = 0;
  for (let n = 1; n <= N; n++) sum += stPetersburgProbability(n) * u(stPetersburgPayoff(n));
  return sum;
}
