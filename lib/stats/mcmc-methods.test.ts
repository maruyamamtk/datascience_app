import { describe, expect, it } from "vitest";
import { betaPdf } from "./continuous";
import { correlation } from "./moments";
import {
  betaTargetKernel,
  dropBurnIn,
  effectiveSampleSize,
  gibbsChain,
  gibbsConditionalSd,
  gibbsSweepPoints,
  mhAcceptanceRate,
  mhSamples,
  metropolisHastingsChain,
  metropolisHastingsStep,
  pseudoGaussian,
  scaledGaussian,
  splitRhat,
} from "./mcmc-methods";
import { mulberry32 } from "./random";

describe("pseudoGaussian / scaledGaussian", () => {
  it("決定的：同じシードなら同じ列を返す", () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    expect(pseudoGaussian(a)).toBe(pseudoGaussian(b));
  });

  it("平均0付近・大きく発散しない（多数サンプルの平均と標準偏差）", () => {
    const rng = mulberry32(7);
    const xs = Array.from({ length: 5000 }, () => pseudoGaussian(rng));
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(Math.abs(m)).toBeLessThan(0.05);
    const variance = xs.reduce((a, v) => a + (v - m) ** 2, 0) / xs.length;
    expect(Math.sqrt(variance)).toBeCloseTo(0.5, 1);
  });

  it("scaledGaussian は指定した sd に近い標準偏差になる", () => {
    const rng = mulberry32(11);
    const xs = Array.from({ length: 5000 }, () => scaledGaussian(rng, 2));
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    const variance = xs.reduce((a, v) => a + (v - m) ** 2, 0) / xs.length;
    expect(Math.sqrt(variance)).toBeCloseTo(2, 0);
  });

  it("sd<=0 は常に0", () => {
    const rng = mulberry32(3);
    expect(scaledGaussian(rng, 0)).toBe(0);
    expect(scaledGaussian(rng, -1)).toBe(0);
  });
});

describe("betaTargetKernel", () => {
  it("定義域(0,1)外は0", () => {
    expect(betaTargetKernel(0, { alpha: 6, beta: 6 })).toBe(0);
    expect(betaTargetKernel(1, { alpha: 6, beta: 6 })).toBe(0);
    expect(betaTargetKernel(-0.1, { alpha: 6, beta: 6 })).toBe(0);
    expect(betaTargetKernel(1.1, { alpha: 6, beta: 6 })).toBe(0);
  });

  it("対称な Beta(6,6) は 0.5 で最大", () => {
    const p = { alpha: 6, beta: 6 };
    const atMode = betaTargetKernel(0.5, p);
    expect(betaTargetKernel(0.3, p)).toBeLessThan(atMode);
    expect(betaTargetKernel(0.7, p)).toBeLessThan(atMode);
  });

  it("Beta(6,6) は theta=0.5 を軸に左右対称", () => {
    const p = { alpha: 6, beta: 6 };
    expect(betaTargetKernel(0.3, p)).toBeCloseTo(betaTargetKernel(0.7, p), 10);
  });
});

describe("metropolisHastingsStep", () => {
  const target = (x: number) => betaTargetKernel(x, { alpha: 6, beta: 6 });

  it("提案が定義域外(密度0)なら常に棄却される", () => {
    // current=0.5 から極端に大きい proposalSd で外に出やすくしても、
    // 密度0の提案は u(0以上)がacceptRatio(0)を下回れないため必ず棄却。
    const rng = mulberry32(1);
    // 提案が外に出るよう、大きな固定オフセットを模したtargetDensityで直接検証する。
    const step = metropolisHastingsStep(1, 0.5, (x) => (x <= 0 || x >= 1 ? 0 : 1), 100, rng);
    if (step.proposed <= 0 || step.proposed >= 1) {
      expect(step.accepted).toBe(false);
      expect(step.next).toBe(0.5);
    }
  });

  it("目標密度が一様（比が常に1）なら受理確率は常に1で必ず受理", () => {
    const rng = mulberry32(2);
    const step = metropolisHastingsStep(1, 0.5, () => 1, 0.1, rng);
    expect(step.acceptRatio).toBe(1);
    expect(step.accepted).toBe(true);
    expect(step.next).toBe(step.proposed);
  });

  it("acceptRatio は 0〜1 の範囲", () => {
    const rng = mulberry32(3);
    let x = 0.5;
    for (let i = 0; i < 200; i++) {
      const step = metropolisHastingsStep(i + 1, x, target, 0.3, rng);
      expect(step.acceptRatio).toBeGreaterThanOrEqual(0);
      expect(step.acceptRatio).toBeLessThanOrEqual(1);
      x = step.next;
    }
  });
});

describe("metropolisHastingsChain / mhAcceptanceRate / mhSamples", () => {
  const target = (x: number) => betaTargetKernel(x, { alpha: 6, beta: 6 });

  it("チェーンの長さは nSteps、状態は常に(0,1)内(受理も棄却もdensity>0の状態しか取らない)", () => {
    const rng = mulberry32(42);
    const chain = metropolisHastingsChain(0.5, target, 0.3, 500, rng);
    expect(chain).toHaveLength(500);
    for (const s of chain) {
      expect(s.next).toBeGreaterThan(0);
      expect(s.next).toBeLessThan(1);
    }
  });

  it("同じシードなら再現可能（決定的）", () => {
    const chainA = metropolisHastingsChain(0.5, target, 0.3, 100, mulberry32(99));
    const chainB = metropolisHastingsChain(0.5, target, 0.3, 100, mulberry32(99));
    expect(chainA).toEqual(chainB);
  });

  it("十分長いチェーンのサンプル平均は Beta(6,6) の理論平均 0.5 に近づく", () => {
    const rng = mulberry32(123);
    const chain = metropolisHastingsChain(0.5, target, 0.4, 5000, rng);
    const samples = mhSamples(chain).slice(500); // バーンイン除去
    const m = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(m).toBeCloseTo(0.5, 1);
  });

  it("極端に大きい提案幅では受理率が下がり、極端に小さい提案幅では受理率が上がる", () => {
    const bigStep = metropolisHastingsChain(0.5, target, 5, 2000, mulberry32(1));
    const smallStep = metropolisHastingsChain(0.5, target, 0.01, 2000, mulberry32(1));
    expect(mhAcceptanceRate(bigStep)).toBeLessThan(mhAcceptanceRate(smallStep));
  });

  it("正規化定数の有無に関わらず受理判定は完全に一致する（MCMCが正規化定数を必要としない核心の直接証明）", () => {
    const p = { alpha: 6, beta: 6 };
    const kernelChain = metropolisHastingsChain(0.5, (x) => betaTargetKernel(x, p), 0.3, 300, mulberry32(555));
    const normalizedChain = metropolisHastingsChain(
      0.5,
      (x) => betaPdf(x, p.alpha, p.beta),
      0.3,
      300,
      mulberry32(555),
    );
    expect(kernelChain.map((s) => s.accepted)).toEqual(normalizedChain.map((s) => s.accepted));
    expect(kernelChain.map((s) => s.next)).toEqual(normalizedChain.map((s) => s.next));
  });
});

describe("gibbsConditionalSd", () => {
  it("rho=0 なら条件付きsdは1(無相関なら条件付けても変わらない)", () => {
    expect(gibbsConditionalSd(0)).toBeCloseTo(1, 10);
  });
  it("|rho|が1に近いほど条件付きsdは0に近づく", () => {
    expect(gibbsConditionalSd(0.99)).toBeLessThan(gibbsConditionalSd(0.5));
  });
});

describe("gibbsChain / gibbsSweepPoints", () => {
  it("半ステップ数は 2·nSweeps、x→yの順で交互に更新される", () => {
    const rng = mulberry32(5);
    const steps = gibbsChain({ x: 0, y: 0 }, 0.8, 10, rng);
    expect(steps).toHaveLength(20);
    for (let i = 0; i < steps.length; i++) {
      expect(steps[i].updated).toBe(i % 2 === 0 ? "x" : "y");
    }
  });

  it("x更新はyを変えず、y更新はxを変えない", () => {
    const rng = mulberry32(6);
    const steps = gibbsChain({ x: 0, y: 0 }, 0.5, 5, rng);
    for (const s of steps) {
      if (s.updated === "x") {
        expect(s.after.y).toBe(s.before.y);
      } else {
        expect(s.after.x).toBe(s.before.x);
      }
    }
  });

  it("gibbsSweepPoints は y更新後の点だけを nSweeps 個取り出す", () => {
    const rng = mulberry32(7);
    const steps = gibbsChain({ x: 0, y: 0 }, 0.5, 8, rng);
    const points = gibbsSweepPoints(steps);
    expect(points).toHaveLength(8);
  });

  it("十分長いチェーンでは x・y のサンプル相関がrhoに近づく(rho=0.8)", () => {
    const rng = mulberry32(2024);
    const steps = gibbsChain({ x: 0, y: 0 }, 0.8, 3000, rng);
    const points = gibbsSweepPoints(steps).slice(200); // バーンイン除去
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    expect(correlation(xs, ys)).toBeGreaterThan(0.6);
  });

  it("rho=0(無相関)では x・y のサンプル相関はほぼ0", () => {
    const rng = mulberry32(2025);
    const steps = gibbsChain({ x: 0, y: 0 }, 0, 3000, rng);
    const points = gibbsSweepPoints(steps).slice(200);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    expect(Math.abs(correlation(xs, ys))).toBeLessThan(0.15);
  });
});

describe("splitRhat", () => {
  it("短すぎるチェーンはNaN", () => {
    expect(Number.isNaN(splitRhat([1, 2]))).toBe(true);
  });

  it("同一分布からのi.i.d.標本ではR-hatは1に近い", () => {
    const rng = mulberry32(31);
    const chain = Array.from({ length: 2000 }, () => scaledGaussian(rng, 1));
    expect(splitRhat(chain)).toBeLessThan(1.05);
  });

  it("前半と後半で分布の中心が大きくずれるチェーンはR-hatが1から大きく離れる", () => {
    const rng = mulberry32(32);
    const first = Array.from({ length: 500 }, () => scaledGaussian(rng, 1));
    const second = Array.from({ length: 500 }, () => scaledGaussian(rng, 1) + 10);
    expect(splitRhat([...first, ...second])).toBeGreaterThan(1.5);
  });
});

describe("effectiveSampleSize", () => {
  it("i.i.d.標本ではESSはnに近い(自己相関がほぼ0)", () => {
    const rng = mulberry32(41);
    const chain = Array.from({ length: 2000 }, () => scaledGaussian(rng, 1));
    const ess = effectiveSampleSize(chain, 50);
    expect(ess).toBeGreaterThan(1500);
  });

  it("強い自己相関を持つチェーン(小さいステップのランダムウォーク)はESSがnよりずっと小さい", () => {
    const rng = mulberry32(42);
    const chain: number[] = [0];
    for (let i = 1; i < 2000; i++) {
      chain.push(chain[i - 1] + scaledGaussian(rng, 1) * 0.05);
    }
    const ess = effectiveSampleSize(chain, 100);
    expect(ess).toBeLessThan(200);
  });
});

describe("dropBurnIn", () => {
  it("先頭n個を捨てる", () => {
    expect(dropBurnIn([1, 2, 3, 4, 5], 2)).toEqual([3, 4, 5]);
  });
  it("nが長さ以上なら空配列", () => {
    expect(dropBurnIn([1, 2, 3], 10)).toEqual([]);
  });
  it("負のnは0扱い", () => {
    expect(dropBurnIn([1, 2, 3], -5)).toEqual([1, 2, 3]);
  });
});
