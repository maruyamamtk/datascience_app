/**
 * 確率予測の評価(P-5)の計算層(純関数・副作用なし・Vitest対象)。
 *
 * 出典: 『意思決定分析と予測の活用』第5部「確率予測とその活用」第1章(一貫性/信頼度・
 * ブライアスコア・ブライアスコアの分解・Sharpness・ROC曲線とAUC)、
 * 第3部「決定分析の活用」第2章「コスト／ロスモデルと予測の価値」。
 *
 * 前提関係(CLAUDE.md「前提関係を明示」・重複回避):
 * - [二値分類の評価指標](binary-classification-metrics.ts)(J-3)がROC曲線・AUCの構成法を
 *   既に扱っている。本ファイルはROC/AUCを再実装せず、costLossの節でのみ簡潔に言及する
 *   (MDX側もLevelでは前提トピックへリンクするに留める)。
 * - 「陽性らしさスコア」を分類器のROC/AUC評価に使うJ-3に対し、本トピックは
 *   **その確率値自体がどれだけ«信頼できる確率»か**(キャリブレーション)という新しい観点を扱う。
 * - コスト/ロスモデルは[決定分析](decision-analysis.ts)(P-1)の利得行列による意思決定、
 *   [情報の価値](value-of-information.ts)(P-3)のEVPI/事前事後分析と同じ「期待金額(コスト)を
 *   比較して行動を選ぶ」という枠組みを土台にするが、状態が2値(危険/安全)・行動が2値
 *   (対策あり/なし)に特化した専用の利得構造(コストCは対策すれば常に発生、ロスLは
 *   対策せず危険な状態になったときだけ発生)を持つ、決定分析(P-1)とは別の具体的な
 *   利得行列である点に注意(J-3の costOptimalThreshold=C_FP/(C_FP+C_FN) ——
 *   誤検出コストと見逃しコストが«誤ったときだけ»発生する分類コストモデル——とも異なる)。
 *
 * 乱数は決定的な整数演算LCG(tasks/lessons.md #74の教訓。他トピックと同じ方式でSSRと
 * ブラウザで結果がぶれない)。
 */

// ────────────────────────────────────────────────────────────
// 決定的乱数(整数演算だけのLCG。SSRとブラウザで結果がぶれない)
// ────────────────────────────────────────────────────────────

/** 決定的な線形合同法(整数演算だけなのでSSRとブラウザで結果がぶれない)。 */
export function makeLcg(seed: number): () => number {
  let state = Math.floor(seed) >>> 0 || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// ────────────────────────────────────────────────────────────
// 合成データセット(信頼度曲線/ブライアスコア分解用): 真の確率trueProbと
// ベルヌーイ結果outcomeの組(層化+LCGで決定的に生成)
// ────────────────────────────────────────────────────────────

export type ForecastSample = { id: number; trueProb: number; outcome: 0 | 1 };

export const DATA_SEED = 930_512;
export const N_SAMPLES = 200;
export const DEFAULT_N_BINS = 10;

/**
 * 「真の確率(trueProb)」を[0,1]上にほぼ均等に層化配置し(各サンプルの位置は決定的)、
 * その確率に従うベルヌーイ結果だけをLCGで決定的に生成する。
 * trueProbが層化(等間隔)なのは、10ビンそれぞれに十分な件数を確保し信頼度曲線を
 * 安定させるため(この後、確信度スケールで歪めた予測確率をビン分けする)。
 * outcomeはLCGによる乱数なので、たとえ「完全に較正された」予測(confidenceScale=1)でも
 * ビンごとの実測発生率は予測確率とわずかにズレる——有限サンプルなら当然生じる
 * 標本誤差であり、これ自体が学習上正しい挙動(第1章の"信頼度エラー"がゼロにならない理由)。
 */
export function generateForecastBase(
  seed: number = DATA_SEED,
  n: number = N_SAMPLES,
): ForecastSample[] {
  const rng = makeLcg(seed);
  const samples: ForecastSample[] = [];
  for (let i = 0; i < n; i++) {
    const trueProb = (i + 0.5) / n;
    const outcome: 0 | 1 = rng() < trueProb ? 1 : 0;
    samples.push({ id: i, trueProb, outcome });
  }
  return samples;
}

/** 固定の合成データセット(信頼度曲線ラボ・コスト/ロスラボが共有する)。 */
export const FORECAST_BASE: readonly ForecastSample[] = generateForecastBase();

/**
 * 「確信度スケール」k による予測確率の歪め方: p_hat = 0.5 + (trueProb-0.5)*k。
 * - k=1: 歪みなし(理想的にキャリブレーションされた予測)。
 * - k>1: 0.5から遠ざける(過信=overconfidence——例えば真の確率0.7をp_hat=0.9のように
 *   実際より極端に自信満々な数字で言う)。
 * - 0<k<1: 0.5に近づける(自信不足=underconfidence——真の確率0.9でもp_hat=0.7のように
 *   控えめにしか言わない)。
 * [0,1]の外に出ないようclampする。
 */
export function distortForecast(trueProb: number, confidenceScale: number): number {
  const raw = 0.5 + (trueProb - 0.5) * confidenceScale;
  return Math.min(1, Math.max(0, raw));
}

/** pをnBins個の格子点(0, 1/nBins, 2/nBins, ..., 1)のうち最も近い値に丸める。 */
export function roundToGrid(p: number, nBins: number = DEFAULT_N_BINS): number {
  return Math.round(p * nBins) / nBins;
}

/**
 * 合成データセットに確信度スケールを適用し、nBins刻みに丸めた予測確率の配列を作る
 * (「天気予報は10%刻みでしか言わない」という実務の慣行と同じ離散化。この離散化のおかげで、
 * 後述のブライアスコアの分解(murphyDecomposition)がビン内誤差なしに厳密に成立する)。
 */
export function predictedProbabilities(
  base: readonly ForecastSample[],
  confidenceScale: number,
  nBins: number = DEFAULT_N_BINS,
): number[] {
  return base.map((s) => roundToGrid(distortForecast(s.trueProb, confidenceScale), nBins));
}

export function outcomesOf(base: readonly ForecastSample[]): number[] {
  return base.map((s) => s.outcome);
}

// ────────────────────────────────────────────────────────────
// ブライアスコア: BS = (1/n)Σ(予測確率-実際の結果)²
// ────────────────────────────────────────────────────────────

/**
 * ブライアスコア BS=(1/n)Σ(p̂_i-y_i)²(第1章)。y_iは0/1、p̂_iは予測確率[0,1]。
 * 0(完全な予測)〜1(完全に外れた予測)の範囲を取る、二乗誤差そのもの
 * (高校数学でいう「実際の値と予測値の差の2乗の平均」——回帰の平均二乗誤差(MSE)と
 * 全く同じ式を、y∈{0,1}の分類結果に対して適用したものがブライアスコア)。
 */
export function brierScore(predicted: readonly number[], outcomes: readonly number[]): number {
  if (predicted.length !== outcomes.length) {
    throw new Error("predicted と outcomes の長さは一致させる必要がある");
  }
  if (predicted.length === 0) return Number.NaN;
  let sum = 0;
  for (let i = 0; i < predicted.length; i++) sum += (predicted[i] - outcomes[i]) ** 2;
  return sum / predicted.length;
}

// ────────────────────────────────────────────────────────────
// ブライアスコアの核心的可視化用: 1件ずつ二乗誤差が積み上がる様子(コマ送りステッパー)
// ────────────────────────────────────────────────────────────

export type BrierStepperSample = { predicted: number; outcome: 0 | 1 };

/**
 * ステッパー(L0)専用の小さな具体例(10件)。CLAUDE.md「まず小さな具体例で原理を見せる」に
 * 従い、「自信満々で当てた(二乗誤差が小さい)」ケースと「自信満々で外した(二乗誤差が大きい)」
 * ケースの両方を混在させ、二乗誤差が積み上がる様子に起伏を持たせて物語をわかりやすくする
 * (実測データではなく、教育目的で手作業に選んだ固定値——最適化で選んだ値ではないため
 *  tasks/lessons.md「最適パラメータを決め打ちしない」の教訓には抵触しない)。
 */
export const STEPPER_SAMPLES: readonly BrierStepperSample[] = [
  { predicted: 0.9, outcome: 1 },
  { predicted: 0.2, outcome: 0 },
  { predicted: 0.8, outcome: 1 },
  { predicted: 0.6, outcome: 0 },
  { predicted: 0.5, outcome: 1 },
  { predicted: 0.1, outcome: 1 },
  { predicted: 0.7, outcome: 1 },
  { predicted: 0.3, outcome: 0 },
  { predicted: 0.95, outcome: 0 },
  { predicted: 0.4, outcome: 0 },
];

export type BrierTermRow = {
  index: number;
  predicted: number;
  outcome: 0 | 1;
  squaredError: number;
  cumulativeSum: number;
  runningScore: number;
};

/**
 * サンプルを1件ずつ処理しながら、二乗誤差(predicted-outcome)²・累積和・
 * その時点までの平均(=途中経過のブライアスコア)を計算する(ステッパーの1コマ=1行)。
 */
export function cumulativeBrierTerms(
  samples: readonly BrierStepperSample[] = STEPPER_SAMPLES,
): BrierTermRow[] {
  let cumulative = 0;
  return samples.map((s, i) => {
    const squaredError = (s.predicted - s.outcome) ** 2;
    cumulative += squaredError;
    return {
      index: i,
      predicted: s.predicted,
      outcome: s.outcome,
      squaredError,
      cumulativeSum: cumulative,
      runningScore: cumulative / (i + 1),
    };
  });
}

// ────────────────────────────────────────────────────────────
// 信頼度曲線(Reliability Diagram)用のビン集計
// ────────────────────────────────────────────────────────────

export type CalibrationBin = {
  binIndex: number;
  /** このビンの予測確率(=k/nBins。離散化済みなのでビン内の全予測がこの値と厳密に一致する)。 */
  forecastValue: number;
  count: number;
  /** ビン内の実際の発生率(件数0のビンはnull)。 */
  observedFreq: number | null;
};

/**
 * 予測確率をnBins+1個の格子点(0, 1/nBins, ..., 1)ごとにグループ化し、各グループの
 * 件数・実際の発生率(ō_k)を集計する(信頼度曲線=横軸forecastValue・縦軸observedFreqの散布図)。
 * predictedはpredictedProbabilities()で既にroundToGrid済みである前提
 * (ズレなくビンに割り振れる)。
 */
export function calibrationBins(
  predicted: readonly number[],
  outcomes: readonly number[],
  nBins: number = DEFAULT_N_BINS,
): CalibrationBin[] {
  if (predicted.length !== outcomes.length) {
    throw new Error("predicted と outcomes の長さは一致させる必要がある");
  }
  const counts = Array.from({ length: nBins + 1 }, () => ({ count: 0, outcomeSum: 0 }));
  for (let i = 0; i < predicted.length; i++) {
    const k = Math.min(nBins, Math.max(0, Math.round(predicted[i] * nBins)));
    counts[k].count += 1;
    counts[k].outcomeSum += outcomes[i];
  }
  return counts.map((c, k) => ({
    binIndex: k,
    forecastValue: k / nBins,
    count: c.count,
    observedFreq: c.count > 0 ? c.outcomeSum / c.count : null,
  }));
}

// ────────────────────────────────────────────────────────────
// ブライアスコアの分解(Murphy分解): BS = 信頼度エラー - Refinement(解像度) + 不確実性
// ────────────────────────────────────────────────────────────

export type MurphyDecomposition = {
  /** 信頼度エラー(reliability): Σn_k(f_k-ō_k)²/n。予測と実際のズレ、小さいほど良い。 */
  reliability: number;
  /** Refinement(resolution): Σn_k(ō_k-ō)²/n。ビンごとの発生率が全体平均からどれだけ
   *  離れているか(=予測が「当たるかどうかで発生率を分けられているか」)、大きいほど良い。 */
  resolution: number;
  /** 不確実性(uncertainty): ō(1-ō)。データそのものが持つ、予測とは無関係な曖昧さ。 */
  uncertainty: number;
  /** reliability-resolution+uncertaintyで再構成したブライアスコア(下の導出により厳密に一致)。 */
  brierScore: number;
  /** 全体の発生率 ō = 陽性の割合。 */
  baseRate: number;
};

/**
 * ブライアスコアを「信頼度エラー(reliability) - Refinement(resolution) + 不確実性(uncertainty)」
 * に分解する(第1章「BS=信頼度エラー-Refinement+不確実性」)。
 *
 * 導出(高校数学の展開のみで厳密に成り立つ。predictedがnBins刻みに離散化済みで
 * ビンkに属する予測は全てforecastValue=k/nBinsに一致することが鍵):
 * ビンkの中では予測値がf_kで一定なので、そのビン内の二乗誤差の和は
 *   Σ_{i∈k}(f_k-y_i)² = n_k f_k² - 2f_k・n_kō_k + n_kō_k   (y_i∈{0,1}なのでy_i²=y_i)
 *                       = n_k[(f_k-ō_k)² + ō_k(1-ō_k)]
 * これを全ビンで足し上げ、さらに ō_k(1-ō_k) の和を「全体の不確実性 ō(1-ō)」と
 * 「ビン間のばらつき Σn_k(ō_k-ō)²」に代数的に分けると(平方の展開で機械的に確認できる)、
 *   N・BS = Σ_k n_k(f_k-ō_k)²  -  Σ_k n_k(ō_k-ō)²  +  N・ō(1-ō)
 * 両辺をNで割ればこの関数の3項の和がそのままBSになる——近似ではなく厳密な恒等式
 * (MDXのDerivationで高校数学レベルの式変形として提示する)。
 */
export function murphyDecomposition(
  predicted: readonly number[],
  outcomes: readonly number[],
  nBins: number = DEFAULT_N_BINS,
): MurphyDecomposition {
  if (predicted.length !== outcomes.length) {
    throw new Error("predicted と outcomes の長さは一致させる必要がある");
  }
  const n = predicted.length;
  const bins = calibrationBins(predicted, outcomes, nBins);
  const baseRate = outcomes.reduce((a, b) => a + b, 0) / n;

  let reliability = 0;
  let resolution = 0;
  for (const b of bins) {
    if (b.count === 0 || b.observedFreq === null) continue;
    reliability += b.count * (b.forecastValue - b.observedFreq) ** 2;
    resolution += b.count * (b.observedFreq - baseRate) ** 2;
  }
  reliability /= n;
  resolution /= n;
  const uncertainty = baseRate * (1 - baseRate);

  return {
    reliability,
    resolution,
    uncertainty,
    brierScore: reliability - resolution + uncertainty,
    baseRate,
  };
}

// ────────────────────────────────────────────────────────────
// Sharpness(鋭さ): 予測確率そのものの分散
// ────────────────────────────────────────────────────────────

/**
 * Sharpness=予測確率の分散(第1章「予測確率の分散で表される自信の度合い」)。
 * 0.5付近に固まった予測はSharpnessが低い(常に「五分五分」としか言わない曖昧な予測)。
 * 0や1付近に散らばった予測はSharpnessが高い(自信を持って白黒つけている)。
 * 高校数学の分散の定義 Var(X)=E[(X-E[X])²] そのもの(母分散、nで割る)。
 */
export function sharpness(predicted: readonly number[]): number {
  const n = predicted.length;
  if (n === 0) return 0;
  const mean = predicted.reduce((a, b) => a + b, 0) / n;
  return predicted.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
}

// ────────────────────────────────────────────────────────────
// コスト/ロスモデル(第3部第2章): 最適閾値 p*=r=コスト/ロス と予測の価値
// ────────────────────────────────────────────────────────────

/**
 * コスト/ロスモデルの最適閾値 p*=r=コストC/ロスL(第3部第2章)。
 *
 * 導出: 状態(危険/安全)×行動(対策あり/なし)の利得表で、対策すれば状態によらず
 * コストCがかかり、対策しなければ危険な状態(確率p)のときだけロスLがかかる。
 * 「対策あり」の期待コストはC(一定)、「対策なし」の期待コストはp・L。
 * 対策する方が得(期待コストが小さい)になるのは C<p・L ⟺ p>C/L のとき
 * (高校数学の1次不等式そのもの)——よってp*=C/Lが「対策すべきかどうか」の分岐点になる。
 */
export function costLossOptimalThreshold(cost: number, loss: number): number {
  return loss > 0 ? cost / loss : Number.POSITIVE_INFINITY;
}

export type CostLossEvaluation = {
  /** 最適閾値 r=C/L(0〜1の範囲外もありうる: r>=1なら「常に対策しない」が最適)。 */
  ratio: number;
  /** predictedとの比較に使う閾値(表示・判定用に[0,1]へclamp)。 */
  thresholdUsed: number;
  baseRate: number;
  /** 常に対策する場合の期待コスト(=C、一定)。 */
  alwaysProtectCost: number;
  /** 一度も対策しない場合の期待コスト(=ō・L、気候値=climatology予測に相当)。 */
  neverProtectCost: number;
  /** 予測を使わない場合の最良の戦略(alwaysかneverの安い方)。予測の価値の基準点。 */
  climatologyBestCost: number;
  /** 確率予測pに従い、p>=閾値なら対策する場合の期待コスト。 */
  forecastCost: number;
  /** 完全な予測(実際に危険なときだけ対策する)の期待コスト(=ō・C)。予測の価値の上限。 */
  perfectForecastCost: number;
  /** 予測の価値スコア V=(climatologyBest-forecast)/(climatologyBest-perfect)。
   *  0=気候値予測と同程度、1=完全な予測と同程度、負=気候値より予測を使う方が悪い。 */
  valueScore: number;
};

/**
 * 確率予測を使った意思決定の期待コストを、「予測なし(気候値=climatology)」「完全な予測」
 * と比較し、確率予測がどれだけ意思決定の価値を生むかを1つのスコアにまとめる
 * (第3部第2章「確率予測が価値を生む条件」・[情報の価値](value-of-information.ts)の
 * EVPI(完全情報の価値を上限とする)と同じ発想を、コスト/ロスモデルに適用したもの)。
 */
export function evaluateCostLoss(
  predicted: readonly number[],
  outcomes: readonly number[],
  cost: number,
  loss: number,
): CostLossEvaluation {
  if (predicted.length !== outcomes.length) {
    throw new Error("predicted と outcomes の長さは一致させる必要がある");
  }
  const n = predicted.length;
  const baseRate = n > 0 ? outcomes.reduce((a, b) => a + b, 0) / n : 0;
  const ratio = costLossOptimalThreshold(cost, loss);
  const thresholdUsed = Math.min(1, Math.max(0, ratio));

  const alwaysProtectCost = cost;
  const neverProtectCost = baseRate * loss;
  const climatologyBestCost = Math.min(alwaysProtectCost, neverProtectCost);
  const perfectForecastCost = baseRate * cost;

  let forecastTotal = 0;
  for (let i = 0; i < n; i++) {
    const protect = predicted[i] >= ratio;
    forecastTotal += protect ? cost : outcomes[i] === 1 ? loss : 0;
  }
  const forecastCost = n > 0 ? forecastTotal / n : 0;

  const denom = climatologyBestCost - perfectForecastCost;
  const valueScore = denom > 1e-9 ? (climatologyBestCost - forecastCost) / denom : 0;

  return {
    ratio,
    thresholdUsed,
    baseRate,
    alwaysProtectCost,
    neverProtectCost,
    climatologyBestCost,
    forecastCost,
    perfectForecastCost,
    valueScore,
  };
}
