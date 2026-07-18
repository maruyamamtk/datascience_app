import { describe, expect, it } from "vitest";
import {
  centerVector,
  fitRegularized,
  lassoCoordinateDescent,
  linspace,
  logspace,
  makeLcg,
  meanSquaredError,
  polyFeaturesNoConst,
  predictRegularized,
  pseudoGaussian,
  regularizationPath,
  ridgeFit,
  rootMeanSquaredError,
  solveLinearSystem,
  softThreshold,
  standardizeColumns,
} from "./regularization-sparse";

describe("polyFeaturesNoConst", () => {
  it("定数項を含まない [x, x², …] を返す", () => {
    expect(polyFeaturesNoConst(2, 3)).toEqual([2, 4, 8]);
  });
});

describe("solveLinearSystem", () => {
  it("単位行列は b をそのまま返す", () => {
    expect(
      solveLinearSystem(
        [
          [1, 0],
          [0, 1],
        ],
        [3, 5],
      ),
    ).toEqual([3, 5]);
  });

  it("部分ピボットが必要な系も解ける", () => {
    const sol = solveLinearSystem(
      [
        [0, 1],
        [1, 1],
      ],
      [2, 3],
    );
    expect(sol[0]).toBeCloseTo(1, 8);
    expect(sol[1]).toBeCloseTo(2, 8);
  });
});

describe("standardizeColumns / centerVector", () => {
  it("各列の平均0・標準偏差1にする", () => {
    const { Xs, mean, std } = standardizeColumns([[1], [2], [3]]);
    expect(mean[0]).toBeCloseTo(2, 8);
    expect(std[0]).toBeCloseTo(Math.sqrt(2 / 3), 8);
    const m2 = Xs.reduce((s, r) => s + r[0], 0) / Xs.length;
    expect(m2).toBeCloseTo(0, 8);
  });

  it("分散0の列はゼロ割りせず1として扱う", () => {
    const { Xs, std } = standardizeColumns([[5], [5], [5]]);
    expect(std[0]).toBe(1);
    expect(Xs.every((r) => r[0] === 0)).toBe(true);
  });

  it("centerVector は平均を引く", () => {
    const { yc, mean } = centerVector([1, 2, 3]);
    expect(mean).toBeCloseTo(2, 8);
    expect(yc).toEqual([-1, 0, 1]);
  });
});

describe("softThreshold", () => {
  it("|z|<=gamma は0", () => {
    expect(softThreshold(0.5, 1)).toBe(0);
    expect(softThreshold(-0.5, 1)).toBe(0);
    expect(softThreshold(1, 1)).toBe(0);
  });
  it("z>gamma は z-gamma", () => {
    expect(softThreshold(3, 1)).toBeCloseTo(2, 8);
  });
  it("z<-gamma は z+gamma", () => {
    expect(softThreshold(-3, 1)).toBeCloseTo(-2, 8);
  });
});

// y = 2*x1 (x2は無関係なノイズ変数) の単純な合成データで Ridge/Lasso の性質を確認する。
function syntheticXy() {
  const n = 40;
  const rng = makeLcg(777);
  const x1: number[] = [];
  const x2: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = rng() * 2 - 1;
    const b = rng() * 2 - 1;
    x1.push(a);
    x2.push(b);
    y.push(2 * a + 0.05 * pseudoGaussian(rng));
  }
  const X = x1.map((v, i) => [v, x2[i]]);
  const { Xs, mean, std } = standardizeColumns(X);
  const { yc } = centerVector(y);
  return { Xs, yc, mean, std };
}

describe("ridgeFit", () => {
  it("λ=0 は最小二乗に近い解を返す（x1の係数が大きく、x2はほぼ0）", () => {
    const { Xs, yc } = syntheticXy();
    const beta = ridgeFit(Xs, yc, 0);
    expect(Math.abs(beta[0])).toBeGreaterThan(Math.abs(beta[1]) * 5);
  });

  it("λを大きくすると係数は0へ縮小する（ただし通常ちょうど0にはならない）", () => {
    const { Xs, yc } = syntheticXy();
    const small = ridgeFit(Xs, yc, 0.01);
    const large = ridgeFit(Xs, yc, 500);
    expect(Math.abs(large[0])).toBeLessThan(Math.abs(small[0]));
    expect(large[0]).not.toBe(0);
  });
});

describe("lassoCoordinateDescent", () => {
  it("λ=0 はOLSに近い解を返す", () => {
    const { Xs, yc } = syntheticXy();
    const beta = lassoCoordinateDescent(Xs, yc, 0);
    expect(beta[0]).toBeGreaterThan(1);
  });

  it("λを十分大きくすると無関係な変数の係数をちょうど0にする（スパース化）", () => {
    const { Xs, yc } = syntheticXy();
    const beta = lassoCoordinateDescent(Xs, yc, 5);
    expect(beta[1]).toBe(0);
    expect(beta[0]).not.toBe(0);
  });

  it("λが極端に大きいとすべての係数がちょうど0になる", () => {
    const { Xs, yc } = syntheticXy();
    const beta = lassoCoordinateDescent(Xs, yc, 1000);
    expect(beta.every((b) => b === 0)).toBe(true);
  });
});

describe("regularizationPath", () => {
  it("Lasso: λが大きくなるにつれ非ゼロ係数の数は増加しない（単調非増加の大枠を保つ）", () => {
    const { Xs, yc } = syntheticXy();
    const lambdas = logspace(-3, 3, 12);
    const betas = regularizationPath(Xs, yc, lambdas, "lasso");
    const nonzeroCounts = betas.map((b) => b.filter((v) => v !== 0).length);
    for (let i = 1; i < nonzeroCounts.length; i++) {
      expect(nonzeroCounts[i]).toBeLessThanOrEqual(nonzeroCounts[i - 1] + 0); // 単調非増加
    }
    expect(nonzeroCounts[nonzeroCounts.length - 1]).toBe(0);
  });

  it("Ridge: λが大きくなっても係数は0にならない（非ゼロ数は一定）", () => {
    const { Xs, yc } = syntheticXy();
    const lambdas = logspace(-3, 3, 8);
    const betas = regularizationPath(Xs, yc, lambdas, "ridge");
    for (const b of betas) {
      expect(b.every((v) => v !== 0)).toBe(true);
    }
  });
});

describe("fitRegularized / predictRegularized", () => {
  it("小さいλでは訓練点をよく再現する", () => {
    const xs = linspace(0, 1, 8);
    const ys = xs.map((x) => Math.sin(2 * Math.PI * x));
    const fit = fitRegularized(xs, ys, 5, 1e-6, "ridge");
    const preds = xs.map((x) => predictRegularized(fit, x));
    expect(rootMeanSquaredError(preds, ys)).toBeLessThan(0.05);
  });

  it("Lasso で大きいλにすると訓練誤差は悪化する（強い縮小）", () => {
    const xs = linspace(0, 1, 8);
    const ys = xs.map((x) => Math.sin(2 * Math.PI * x));
    const loose = fitRegularized(xs, ys, 5, 1e-6, "lasso");
    const tight = fitRegularized(xs, ys, 5, 50, "lasso");
    const looseErr = rootMeanSquaredError(
      xs.map((x) => predictRegularized(loose, x)),
      ys,
    );
    const tightErr = rootMeanSquaredError(
      xs.map((x) => predictRegularized(tight, x)),
      ys,
    );
    expect(tightErr).toBeGreaterThan(looseErr);
  });
});

describe("makeLcg / pseudoGaussian", () => {
  it("同じシードなら同じ列を返す（決定的）", () => {
    const a = makeLcg(42);
    const b = makeLcg(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("pseudoGaussianは概ね0付近に分布する", () => {
    const rng = makeLcg(1);
    const samples = Array.from({ length: 1000 }, () => pseudoGaussian(rng));
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.15);
  });
});

describe("meanSquaredError / rootMeanSquaredError", () => {
  it("一致すれば0", () => {
    expect(meanSquaredError([1, 2], [1, 2])).toBe(0);
    expect(rootMeanSquaredError([1, 2], [1, 2])).toBe(0);
  });
});

describe("linspace / logspace", () => {
  it("linspace は端点を含み等分する", () => {
    expect(linspace(0, 1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
  it("logspace は 10^linspace になる", () => {
    const ls = logspace(-1, 1, 3);
    expect(ls[0]).toBeCloseTo(0.1, 10);
    expect(ls[1]).toBeCloseTo(1, 10);
    expect(ls[2]).toBeCloseTo(10, 10);
  });
});
