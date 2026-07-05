import { describe, expect, it } from "vitest";
import {
  biasVarianceDecomposition,
  bootstrapIndices,
  fitPolynomial,
  kFoldIndices,
  linspace,
  makeLcg,
  meanSquaredError,
  polyFeatures,
  polynomialMSE,
  predictPolynomial,
  pseudoGaussian,
  rootMeanSquaredError,
  solveLinearSystem,
  squaredLoss,
  zeroOneLoss,
} from "./learning-framework";

describe("多項式の特徴とホーナー評価", () => {
  it("特徴ベクトルは [1, x, x², …]", () => {
    expect(polyFeatures(2, 3)).toEqual([1, 2, 4, 8]);
    expect(polyFeatures(5, 0)).toEqual([1]);
  });
  it("係数 [c0,c1,c2] の多項式を評価", () => {
    // 1 + 2x + 3x² を x=2 で → 1+4+12 = 17
    expect(predictPolynomial([1, 2, 3], 2)).toBe(17);
  });
});

describe("連立一次方程式（ガウス消去・部分ピボット）", () => {
  it("2元1次を解く", () => {
    // 2x+y=5, x−y=1 → x=2, y=1
    const sol = solveLinearSystem(
      [
        [2, 1],
        [1, -1],
      ],
      [5, 1],
    );
    expect(sol[0]).toBeCloseTo(2, 10);
    expect(sol[1]).toBeCloseTo(1, 10);
  });
  it("ピボットが必要な（先頭 0 の）系も解ける", () => {
    // 0x+2y=4, 3x+0y=9 → x=3, y=2
    const sol = solveLinearSystem(
      [
        [0, 2],
        [3, 0],
      ],
      [4, 9],
    );
    expect(sol[0]).toBeCloseTo(3, 10);
    expect(sol[1]).toBeCloseTo(2, 10);
  });
});

describe("多項式回帰の最小二乗フィット", () => {
  it("完全に直線に乗る点は次数 1 で誤差 0（切片・傾きを復元）", () => {
    const xs = [0, 1, 2, 3];
    const ys = xs.map((x) => 2 * x + 1); // y = 1 + 2x
    const c = fitPolynomial(xs, ys, 1);
    expect(c[0]).toBeCloseTo(1, 8);
    expect(c[1]).toBeCloseTo(2, 8);
    expect(polynomialMSE(c, xs, ys)).toBeCloseTo(0, 10);
  });
  it("2次関数は次数 2 で厳密に通る", () => {
    const xs = [-2, -1, 0, 1, 2];
    const ys = xs.map((x) => 3 * x * x - x + 4);
    const c = fitPolynomial(xs, ys, 2);
    expect(c[0]).toBeCloseTo(4, 6);
    expect(c[1]).toBeCloseTo(-1, 6);
    expect(c[2]).toBeCloseTo(3, 6);
  });
  it("点数 = 次数+1 なら（相異なる x で）補間して訓練誤差 0", () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = [1, 0, 3, -2, 5];
    const c = fitPolynomial(xs, ys, 4);
    expect(polynomialMSE(c, xs, ys)).toBeCloseTo(0, 6);
  });
  it("次数を上げると訓練誤差（経験誤差）は単調に減る", () => {
    const xs = linspace(-1, 1, 12);
    const ys = xs.map((x) => Math.sin(3 * x)); // わざと多項式でない
    let prev = Infinity;
    for (const d of [1, 2, 3, 4, 5]) {
      const err = polynomialMSE(fitPolynomial(xs, ys, d), xs, ys);
      expect(err).toBeLessThanOrEqual(prev + 1e-9);
      prev = err;
    }
  });
  it("リッジ λ>0 は係数を縮める（正則化）", () => {
    const xs = linspace(-1, 1, 8);
    const ys = xs.map((x) => Math.sin(4 * x));
    const norm = (c: number[]) => Math.sqrt(c.reduce((s, v) => s + v * v, 0));
    const plain = fitPolynomial(xs, ys, 5, 0);
    const ridged = fitPolynomial(xs, ys, 5, 1);
    expect(norm(ridged)).toBeLessThan(norm(plain));
  });
});

describe("損失と誤差", () => {
  it("二乗損失・0-1 損失", () => {
    expect(squaredLoss(3, 1)).toBe(4);
    expect(zeroOneLoss(1, 1)).toBe(0);
    expect(zeroOneLoss(1, 0)).toBe(1);
  });
  it("MSE と RMSE", () => {
    expect(meanSquaredError([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(meanSquaredError([2, 2], [0, 0])).toBe(4);
    expect(rootMeanSquaredError([3, 4], [0, 0])).toBeCloseTo(Math.sqrt(12.5), 10);
  });
});

describe("決定的 LCG と近似ガウス", () => {
  it("同じ seed は同じ列（engine 非依存の決定性）", () => {
    const a = makeLcg(42);
    const b = makeLcg(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("近似ガウスは平均 0 付近（多数平均）", () => {
    const rng = makeLcg(7);
    let sum = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) sum += pseudoGaussian(rng);
    expect(Math.abs(sum / N)).toBeLessThan(0.05);
  });
});

describe("交差検証とブートストラップ", () => {
  it("k 分割は全データをちょうど 1 回ずつ検証に回す", () => {
    const folds = kFoldIndices(10, 5);
    expect(folds).toHaveLength(5);
    const seenVal = new Set<number>();
    for (const { trainIdx, valIdx } of folds) {
      expect(trainIdx.length + valIdx.length).toBe(10);
      for (const i of valIdx) {
        expect(seenVal.has(i)).toBe(false);
        seenVal.add(i);
      }
    }
    expect(seenVal.size).toBe(10);
  });
  it("均等割り切れない n も過不足なく分割", () => {
    const folds = kFoldIndices(7, 3); // 2,2,3 など
    const total = folds.reduce((s, f) => s + f.valIdx.length, 0);
    expect(total).toBe(7);
  });
  it("ブートストラップは n 個の添字を 0..n-1 から復元抽出", () => {
    const idx = bootstrapIndices(5, makeLcg(1));
    expect(idx).toHaveLength(5);
    for (const i of idx) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(5);
      expect(Number.isInteger(i)).toBe(true);
    }
  });
});

describe("バイアス分散分解（MSE = バイアス² + 分散）", () => {
  it("全モデルが同一予測なら分散 0・バイアスだけ", () => {
    const preds = [
      [2, 2],
      [2, 2],
      [2, 2],
    ];
    const truth = [0, 0];
    const bv = biasVarianceDecomposition(preds, truth);
    expect(bv.avgVariance).toBeCloseTo(0, 12);
    expect(bv.avgBias2).toBeCloseTo(4, 12); // (2-0)²
  });
  it("平均が真値に一致すれば無バイアス、ばらつきは分散へ", () => {
    // 評価点1つ、予測 {-1,+1}、真値 0 → 平均0（無バイアス）、分散 1
    const preds = [[-1], [1]];
    const bv = biasVarianceDecomposition(preds, [0]);
    expect(bv.avgBias2).toBeCloseTo(0, 12);
    expect(bv.avgVariance).toBeCloseTo(1, 12);
  });
  it("分解した和は予測の平均二乗誤差に等しい（恒等式）", () => {
    const preds = [
      [1.5, -0.5],
      [0.5, 0.5],
      [2.5, 1.5],
    ];
    const truth = [1, 0];
    const bv = biasVarianceDecomposition(preds, truth);
    // 各評価点で E[(ŷ−f)²] を直接計算
    let directAvg = 0;
    for (let t = 0; t < truth.length; t++) {
      let e = 0;
      for (let m = 0; m < preds.length; m++) e += (preds[m][t] - truth[t]) ** 2;
      directAvg += e / preds.length;
    }
    directAvg /= truth.length;
    expect(bv.avgBias2 + bv.avgVariance).toBeCloseTo(directAvg, 10);
  });
});
