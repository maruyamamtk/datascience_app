import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random";
import {
  activate,
  activateDerivative,
  applyDropout,
  backwardPass,
  batchNormalize,
  cumulativeGradientProfile,
  dropoutMask,
  forwardPass,
  type NetParams,
  relu,
  reluDerivative,
  rbf,
  rbfDerivative,
  sgdUpdate,
  sigmoid,
  sigmoidDerivative,
} from "./neural-network-basics";

describe("活性化関数", () => {
  it("relu: 負は0、正はそのまま", () => {
    expect(relu(-3)).toBe(0);
    expect(relu(0)).toBe(0);
    expect(relu(2.5)).toBe(2.5);
  });

  it("reluDerivative: z>0で1、z<=0で0", () => {
    expect(reluDerivative(1)).toBe(1);
    expect(reluDerivative(0)).toBe(0);
    expect(reluDerivative(-1)).toBe(0);
  });

  it("sigmoid: z=0で0.5、極限で0/1に近づく", () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 10);
    expect(sigmoid(20)).toBeGreaterThan(0.999);
    expect(sigmoid(-20)).toBeLessThan(0.001);
  });

  it("sigmoidDerivative: z=0で最大値0.25", () => {
    expect(sigmoidDerivative(0)).toBeCloseTo(0.25, 10);
    expect(sigmoidDerivative(5)).toBeLessThan(0.25);
    expect(sigmoidDerivative(-5)).toBeLessThan(0.25);
  });

  it("rbf: 中心(z=0)で1、離れるほど0に近づく", () => {
    expect(rbf(0, 1)).toBeCloseTo(1, 10);
    expect(rbf(3, 1)).toBeLessThan(0.001);
    expect(rbf(1, 1)).toBeGreaterThan(rbf(2, 1));
  });

  it("rbfDerivative: 中心では0、正の側では負", () => {
    expect(rbfDerivative(0, 1)).toBeCloseTo(0, 10);
    expect(rbfDerivative(1, 1)).toBeLessThan(0);
    expect(rbfDerivative(-1, 1)).toBeGreaterThan(0);
  });

  it("activate/activateDerivative ディスパッチャが各関数と一致する", () => {
    expect(activate("relu", 2)).toBe(relu(2));
    expect(activate("sigmoid", 0.3)).toBe(sigmoid(0.3));
    expect(activate("rbf", 0.5, 2)).toBe(rbf(0.5, 2));
    expect(activateDerivative("relu", 2)).toBe(reluDerivative(2));
    expect(activateDerivative("sigmoid", 0.3)).toBe(sigmoidDerivative(0.3));
    expect(activateDerivative("rbf", 0.5, 2)).toBe(rbfDerivative(0.5, 2));
  });
});

const PARAMS: NetParams = {
  w1: [
    [0.5, -0.3],
    [0.4, 0.6],
  ],
  b1: [0.1, -0.2],
  w2: [0.8, -0.5],
  b2: 0.05,
};
const X: [number, number] = [1, 0.5];
const Y = 1;

describe("順伝播 forwardPass", () => {
  it("隠れ層の重み付き和・活性化・出力を手計算どおりに合成する（sigmoid）", () => {
    const trace = forwardPass(X, Y, PARAMS, "sigmoid");
    const z10 = 0.5 * 1 + -0.3 * 0.5 + 0.1;
    const z11 = 0.4 * 1 + 0.6 * 0.5 + -0.2;
    expect(trace.z1[0]).toBeCloseTo(z10, 10);
    expect(trace.z1[1]).toBeCloseTo(z11, 10);
    expect(trace.a1[0]).toBeCloseTo(sigmoid(z10), 10);
    expect(trace.a1[1]).toBeCloseTo(sigmoid(z11), 10);
    const z2 = 0.8 * trace.a1[0] + -0.5 * trace.a1[1] + 0.05;
    expect(trace.z2).toBeCloseTo(z2, 10);
    expect(trace.yhat).toBeCloseTo(z2, 10);
    expect(trace.loss).toBeCloseTo(0.5 * (Y - z2) ** 2, 10);
  });
});

/** 数値微分（中心差分）: パラメータを ±eps 揺らして損失の変化から勾配を近似する。 */
function numericalGradLoss(
  perturb: (p: NetParams, delta: number) => NetParams,
  activation: "relu" | "sigmoid" | "rbf",
  eps = 1e-5,
): number {
  const lossAt = (delta: number) => forwardPass(X, Y, perturb(PARAMS, delta), activation).loss;
  return (lossAt(eps) - lossAt(-eps)) / (2 * eps);
}

describe("誤差逆伝播 backwardPass（解析的勾配 = 数値微分）", () => {
  for (const activation of ["sigmoid", "relu", "rbf"] as const) {
    it(`${activation}: 全パラメータで解析的勾配と数値微分が一致する`, () => {
      const trace = forwardPass(X, Y, PARAMS, activation);
      const grads = backwardPass(trace, PARAMS, activation);

      const checks: Array<[number, (p: NetParams, d: number) => NetParams]> = [
        [grads.dW1[0][0], (p, d) => ({ ...p, w1: [[p.w1[0][0] + d, p.w1[0][1]], p.w1[1]] })],
        [grads.dW1[0][1], (p, d) => ({ ...p, w1: [[p.w1[0][0], p.w1[0][1] + d], p.w1[1]] })],
        [grads.dW1[1][0], (p, d) => ({ ...p, w1: [p.w1[0], [p.w1[1][0] + d, p.w1[1][1]]] })],
        [grads.dW1[1][1], (p, d) => ({ ...p, w1: [p.w1[0], [p.w1[1][0], p.w1[1][1] + d]] })],
        [grads.dB1[0], (p, d) => ({ ...p, b1: [p.b1[0] + d, p.b1[1]] })],
        [grads.dB1[1], (p, d) => ({ ...p, b1: [p.b1[0], p.b1[1] + d] })],
        [grads.dW2[0], (p, d) => ({ ...p, w2: [p.w2[0] + d, p.w2[1]] })],
        [grads.dW2[1], (p, d) => ({ ...p, w2: [p.w2[0], p.w2[1] + d] })],
        [grads.dB2, (p, d) => ({ ...p, b2: p.b2 + d })],
      ];
      for (const [analytic, perturb] of checks) {
        const numeric = numericalGradLoss(perturb, activation);
        expect(analytic).toBeCloseTo(numeric, 5);
      }
    });
  }

  it("RBF は中心 z=0 付近で微分がほぼ0（局所的にしか反応しない）ため隠れ層への勾配も小さくなりうる", () => {
    const nearCenterParams: NetParams = { ...PARAMS, w1: [[0, 0], [0, 0]], b1: [0, 0] };
    const trace = forwardPass(X, Y, nearCenterParams, "rbf");
    const grads = backwardPass(trace, nearCenterParams, "rbf");
    expect(grads.dZ1[0]).toBeCloseTo(0, 6);
    expect(grads.dZ1[1]).toBeCloseTo(0, 6);
  });
});

describe("sgdUpdate（確率的勾配降下の1歩）", () => {
  it("十分小さい学習率で1歩進めると損失が下がる", () => {
    const trace0 = forwardPass(X, Y, PARAMS, "sigmoid");
    const grads = backwardPass(trace0, PARAMS, "sigmoid");
    const updated = sgdUpdate(PARAMS, grads, 0.05);
    const trace1 = forwardPass(X, Y, updated, "sigmoid");
    expect(trace1.loss).toBeLessThan(trace0.loss);
  });

  it("学習率0では何も変化しない", () => {
    const trace0 = forwardPass(X, Y, PARAMS, "relu");
    const grads = backwardPass(trace0, PARAMS, "relu");
    const updated = sgdUpdate(PARAMS, grads, 0);
    expect(updated).toEqual(PARAMS);
  });
});

describe("勾配消失: cumulativeGradientProfile", () => {
  it("シグモイド(z=0): 各層で0.25倍され層数とともに急速に0へ近づく", () => {
    const profile = cumulativeGradientProfile(4, "sigmoid", 0);
    expect(profile[0]).toBe(1);
    expect(profile[1]).toBeCloseTo(0.25, 10);
    expect(profile[2]).toBeCloseTo(0.0625, 10);
    expect(profile[4]).toBeCloseTo(0.25 ** 4, 10);
    // 単調に縮む
    for (let i = 1; i < profile.length; i++) expect(profile[i]).toBeLessThan(profile[i - 1]);
  });

  it("ReLU(z=1, 活性域): 微分が1なので層を重ねても積が縮まない", () => {
    const profile = cumulativeGradientProfile(6, "relu", 1);
    for (const v of profile) expect(v).toBeCloseTo(1, 10);
  });

  it("シグモイドの方がReLUより深さ4で圧倒的に小さい（勾配消失の比較）", () => {
    const sig = cumulativeGradientProfile(4, "sigmoid", 0);
    const re = cumulativeGradientProfile(4, "relu", 1);
    expect(sig[4]).toBeLessThan(re[4] * 0.01);
  });
});

describe("ドロップアウト", () => {
  it("dropoutMask: rate=0なら全て残る(1)、rate=1なら全て落ちる(0)", () => {
    const rng = mulberry32(1);
    expect(dropoutMask(10, 0, rng)).toEqual(Array(10).fill(1));
    const rng2 = mulberry32(1);
    expect(dropoutMask(10, 1, rng2)).toEqual(Array(10).fill(0));
  });

  it("applyDropout: 残ったユニットは1/(1-rate)倍される", () => {
    const activations = [1, 2, 3, 4];
    const mask = [1, 0, 1, 0];
    const out = applyDropout(activations, mask, 0.5);
    expect(out).toEqual([2, 0, 6, 0]);
  });

  it("多数回の平均は元の活性化の期待値をおおむね保つ（インバーテッドドロップアウトの目的）", () => {
    const rng = mulberry32(2024);
    const activations = Array(20).fill(2); // 一定値の活性化
    const rate = 0.3;
    let sum = 0;
    const trials = 5000;
    for (let t = 0; t < trials; t++) {
      const mask = dropoutMask(activations.length, rate, rng);
      const applied = applyDropout(activations, mask, rate);
      sum += applied.reduce((s, v) => s + v, 0) / applied.length;
    }
    const mean = sum / trials;
    expect(mean).toBeCloseTo(2, 0); // 平均2付近（過学習抑制のため学習時は毎回ばらつく）
  });
});

describe("バッチ正規化 batchNormalize", () => {
  it("正規化後の平均は0、分散は1に近い", () => {
    const values = [1, 2, 3, 4, 5];
    const { mean, variance, normalized } = batchNormalize(values);
    expect(mean).toBeCloseTo(3, 10);
    expect(variance).toBeCloseTo(2, 10); // 母分散 (1²+2²+0+1²+2²の平均... 実際は Σ(v-mean)²/n = (4+1+0+1+4)/5=2
    const normMean = normalized.reduce((s, v) => s + v, 0) / normalized.length;
    expect(normMean).toBeCloseTo(0, 8);
    const normVar = normalized.reduce((s, v) => s + v * v, 0) / normalized.length;
    expect(normVar).toBeCloseTo(1, 3);
  });

  it("γ・βでスケール・シフトし直すと平均β・分散γ²に近づく", () => {
    const values = [10, 12, 8, 11, 9];
    const { scaled } = batchNormalize(values, 2, 5);
    const mean = scaled.reduce((s, v) => s + v, 0) / scaled.length;
    expect(mean).toBeCloseTo(5, 3);
  });

  it("全て同じ値のバッチでも eps のおかげでゼロ割りしない", () => {
    const { normalized } = batchNormalize([3, 3, 3, 3]);
    for (const v of normalized) expect(Number.isFinite(v)).toBe(true);
  });
});
