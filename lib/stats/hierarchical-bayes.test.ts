import { describe, expect, it } from "vitest";
import {
  DEFAULT_GROUPS,
  DEFAULT_MIXTURE,
  DEFAULT_REGRESSION_DATA,
  GROUP_SAMPLE_SIZES,
  REGRESSION_N,
  REGRESSION_TRUE_SLOPE,
  TRUE_GRAND_MEAN,
  bayesianLinearRegression,
  centerX,
  compareEstimates,
  generateGroups,
  generateMixtureData,
  generateRegressionData,
  grandMean,
  partialPoolingMean,
  pooledWithinVariance,
  precisionWeightedMean,
  responsibility,
  scaledGaussian,
  shrinkageWeight,
} from "./hierarchical-bayes";
import { mulberry32 } from "./random";

describe("generateGroups", () => {
  it("同じシードなら決定的に同じデータを返す", () => {
    const a = generateGroups();
    const b = generateGroups();
    expect(a).toEqual(b);
  });

  it("指定したサンプルサイズ通りのグループ数・生徒数になる", () => {
    const groups = generateGroups();
    expect(groups.length).toBe(GROUP_SAMPLE_SIZES.length);
    groups.forEach((g, i) => {
      expect(g.n).toBe(GROUP_SAMPLE_SIZES[i]);
      expect(g.values.length).toBe(GROUP_SAMPLE_SIZES[i]);
    });
  });

  it("グループの標本平均は真の全体平均から大きく外れない（生成過程が正しい）", () => {
    const groups = generateGroups();
    groups.forEach((g) => {
      expect(Math.abs(g.sampleMean - TRUE_GRAND_MEAN)).toBeLessThan(30);
    });
  });

  it("サンプルサイズが小さい順に並んでいる（shrinkageのストーリーに使う前提）", () => {
    for (let i = 1; i < GROUP_SAMPLE_SIZES.length; i++) {
      expect(GROUP_SAMPLE_SIZES[i]).toBeGreaterThan(GROUP_SAMPLE_SIZES[i - 1]);
    }
  });
});

describe("pooledWithinVariance / grandMean", () => {
  it("プール分散は正の値になる", () => {
    expect(pooledWithinVariance(DEFAULT_GROUPS)).toBeGreaterThan(0);
  });

  it("全体平均は真の全体平均に近い値になる（データ点数が多いので誤差は小さめ）", () => {
    const mu = grandMean(DEFAULT_GROUPS);
    expect(Math.abs(mu - TRUE_GRAND_MEAN)).toBeLessThan(10);
  });
});

describe("precisionWeightedMean", () => {
  it("両方の精度が等しいとき、ちょうど中間の値になる", () => {
    expect(precisionWeightedMean(10, 1, 20, 1)).toBeCloseTo(15, 10);
  });

  it("データ側の精度が圧倒的に高いとき、データ平均にほぼ一致する", () => {
    const v = precisionWeightedMean(10, 1000, 20, 1);
    expect(v).toBeCloseTo(10, 1);
  });

  it("事前側の精度が圧倒的に高いとき、事前平均にほぼ一致する", () => {
    const v = precisionWeightedMean(10, 1, 20, 1000);
    expect(v).toBeCloseTo(20, 1);
  });

  it("両方の精度が0なら事前平均を返す(0除算を起こさない)", () => {
    expect(precisionWeightedMean(10, 0, 20, 0)).toBe(20);
  });
});

describe("shrinkageWeight", () => {
  it("τ²→0（グループ間ばらつきなし）で重みは1(完全プール)に近づく", () => {
    expect(shrinkageWeight(10, 5, 0.0001)).toBeCloseTo(1, 2);
  });

  it("τ²が非常に大きい（グループ間は無関係）で重みは0(プールなし)に近づく", () => {
    expect(shrinkageWeight(10, 5, 1e9)).toBeCloseTo(0, 2);
  });

  it("τ²=0はちょうど1を返す(完全プールの境界値)", () => {
    expect(shrinkageWeight(10, 5, 0)).toBe(1);
  });

  it("τ²=Infinityはちょうど0を返す(プールなしの境界値)", () => {
    expect(shrinkageWeight(10, 5, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("サンプルサイズnが大きいグループほど重みは小さくなる(縮小されにくい)", () => {
    const small = shrinkageWeight(5, 100, 36);
    const large = shrinkageWeight(40, 100, 36);
    expect(large).toBeLessThan(small);
  });

  it("n=0(新しいグループにはまだデータが無い)のとき重みは1になる(完全にμへ一致、新グループへの事後予測の極限)", () => {
    expect(shrinkageWeight(0, 5, 36)).toBe(1);
  });

  it("n<0(不正入力)でも重みは1を返す(0除算やNaNにならない)", () => {
    expect(shrinkageWeight(-3, 5, 36)).toBe(1);
  });

  it("重みは常に[0,1]の範囲に収まる", () => {
    for (const n of [1, 5, 20, 100]) {
      for (const tau2 of [0.01, 1, 36, 100, 10000]) {
        const w = shrinkageWeight(n, 50, tau2);
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("compareEstimates（プールなし・完全プール・部分プーリングの3通り比較）", () => {
  it("τ²が非常に小さいと、部分プーリング推定は全グループでほぼ同じ値(完全プール)に一致する", () => {
    const estimates = compareEstimates(DEFAULT_GROUPS, 0.0001);
    const mu = grandMean(DEFAULT_GROUPS);
    estimates.forEach((e) => {
      expect(e.partialPooling).toBeCloseTo(mu, 1);
      expect(e.completePooling).toBeCloseTo(mu, 10);
    });
  });

  it("τ²が非常に大きいと、部分プーリング推定は各グループの標本平均(プールなし)に一致する", () => {
    const estimates = compareEstimates(DEFAULT_GROUPS, 1e9);
    estimates.forEach((e) => {
      expect(e.partialPooling).toBeCloseTo(e.noPooling, 1);
    });
  });

  it("中間のτ²では、部分プーリング推定はプールなしと完全プールの間に位置する", () => {
    const estimates = compareEstimates(DEFAULT_GROUPS, 36);
    estimates.forEach((e) => {
      const lo = Math.min(e.noPooling, e.completePooling);
      const hi = Math.max(e.noPooling, e.completePooling);
      expect(e.partialPooling).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(e.partialPooling).toBeLessThanOrEqual(hi + 1e-9);
    });
  });

  it("サンプルサイズが最も小さいグループの方が、最も大きいグループより縮小の重みが大きい", () => {
    const estimates = compareEstimates(DEFAULT_GROUPS, 36);
    const smallest = estimates[0]; // n=5 (最小)
    const largest = estimates[estimates.length - 1]; // n=40 (最大)
    expect(smallest.group.n).toBeLessThan(largest.group.n);
    expect(smallest.weight).toBeGreaterThan(largest.weight);
  });
});

describe("partialPoolingMean", () => {
  it("weight=0でプールなし(sampleMean)に一致する", () => {
    expect(partialPoolingMean(10, 20, 0)).toBe(10);
  });
  it("weight=1で完全プール(mu)に一致する", () => {
    expect(partialPoolingMean(10, 20, 1)).toBe(20);
  });
});

describe("bayesianLinearRegression（ベイズ線形回帰の傾きの縮小）", () => {
  it("事前分散が非常に大きい（無情報事前分布）とき、傾きの事後平均はOLSにほぼ一致する", () => {
    const r = bayesianLinearRegression(DEFAULT_REGRESSION_DATA, 200, 1e9);
    expect(r.slopePosterior).toBeCloseTo(r.slopeOls, 1);
    expect(r.slopeWeight).toBeCloseTo(0, 2);
  });

  it("事前分散が非常に小さい（強い正則化）とき、傾きの事後平均は事前平均0に近づく", () => {
    const r = bayesianLinearRegression(DEFAULT_REGRESSION_DATA, 200, 1e-6);
    expect(Math.abs(r.slopePosterior)).toBeLessThan(0.5);
    expect(r.slopeWeight).toBeCloseTo(1, 2);
  });

  it("事後平均の傾きは常にOLSと事前平均0の間に位置する（縮小推定）", () => {
    const r = bayesianLinearRegression(DEFAULT_REGRESSION_DATA, 200, 40);
    const lo = Math.min(0, r.slopeOls);
    const hi = Math.max(0, r.slopeOls);
    expect(r.slopePosterior).toBeGreaterThanOrEqual(lo - 1e-9);
    expect(r.slopePosterior).toBeLessThanOrEqual(hi + 1e-9);
  });

  it("中心化により切片はyの標本平均に一致する", () => {
    const r = bayesianLinearRegression(DEFAULT_REGRESSION_DATA, 200, 40);
    const yBar = DEFAULT_REGRESSION_DATA.reduce((a, p) => a + p.y, 0) / DEFAULT_REGRESSION_DATA.length;
    expect(r.interceptOls).toBeCloseTo(yBar, 10);
    expect(r.interceptPosterior).toBeCloseTo(yBar, 10);
  });

  it("OLSの傾きは真の傾き(3)に近い符号・オーダーになる(生成データの妥当性確認)", () => {
    const r = bayesianLinearRegression(DEFAULT_REGRESSION_DATA, 200, 1e9);
    expect(r.slopeOls).toBeGreaterThan(0);
  });
});

describe("generateRegressionData / centerX", () => {
  it("既定件数分のデータを決定的に生成する", () => {
    const a = generateRegressionData();
    const b = generateRegressionData();
    expect(a).toEqual(b);
    expect(a.length).toBe(REGRESSION_N);
  });

  it("中心化後のxの平均はほぼ0になる", () => {
    const { xc } = centerX(DEFAULT_REGRESSION_DATA);
    const m = xc.reduce((a, b) => a + b, 0) / xc.length;
    expect(m).toBeCloseTo(0, 8);
  });

  it("真の傾きは正である(REGRESSION_TRUE_SLOPE)", () => {
    expect(REGRESSION_TRUE_SLOPE).toBeGreaterThan(0);
  });
});

describe("responsibility（潜在変数モデル: 混合分布の事後所属確率）", () => {
  it("2つの確率の和は常に1になる", () => {
    for (const x of [10, 40, 55, 75, 100]) {
      const r = responsibility(x, DEFAULT_MIXTURE);
      expect(r[0] + r[1]).toBeCloseTo(1, 10);
    }
  });

  it("最初の成分の平均そのものでは、最初の成分への所属確率が高い", () => {
    const r = responsibility(DEFAULT_MIXTURE[0].mu, DEFAULT_MIXTURE);
    expect(r[0]).toBeGreaterThan(r[1]);
  });

  it("2番目の成分の平均そのものでは、2番目の成分への所属確率が高い", () => {
    const r = responsibility(DEFAULT_MIXTURE[1].mu, DEFAULT_MIXTURE);
    expect(r[1]).toBeGreaterThan(r[0]);
  });

  it("2成分のちょうど中間点に近い付近では所属確率が拮抗する（sigmaが異なるため厳密に0.5:0.5ではない）", () => {
    const mid = (DEFAULT_MIXTURE[0].mu + DEFAULT_MIXTURE[1].mu) / 2;
    const r = responsibility(mid, DEFAULT_MIXTURE);
    expect(Math.abs(r[0] - r[1])).toBeLessThan(0.35);
  });
});

describe("generateMixtureData", () => {
  it("決定的に同じデータを返す", () => {
    const a = generateMixtureData();
    const b = generateMixtureData();
    expect(a).toEqual(b);
  });

  it("生成したtrueComponentは0か1のみ", () => {
    const data = generateMixtureData();
    data.forEach((p) => expect([0, 1]).toContain(p.trueComponent));
  });
});

describe("scaledGaussian", () => {
  it("sd<=0のとき常に0を返す", () => {
    const rng = mulberry32(1);
    expect(scaledGaussian(rng, 0)).toBe(0);
    expect(scaledGaussian(rng, -1)).toBe(0);
  });

  it("同じシードから決定的に同じ値を返す", () => {
    expect(scaledGaussian(mulberry32(42), 3)).toBe(scaledGaussian(mulberry32(42), 3));
  });
});
