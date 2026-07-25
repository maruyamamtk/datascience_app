import { describe, expect, it } from "vitest";
import {
  brierScore,
  calibrationBins,
  costLossOptimalThreshold,
  cumulativeBrierTerms,
  DATA_SEED,
  distortForecast,
  evaluateCostLoss,
  FORECAST_BASE,
  generateForecastBase,
  makeLcg,
  murphyDecomposition,
  N_SAMPLES,
  outcomesOf,
  predictedProbabilities,
  roundToGrid,
  sharpness,
  STEPPER_SAMPLES,
} from "./probabilistic-forecasting";

describe("makeLcg", () => {
  it("同じseedなら同じ数列を決定的に返す(SSR/CSRでぶれない前提)", () => {
    const a = makeLcg(42);
    const b = makeLcg(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("[0,1)の範囲の値を返す", () => {
    const rng = makeLcg(7);
    for (let i = 0; i < 50; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("generateForecastBase", () => {
  it("nと同じ件数を生成する", () => {
    const base = generateForecastBase(DATA_SEED, N_SAMPLES);
    expect(base).toHaveLength(N_SAMPLES);
  });

  it("同じseedなら決定的(SSR/CSRで同じ結果)", () => {
    const a = generateForecastBase(123, 50);
    const b = generateForecastBase(123, 50);
    expect(a).toEqual(b);
  });

  it("trueProbは0〜1にほぼ均等配置される", () => {
    const base = generateForecastBase(1, 10);
    expect(base[0].trueProb).toBeCloseTo(0.05, 5);
    expect(base[9].trueProb).toBeCloseTo(0.95, 5);
  });

  it("outcomeは0か1のみ", () => {
    const base = generateForecastBase(DATA_SEED, N_SAMPLES);
    for (const s of base) expect([0, 1]).toContain(s.outcome);
  });
});

describe("distortForecast", () => {
  it("confidenceScale=1のときtrueProbをそのまま返す(歪みなし)", () => {
    expect(distortForecast(0.7, 1)).toBeCloseTo(0.7, 10);
    expect(distortForecast(0.3, 1)).toBeCloseTo(0.3, 10);
  });

  it("confidenceScale>1は0.5から遠ざける(過信)", () => {
    // trueProb=0.7, k=2 → 0.5+(0.7-0.5)*2=0.9(実際より極端な自信)
    expect(distortForecast(0.7, 2)).toBeCloseTo(0.9, 10);
  });

  it("confidenceScale<1は0.5に近づける(自信不足)", () => {
    // trueProb=0.9, k=0.5 → 0.5+(0.9-0.5)*0.5=0.7
    expect(distortForecast(0.9, 0.5)).toBeCloseTo(0.7, 10);
  });

  it("[0,1]の外に出ない(clamp)", () => {
    expect(distortForecast(0.99, 5)).toBeLessThanOrEqual(1);
    expect(distortForecast(0.01, 5)).toBeGreaterThanOrEqual(0);
  });
});

describe("roundToGrid", () => {
  it("nBins刻みの最も近い格子点に丸める", () => {
    expect(roundToGrid(0.23, 10)).toBeCloseTo(0.2, 10);
    expect(roundToGrid(0.27, 10)).toBeCloseTo(0.3, 10);
    expect(roundToGrid(0, 10)).toBeCloseTo(0, 10);
    expect(roundToGrid(1, 10)).toBeCloseTo(1, 10);
  });
});

describe("brierScore", () => {
  it("完全な予測(全て的中かつ確信度100%)ならBS=0", () => {
    expect(brierScore([1, 0, 1, 0], [1, 0, 1, 0])).toBeCloseTo(0, 10);
  });

  it("完全に外れた予測(全て逆)ならBS=1", () => {
    expect(brierScore([1, 0, 1, 0], [0, 1, 0, 1])).toBeCloseTo(1, 10);
  });

  it("常に0.5と予測するとBS=0.25(バランスの取れたデータで)", () => {
    expect(brierScore([0.5, 0.5, 0.5, 0.5], [1, 0, 1, 0])).toBeCloseTo(0.25, 10);
  });

  it("手計算した具体例と一致する", () => {
    // (0.8-1)^2=0.04, (0.3-0)^2=0.09 → 平均0.065
    expect(brierScore([0.8, 0.3], [1, 0])).toBeCloseTo(0.065, 10);
  });

  it("長さが一致しないとエラー", () => {
    expect(() => brierScore([0.5], [1, 0])).toThrow();
  });
});

describe("cumulativeBrierTerms", () => {
  it("STEPPER_SAMPLESの累積和・runningScoreの最終値が全体のbrierScoreと一致する", () => {
    const rows = cumulativeBrierTerms(STEPPER_SAMPLES);
    expect(rows).toHaveLength(STEPPER_SAMPLES.length);
    const last = rows[rows.length - 1];
    const predicted = STEPPER_SAMPLES.map((s) => s.predicted);
    const outcomes = STEPPER_SAMPLES.map((s) => s.outcome);
    expect(last.runningScore).toBeCloseTo(brierScore(predicted, outcomes), 10);
  });

  it("各行の二乗誤差が正しい", () => {
    const rows = cumulativeBrierTerms([{ predicted: 0.9, outcome: 1 }]);
    expect(rows[0].squaredError).toBeCloseTo(0.01, 10);
    expect(rows[0].cumulativeSum).toBeCloseTo(0.01, 10);
    expect(rows[0].runningScore).toBeCloseTo(0.01, 10);
  });

  it("累積和は単調非減少(二乗誤差は常に0以上)", () => {
    const rows = cumulativeBrierTerms(STEPPER_SAMPLES);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].cumulativeSum).toBeGreaterThanOrEqual(rows[i - 1].cumulativeSum);
    }
  });
});

describe("calibrationBins", () => {
  it("全ビンの件数の合計がサンプル数と一致する", () => {
    const predicted = predictedProbabilities(FORECAST_BASE, 1);
    const outcomes = outcomesOf(FORECAST_BASE);
    const bins = calibrationBins(predicted, outcomes, 10);
    const total = bins.reduce((a, b) => a + b.count, 0);
    expect(total).toBe(FORECAST_BASE.length);
  });

  it("件数0のビンはobservedFreqがnull", () => {
    const bins = calibrationBins([0, 0, 1], [0, 1, 1], 10);
    const midBins = bins.filter((b) => b.forecastValue > 0 && b.forecastValue < 1);
    for (const b of midBins) {
      expect(b.count).toBe(0);
      expect(b.observedFreq).toBeNull();
    }
  });

  it("単純な数値例で発生率を正しく集計する", () => {
    // predicted=0(2件, outcome 0,1) → count2, freq0.5 / predicted=1(1件,outcome1) → count1, freq1
    const bins = calibrationBins([0, 0, 1], [0, 1, 1], 10);
    expect(bins[0].count).toBe(2);
    expect(bins[0].observedFreq).toBeCloseTo(0.5, 10);
    expect(bins[10].count).toBe(1);
    expect(bins[10].observedFreq).toBeCloseTo(1, 10);
  });
});

describe("murphyDecomposition", () => {
  it("reliability-resolution+uncertainty が(離散化済み予測の)brierScoreと厳密に一致する", () => {
    for (const k of [0.5, 1, 1.5, 2]) {
      const predicted = predictedProbabilities(FORECAST_BASE, k);
      const outcomes = outcomesOf(FORECAST_BASE);
      const d = murphyDecomposition(predicted, outcomes, 10);
      expect(d.brierScore).toBeCloseTo(brierScore(predicted, outcomes), 10);
    }
  });

  it("完全に較正された予測(全ビンでforecastValue=observedFreq)ならreliability=0", () => {
    // 2ビンとも予測値と発生率が一致するケース
    const predicted = [0, 0, 1, 1];
    const outcomes = [0, 0, 1, 1];
    const d = murphyDecomposition(predicted, outcomes, 10);
    expect(d.reliability).toBeCloseTo(0, 10);
  });

  it("uncertaintyはō(1-ō)に等しい", () => {
    const predicted = [0, 0.5, 1];
    const outcomes = [0, 1, 1];
    const d = murphyDecomposition(predicted, outcomes, 10);
    const baseRate = 2 / 3;
    expect(d.uncertainty).toBeCloseTo(baseRate * (1 - baseRate), 10);
  });

  it("手作業の小さい例で3項すべてを検算する", () => {
    // predicted: [0.2,0.2,0.8,0.8], outcomes: [0,1,1,1]
    // bin0.2: n=2, f=0.2, o_k=0.5 / bin0.8: n=2, f=0.8, o_k=1
    // baseRate=(0+1+1+1)/4=0.75
    const predicted = [0.2, 0.2, 0.8, 0.8];
    const outcomes = [0, 1, 1, 1];
    const d = murphyDecomposition(predicted, outcomes, 10);
    const expectedReliability = (2 * (0.2 - 0.5) ** 2 + 2 * (0.8 - 1) ** 2) / 4;
    const expectedResolution = (2 * (0.5 - 0.75) ** 2 + 2 * (1 - 0.75) ** 2) / 4;
    const expectedUncertainty = 0.75 * 0.25;
    expect(d.reliability).toBeCloseTo(expectedReliability, 10);
    expect(d.resolution).toBeCloseTo(expectedResolution, 10);
    expect(d.uncertainty).toBeCloseTo(expectedUncertainty, 10);
    expect(d.brierScore).toBeCloseTo(
      expectedReliability - expectedResolution + expectedUncertainty,
      10,
    );
  });
});

describe("sharpness", () => {
  it("全て同じ予測値ならSharpness=0(自信の度合いにばらつきがない)", () => {
    expect(sharpness([0.5, 0.5, 0.5])).toBeCloseTo(0, 10);
    expect(sharpness([1, 1, 1])).toBeCloseTo(0, 10);
  });

  it("0/1に張り付いた予測は0.5付近の予測よりSharpnessが高い", () => {
    const sharp = sharpness([0, 0, 1, 1]);
    const dull = sharpness([0.4, 0.5, 0.5, 0.6]);
    expect(sharp).toBeGreaterThan(dull);
  });

  it("confidenceScaleを上げるほどSharpnessが上がる(0.5から遠ざかるため)", () => {
    const base = generateForecastBase(999, 40);
    const low = sharpness(predictedProbabilities(base, 0.4));
    const mid = sharpness(predictedProbabilities(base, 1));
    const high = sharpness(predictedProbabilities(base, 2));
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
  });
});

describe("costLossOptimalThreshold", () => {
  it("r=cost/lossを返す", () => {
    expect(costLossOptimalThreshold(2, 10)).toBeCloseTo(0.2, 10);
    expect(costLossOptimalThreshold(5, 10)).toBeCloseTo(0.5, 10);
  });

  it("cost=lossならr=1", () => {
    expect(costLossOptimalThreshold(4, 4)).toBeCloseTo(1, 10);
  });

  it("loss=0ならInfinity(常に対策しない方が得)", () => {
    expect(costLossOptimalThreshold(1, 0)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("evaluateCostLoss", () => {
  it("完全な予測(predicted===outcomes)ならforecastCostはperfectForecastCostに一致する", () => {
    const outcomes = [1, 0, 1, 1, 0, 0, 1, 0];
    const predicted = outcomes.map((o) => o); // 完全に的中する確率予測(0 or 1)
    const evalResult = evaluateCostLoss(predicted, outcomes, 3, 10);
    expect(evalResult.forecastCost).toBeCloseTo(evalResult.perfectForecastCost, 10);
    expect(evalResult.valueScore).toBeCloseTo(1, 6);
  });

  it("情報のない予測(常に基準発生率を予測)はclimatologyBestCostと同程度になる", () => {
    const outcomes = [1, 0, 1, 1, 0, 0, 1, 0];
    const baseRate = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
    const predicted = outcomes.map(() => baseRate);
    const evalResult = evaluateCostLoss(predicted, outcomes, 3, 10);
    expect(evalResult.forecastCost).toBeCloseTo(evalResult.climatologyBestCost, 10);
    expect(evalResult.valueScore).toBeCloseTo(0, 6);
  });

  it("perfectForecastCost <= forecastCost <= climatologyBestCost が成り立つ(通常の予測品質で)", () => {
    const predicted = predictedProbabilities(FORECAST_BASE, 1);
    const outcomes = outcomesOf(FORECAST_BASE);
    const evalResult = evaluateCostLoss(predicted, outcomes, 4, 10);
    expect(evalResult.perfectForecastCost).toBeLessThanOrEqual(evalResult.forecastCost + 1e-9);
    expect(evalResult.forecastCost).toBeLessThanOrEqual(evalResult.climatologyBestCost + 1e-9);
  });

  it("ratioはcostLossOptimalThresholdと一致する", () => {
    const predicted = predictedProbabilities(FORECAST_BASE, 1);
    const outcomes = outcomesOf(FORECAST_BASE);
    const evalResult = evaluateCostLoss(predicted, outcomes, 3, 12);
    expect(evalResult.ratio).toBeCloseTo(costLossOptimalThreshold(3, 12), 10);
  });
});
