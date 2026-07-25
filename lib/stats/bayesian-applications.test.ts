import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random";
import { betaMean, betaVariance } from "./bayesian-basics";
import {
  AB_OBSERVATIONS,
  DEFAULT_ITEMS,
  UNIFORM_PRIOR,
  answeredCount,
  correctCount,
  estimateAbComparison,
  irtProbability,
  itemCharacteristicCurve,
  itemInformation,
  likelihoodCurve,
  logLikelihoodTheta,
  mleTheta,
  runAbMonteCarlo,
  sampleBetaInteger,
  sequentialAbUpdates,
  variantPosterior,
} from "./bayesian-applications";

describe("variantPosterior", () => {
  it("成功数・失敗数をベータ事前分布に足し込む(K-1の共役更新をそのまま2群に使う)", () => {
    const posterior = variantPosterior(UNIFORM_PRIOR, { label: "A", conversions: 8, visitors: 40 });
    expect(posterior).toEqual({ alpha: 1 + 8, beta: 1 + 32 });
  });

  it("visitors=0(未観測)は事前分布そのまま", () => {
    const posterior = variantPosterior(UNIFORM_PRIOR, { label: "A", conversions: 0, visitors: 0 });
    expect(posterior).toEqual(UNIFORM_PRIOR);
  });
});

describe("sampleBetaInteger", () => {
  it("正整数でないa,bは例外を投げる", () => {
    const rng = mulberry32(1);
    expect(() => sampleBetaInteger(1.5, 2, rng)).toThrow(RangeError);
    expect(() => sampleBetaInteger(1, 0, rng)).toThrow(RangeError);
  });

  it("同じシードなら決定的に同じ値を返す(SSR/CSR一致の前提)", () => {
    const a = sampleBetaInteger(3, 5, mulberry32(42));
    const b = sampleBetaInteger(3, 5, mulberry32(42));
    expect(a).toBe(b);
  });

  it("[0,1]の範囲に収まる", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const v = sampleBetaInteger(2, 3, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("大量サンプルの標本平均・分散が理論値(betaMean/betaVariance)に近い(順序統計量が正しくBeta(a,b)を再現する証拠)", () => {
    const a = 6;
    const b = 4;
    const rng = mulberry32(2026);
    const n = 20000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const v = sampleBetaInteger(a, b, rng);
      sum += v;
      sumSq += v * v;
    }
    const sampleMean = sum / n;
    const sampleVar = sumSq / n - sampleMean * sampleMean;
    expect(sampleMean).toBeCloseTo(betaMean({ alpha: a, beta: b }), 2);
    expect(sampleVar).toBeCloseTo(betaVariance({ alpha: a, beta: b }), 2);
  });

  it("Beta(1,1)(n=1)は一様分布そのもの(1個の一様乱数の1番目)", () => {
    const rng = mulberry32(3);
    const raw = mulberry32(3)();
    const sampled = sampleBetaInteger(1, 1, rng);
    expect(sampled).toBe(raw);
  });
});

describe("runAbMonteCarlo", () => {
  it("Bの方が明らかに高い事後分布ならP(B>A)は1に近い", () => {
    const rng = mulberry32(1);
    const result = runAbMonteCarlo({ alpha: 3, beta: 97 }, { alpha: 50, beta: 50 }, 3000, rng);
    expect(result.probBBeatsA).toBeGreaterThan(0.95);
  });

  it("同一の事後分布同士ならP(B>A)は0.5に近い", () => {
    const rng = mulberry32(9);
    const result = runAbMonteCarlo({ alpha: 20, beta: 20 }, { alpha: 20, beta: 20 }, 4000, rng);
    expect(result.probBBeatsA).toBeGreaterThan(0.4);
    expect(result.probBBeatsA).toBeLessThan(0.6);
  });

  it("期待損失は非負", () => {
    const rng = mulberry32(4);
    const result = runAbMonteCarlo({ alpha: 5, beta: 15 }, { alpha: 10, beta: 10 }, 1000, rng);
    expect(result.expectedLossChooseA).toBeGreaterThanOrEqual(0);
    expect(result.expectedLossChooseB).toBeGreaterThanOrEqual(0);
  });

  it("nSamples=0はP(B>A)=0.5・期待損失0の既定値", () => {
    const result = runAbMonteCarlo({ alpha: 5, beta: 5 }, { alpha: 5, beta: 5 }, 0, mulberry32(1));
    expect(result).toEqual({ probBBeatsA: 0.5, expectedLossChooseB: 0, expectedLossChooseA: 0, nSamples: 0 });
  });

  it("Bが優勢なほど「Aを選ぶ期待損失」が「Bを選ぶ期待損失」より大きい", () => {
    const rng = mulberry32(11);
    const result = runAbMonteCarlo({ alpha: 5, beta: 45 }, { alpha: 45, beta: 5 }, 4000, rng);
    expect(result.expectedLossChooseA).toBeGreaterThan(result.expectedLossChooseB);
  });
});

describe("estimateAbComparison", () => {
  it("既定シード・標本数で決定的に同じ結果を返す(SSR一致の前提)", () => {
    const a = estimateAbComparison({ alpha: 9, beta: 33 }, { alpha: 15, beta: 27 });
    const b = estimateAbComparison({ alpha: 9, beta: 33 }, { alpha: 15, beta: 27 });
    expect(a).toEqual(b);
  });
});

describe("sequentialAbUpdates", () => {
  it("ステップ数はobservations.length+1", () => {
    const steps = sequentialAbUpdates(UNIFORM_PRIOR, AB_OBSERVATIONS, 500);
    expect(steps.length).toBe(AB_OBSERVATIONS.length + 1);
  });

  it("先頭ステップは観測前(事前分布のみ、visitors=0)", () => {
    const steps = sequentialAbUpdates(UNIFORM_PRIOR, AB_OBSERVATIONS, 500);
    expect(steps[0].index).toBe(0);
    expect(steps[0].observation).toBeNull();
    expect(steps[0].dataA.visitors).toBe(0);
    expect(steps[0].dataB.visitors).toBe(0);
    expect(steps[0].posteriorA).toEqual(UNIFORM_PRIOR);
  });

  it("各観測後、対応するバリアントのvisitorsが1ずつ増える", () => {
    const steps = sequentialAbUpdates(UNIFORM_PRIOR, AB_OBSERVATIONS, 500);
    const aVisitCounts = steps.map((s) => s.dataA.visitors);
    const bVisitCounts = steps.map((s) => s.dataB.visitors);
    for (let i = 1; i < steps.length; i++) {
      const obs = steps[i].observation;
      expect(obs).not.toBeNull();
      if (obs?.variant === "A") {
        expect(aVisitCounts[i]).toBe(aVisitCounts[i - 1] + 1);
        expect(bVisitCounts[i]).toBe(bVisitCounts[i - 1]);
      } else {
        expect(bVisitCounts[i]).toBe(bVisitCounts[i - 1] + 1);
        expect(aVisitCounts[i]).toBe(aVisitCounts[i - 1]);
      }
    }
  });

  it("最終ステップの訪問者数の合計は観測系列の長さに一致する", () => {
    const steps = sequentialAbUpdates(UNIFORM_PRIOR, AB_OBSERVATIONS, 500);
    const last = steps[steps.length - 1];
    expect(last.dataA.visitors + last.dataB.visitors).toBe(AB_OBSERVATIONS.length);
  });

  it("この観測系列では最終的にP(B>A)が0.5より明確に高くなる(Bが優勢というストーリー)", () => {
    const steps = sequentialAbUpdates(UNIFORM_PRIOR, AB_OBSERVATIONS, 4000);
    const last = steps[steps.length - 1];
    expect(last.comparison.probBBeatsA).toBeGreaterThan(0.6);
  });
});

describe("irtProbability(2PLモデル)", () => {
  it("θ=b(困難度と同じ能力)なら正答確率はちょうど0.5", () => {
    expect(irtProbability(1.2, { a: 1.5, b: 1.2 })).toBeCloseTo(0.5, 10);
  });

  it("θがbより大きいほど正答確率は高い(単調増加)", () => {
    const item = { a: 1.5, b: 0 };
    const p1 = irtProbability(-1, item);
    const p2 = irtProbability(0, item);
    const p3 = irtProbability(1, item);
    expect(p1).toBeLessThan(p2);
    expect(p2).toBeLessThan(p3);
  });

  it("識別力aが大きいほどθ=b付近での傾きが急になる(b近傍でのp(0.1)-p(-0.1)の差で比較)", () => {
    const gentle = { a: 0.5, b: 0 };
    const steep = { a: 3, b: 0 };
    const gentleDelta = irtProbability(0.1, gentle) - irtProbability(-0.1, gentle);
    const steepDelta = irtProbability(0.1, steep) - irtProbability(-0.1, steep);
    expect(steepDelta).toBeGreaterThan(gentleDelta);
  });

  it("常に(0,1)の範囲に収まる", () => {
    const item = { a: 2, b: 0 };
    expect(irtProbability(-10, item)).toBeGreaterThan(0);
    expect(irtProbability(-10, item)).toBeLessThan(0.01);
    expect(irtProbability(10, item)).toBeLessThan(1);
    expect(irtProbability(10, item)).toBeGreaterThan(0.99);
  });
});

describe("itemCharacteristicCurve", () => {
  it("指定した点数ぶんの{theta,p}を返し、pは単調増加", () => {
    const curve = itemCharacteristicCurve({ a: 1.5, b: 0 }, -4, 4, 41);
    expect(curve.length).toBe(41);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].p).toBeGreaterThanOrEqual(curve[i - 1].p);
    }
  });
});

describe("itemInformation", () => {
  it("θ=bで最大になる(困難度付近が最も情報量が高い)", () => {
    const item = { a: 1.5, b: 0.5 };
    const atB = itemInformation(0.5, item);
    const away = itemInformation(2.5, item);
    expect(atB).toBeGreaterThan(away);
  });

  it("識別力aが大きいほどθ=bでの最大情報量も大きい", () => {
    const low = itemInformation(0, { a: 1, b: 0 });
    const high = itemInformation(0, { a: 3, b: 0 });
    expect(high).toBeGreaterThan(low);
  });
});

describe("logLikelihoodTheta / mleTheta", () => {
  it("全問正解なら高い能力ほど対数尤度が高い傾向(未回答はスキップされる)", () => {
    const responses: (0 | 1 | undefined)[] = DEFAULT_ITEMS.map(() => 1);
    const low = logLikelihoodTheta(-3, DEFAULT_ITEMS, responses);
    const high = logLikelihoodTheta(3, DEFAULT_ITEMS, responses);
    expect(high).toBeGreaterThan(low);
  });

  it("全問不正解なら低い能力ほど対数尤度が高い", () => {
    const responses: (0 | 1 | undefined)[] = DEFAULT_ITEMS.map(() => 0);
    const low = logLikelihoodTheta(-3, DEFAULT_ITEMS, responses);
    const high = logLikelihoodTheta(3, DEFAULT_ITEMS, responses);
    expect(low).toBeGreaterThan(high);
  });

  it("全問正解のMLEはθ範囲の上限付近に張り付く", () => {
    const responses: (0 | 1 | undefined)[] = DEFAULT_ITEMS.map(() => 1);
    const theta = mleTheta(DEFAULT_ITEMS, responses, -4, 4, 200);
    expect(theta).toBeGreaterThan(2.5);
  });

  it("全問不正解のMLEはθ範囲の下限付近に張り付く", () => {
    const responses: (0 | 1 | undefined)[] = DEFAULT_ITEMS.map(() => 0);
    const theta = mleTheta(DEFAULT_ITEMS, responses, -4, 4, 200);
    expect(theta).toBeLessThan(-2.5);
  });

  it("未回答のみ(全部undefined)は対数尤度0(一様)で、MLEはグリッド探索の初期値(下限)になる", () => {
    const responses: (0 | 1 | undefined)[] = DEFAULT_ITEMS.map(() => undefined);
    expect(logLikelihoodTheta(0, DEFAULT_ITEMS, responses)).toBe(0);
  });

  it("困難度に対応する数の項目に正解し、残りに不正解なら、MLEはその困難度帯に近い値になる(標準的な受験者パターン)", () => {
    // DEFAULT_ITEMSはb=-1.5,-0.5,0,0.8,1.8の順。b<=0の3問正解・残り2問不正解、という「中位の受験者」パターン。
    const responses: (0 | 1 | undefined)[] = [1, 1, 1, 0, 0];
    const theta = mleTheta(DEFAULT_ITEMS, responses, -4, 4, 400);
    expect(theta).toBeGreaterThan(-1);
    expect(theta).toBeLessThan(1.5);
  });
});

describe("likelihoodCurve", () => {
  it("ピークの相対尤度がちょうど1になる(正規化)", () => {
    const responses: (0 | 1 | undefined)[] = [1, 1, 0, 0, 0];
    const curve = likelihoodCurve(DEFAULT_ITEMS, responses, -4, 4, 161);
    const maxLik = Math.max(...curve.map((p) => p.lik));
    expect(maxLik).toBeCloseTo(1, 10);
  });

  it("回答が増えるほど尤度曲線が尖る(ピーク近傍での相対尤度の裾が狭くなる)", () => {
    const fewResponses: (0 | 1 | undefined)[] = [1, 1, undefined, undefined, undefined];
    const manyResponses: (0 | 1 | undefined)[] = [1, 1, 1, 0, 0];
    const widthAt = (responses: (0 | 1 | undefined)[]) => {
      const curve = likelihoodCurve(DEFAULT_ITEMS, responses, -4, 4, 321);
      // lik >= 0.5 となるthetaの範囲の幅(半値幅)を尖り具合の指標にする。
      const above = curve.filter((p) => p.lik >= 0.5);
      return above[above.length - 1].theta - above[0].theta;
    };
    expect(widthAt(manyResponses)).toBeLessThan(widthAt(fewResponses));
  });
});

describe("answeredCount / correctCount", () => {
  it("未回答を除いた回答数・正答数を数える", () => {
    const responses: (0 | 1 | undefined)[] = [1, 0, undefined, 1, undefined];
    expect(answeredCount(responses)).toBe(3);
    expect(correctCount(responses)).toBe(2);
  });
});
