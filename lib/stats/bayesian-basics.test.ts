import { describe, expect, it } from "vitest";
import {
  bayesFactor10,
  betaMean,
  betaMode,
  betaPdfCurve,
  betaVariance,
  binomialTwoSidedPValue,
  COIN_SEQUENCE,
  DEFAULT_PRIOR,
  findDecisionBoundaries,
  interpretBayesFactor,
  logBinomialCoeff,
  marginalLogLikelihoodBetaBinomial,
  oddsToProbability,
  pointNullLogLikelihood,
  posteriorMeanTrajectory,
  posteriorOddsFromBayesFactor,
  posteriorProbClass1,
  priorOddsFromProb,
  sequentialUpdates,
  symmetricBetaPrior,
  updateBetaWithCounts,
  weightedLikelihoodCurves,
} from "./bayesian-basics";

describe("ベータ分布の基本量", () => {
  it("Beta(1,1)は一様分布なので平均0.5・分散1/12", () => {
    expect(betaMean({ alpha: 1, beta: 1 })).toBeCloseTo(0.5, 10);
    expect(betaVariance({ alpha: 1, beta: 1 })).toBeCloseTo(1 / 12, 10);
  });

  it("Beta(6,4)の平均はα/(α+β)=0.6", () => {
    expect(betaMean({ alpha: 6, beta: 4 })).toBeCloseTo(0.6, 10);
  });

  it("betaModeはα>1かつβ>1のとき(α-1)/(α+β-2)", () => {
    expect(betaMode({ alpha: 6, beta: 4 })).toBeCloseTo(5 / 8, 10);
  });

  it("betaModeはα≤1かつβ≤1(Beta(1,1)一様)のとき一意でないためNaN", () => {
    expect(Number.isNaN(betaMode({ alpha: 1, beta: 1 }))).toBe(true);
  });

  it("betaModeはα≤1<βのとき0、β≤1<αのとき1に張り付く", () => {
    expect(betaMode({ alpha: 1, beta: 5 })).toBe(0);
    expect(betaMode({ alpha: 5, beta: 1 })).toBe(1);
  });

  it("betaPdfCurveは指定した点数を返し、境界(0,1)ちょうどは含まない(発散回避)", () => {
    const curve = betaPdfCurve({ alpha: 2, beta: 2 }, 51);
    expect(curve).toHaveLength(51);
    expect(curve[0].x).toBeGreaterThan(0);
    expect(curve[curve.length - 1].x).toBeLessThan(1);
    for (const { y } of curve) expect(Number.isFinite(y)).toBe(true);
  });

  it("Beta(2,2)は対称なので中央(x=0.5)が最大", () => {
    const curve = betaPdfCurve({ alpha: 2, beta: 2 }, 101);
    const peak = curve.reduce((a, b) => (b.y > a.y ? b : a));
    expect(peak.x).toBeCloseTo(0.5, 1);
  });
});

describe("共役事前分布の更新(ベータ-二項)", () => {
  it("updateBetaWithCountsはα←α+成功数, β←β+失敗数", () => {
    const posterior = updateBetaWithCounts({ alpha: 1, beta: 1 }, 3, 2);
    expect(posterior).toEqual({ alpha: 4, beta: 3 });
  });

  it("symmetricBetaPriorはα=β=weight", () => {
    expect(symmetricBetaPrior(5)).toEqual({ alpha: 5, beta: 5 });
  });

  it("sequentialUpdatesは長さobservations+1で、先頭は事前分布そのまま", () => {
    const steps = sequentialUpdates(DEFAULT_PRIOR, COIN_SEQUENCE);
    expect(steps).toHaveLength(COIN_SEQUENCE.length + 1);
    expect(steps[0].observation).toBeNull();
    expect(steps[0].posterior).toEqual(DEFAULT_PRIOR);
  });

  it("sequentialUpdatesの最終ステップはα=prior.alpha+総成功数, β=prior.beta+総失敗数", () => {
    const steps = sequentialUpdates(DEFAULT_PRIOR, COIN_SEQUENCE);
    const successes = COIN_SEQUENCE.filter((v) => v === 1).length;
    const failures = COIN_SEQUENCE.length - successes;
    const last = steps[steps.length - 1];
    expect(last.posterior.alpha).toBeCloseTo(DEFAULT_PRIOR.alpha + successes, 10);
    expect(last.posterior.beta).toBeCloseTo(DEFAULT_PRIOR.beta + failures, 10);
    expect(last.successesSoFar).toBe(successes);
    expect(last.failuresSoFar).toBe(failures);
  });

  it("各ステップのalpha+betaは前ステップよりちょうど1大きい(観測1件ごとに合計が1ずつ増える)", () => {
    const steps = sequentialUpdates(DEFAULT_PRIOR, COIN_SEQUENCE);
    for (let i = 1; i < steps.length; i++) {
      const prevSum = steps[i - 1].posterior.alpha + steps[i - 1].posterior.beta;
      const curSum = steps[i].posterior.alpha + steps[i].posterior.beta;
      expect(curSum).toBeCloseTo(prevSum + 1, 10);
    }
  });

  it("posteriorMeanTrajectoryは長さobservations+1で、事前分布が強い(weight大)ほど動きが小さい", () => {
    const weak = posteriorMeanTrajectory(1, COIN_SEQUENCE);
    const strong = posteriorMeanTrajectory(20, COIN_SEQUENCE);
    expect(weak).toHaveLength(COIN_SEQUENCE.length + 1);
    expect(strong).toHaveLength(COIN_SEQUENCE.length + 1);
    // 最初の3投は表が続く(見かけ上「表が出やすい」)ので、弱い事前分布の方が平均が大きく動く。
    const weakMove = Math.abs(weak[3] - weak[0]);
    const strongMove = Math.abs(strong[3] - strong[0]);
    expect(weakMove).toBeGreaterThan(strongMove);
  });
});

describe("ベイズファクター・ベイズ的仮説検定", () => {
  it("Beta(1,1)一様事前分布のベータ-二項周辺尤度はkによらず1/(n+1)(古典的な既知の恒等式)", () => {
    const n = 10;
    for (let k = 0; k <= n; k++) {
      const logM = marginalLogLikelihoodBetaBinomial({ alpha: 1, beta: 1 }, n, k);
      expect(Math.exp(logM)).toBeCloseTo(1 / (n + 1), 8);
    }
  });

  it("pointNullLogLikelihoodはtheta0=0.5, n=10,k=5で二項尤度C(10,5)*0.5^10と一致", () => {
    const n = 10;
    const k = 5;
    const expected = Math.exp(logBinomialCoeff(n, k)) * 0.5 ** n;
    expect(Math.exp(pointNullLogLikelihood(0.5, n, k))).toBeCloseTo(expected, 8);
  });

  it("観測がtheta0にちょうど一致する(n=10,k=5,theta0=0.5)とき、無情報事前分布Beta(1,1)のBF10は1に近い", () => {
    const bf = bayesFactor10(10, 5, 0.5, { alpha: 1, beta: 1 });
    // 一様事前分布の周辺尤度は1/(n+1)=1/11、点仮説の尤度はBinomial(10,5,0.5)の最頻値なので
    // BF10はおおよそ(n+1)倍の逆数程度になり、1よりわずかに小さい程度の値になる。
    expect(bf).toBeGreaterThan(0);
    expect(Number.isFinite(bf)).toBe(true);
  });

  it("観測が極端(n=20,k=20,theta0=0.5)なとき、BF10は1よりずっと大きくH1(θ不明)を強く支持する", () => {
    const bf = bayesFactor10(20, 20, 0.5, { alpha: 1, beta: 1 });
    expect(bf).toBeGreaterThan(30);
    expect(interpretBayesFactor(bf).favors).toBe("H1");
  });

  it("interpretBayesFactorはJeffreys/Lee&Wagenmakersの目安に沿って強さを分類する", () => {
    expect(interpretBayesFactor(1.5).strength).toBe("anecdotal");
    expect(interpretBayesFactor(5).strength).toBe("moderate");
    expect(interpretBayesFactor(15).strength).toBe("strong");
    expect(interpretBayesFactor(50).strength).toBe("very-strong");
    expect(interpretBayesFactor(500).strength).toBe("extreme");
    // 逆方向(H0支持)でも比の絶対値で同じ目安になる。
    expect(interpretBayesFactor(1 / 50).strength).toBe("very-strong");
    expect(interpretBayesFactor(1 / 50).favors).toBe("H0");
  });

  it("priorOddsFromProb/posteriorOddsFromBayesFactor/oddsToProbabilityは事後オッズ=BF×事前オッズの関係を満たす", () => {
    const priorOdds = priorOddsFromProb(0.5); // = 1
    expect(priorOdds).toBeCloseTo(1, 10);
    const bf = 4;
    const postOdds = posteriorOddsFromBayesFactor(bf, priorOdds);
    expect(postOdds).toBeCloseTo(4, 10);
    expect(oddsToProbability(postOdds)).toBeCloseTo(0.8, 10);
  });

  it("binomialTwoSidedPValueはtheta0ちょうどに一致する観測でp値=1に近い", () => {
    const p = binomialTwoSidedPValue(10, 5, 0.5);
    expect(p).toBeCloseTo(1, 5);
  });

  it("binomialTwoSidedPValueは極端な観測(n=20,k=20,theta0=0.5)で非常に小さい", () => {
    const p = binomialTwoSidedPValue(20, 20, 0.5);
    expect(p).toBeLessThan(0.001);
  });
});

describe("ベイズ判別(事後確率に基づく分類)", () => {
  const class0 = { mean: 3, sd: 2 };
  const class1 = { mean: 8, sd: 2 };

  it("等分散2クラスで事前確率0.5なら、決定境界は2クラスの中点になる", () => {
    const boundaries = findDecisionBoundaries(0.5, class0, class1, -5, 15, 800);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0]).toBeCloseTo(5.5, 1);
  });

  it("クラス1の事前確率を上げると、決定境界はクラス0側(左)へ動く(クラス1と判定されやすくなる)", () => {
    const [bLow] = findDecisionBoundaries(0.5, class0, class1, -5, 15, 800);
    const [bHigh] = findDecisionBoundaries(0.9, class0, class1, -5, 15, 800);
    expect(bHigh).toBeLessThan(bLow);
  });

  it("中点ちょうどでは事後確率がほぼ0.5(等分散・事前確率0.5のとき)", () => {
    const p = posteriorProbClass1(5.5, 0.5, class0, class1);
    expect(p).toBeCloseTo(0.5, 2);
  });

  it("クラス1の平均に近いxほど事後確率P(class=1|x)は1に近づく", () => {
    const pNear1 = posteriorProbClass1(8, 0.5, class0, class1);
    const pNear0 = posteriorProbClass1(3, 0.5, class0, class1);
    expect(pNear1).toBeGreaterThan(0.9);
    expect(pNear0).toBeLessThan(0.1);
  });

  it("weightedLikelihoodCurvesの2曲線の交点は決定境界と一致する", () => {
    const curve = weightedLikelihoodCurves(0.5, class0, class1, -4, 15, 401);
    const [boundary] = findDecisionBoundaries(0.5, class0, class1, -4, 15, 800);
    // 交点付近で w0≈w1 になっているはず。
    const nearest = curve.reduce((a, b) =>
      Math.abs(a.x - boundary) < Math.abs(b.x - boundary) ? a : b,
    );
    expect(nearest.w0).toBeCloseTo(nearest.w1, 2);
  });

  it("weightedLikelihoodCurvesはprior1を上げるとw1(クラス1側)がw0より全体的に持ち上がる", () => {
    const low = weightedLikelihoodCurves(0.2, class0, class1, -4, 15, 51);
    const high = weightedLikelihoodCurves(0.8, class0, class1, -4, 15, 51);
    const sumW1Low = low.reduce((a, p) => a + p.w1, 0);
    const sumW1High = high.reduce((a, p) => a + p.w1, 0);
    expect(sumW1High).toBeGreaterThan(sumW1Low);
  });
});
