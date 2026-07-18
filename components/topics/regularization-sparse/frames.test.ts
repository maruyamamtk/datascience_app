import { describe, expect, it } from "vitest";
import { STEP_LAMBDA_N } from "@/lib/store/regularization-sparse";
import { buildRegularizationPathFrames, STEP_P, STEP_TRUE_BETA } from "./frames";

describe("正則化パスステッパーのフレーム列", () => {
  const frames = buildRegularizationPathFrames();

  it("λ の数だけコマがある", () => {
    expect(frames).toHaveLength(STEP_LAMBDA_N);
  });

  it("λ は小さい方から大きい方へ単調増加", () => {
    const lambdas = frames[0].payload!.lambdas;
    for (let i = 1; i < lambdas.length; i++) {
      expect(lambdas[i]).toBeGreaterThan(lambdas[i - 1]);
    }
  });

  it("revealed はステップ番号+1と一致し、非ゼロ係数はSTEP_P個以下", () => {
    frames.forEach((f, i) => {
      expect(f.payload!.revealed).toBe(i + 1);
      expect(f.payload!.nonzeroCount).toBeLessThanOrEqual(STEP_P);
      expect(f.payload!.nonzeroCount).toBeGreaterThanOrEqual(0);
    });
  });

  it("先頭コマは罰則が弱く、ほとんどの係数が生き残っている", () => {
    const first = frames[0].payload!;
    expect(first.nonzeroCount).toBeGreaterThan(STEP_P / 2);
  });

  it("真に効く3変数（真の係数が非ゼロ）は最後まで生き残りやすい", () => {
    const trueNonzeroIdx = STEP_TRUE_BETA.map((v, j) => (v !== 0 ? j : -1)).filter((j) => j >= 0);
    expect(trueNonzeroIdx).toHaveLength(3);
    // 最終コマの1つ前（全滅する直前）でも真の変数のほうが無関係な変数より生き残りやすい。
    const nearLastFrame = frames[frames.length - 2].payload!;
    const nearLast = nearLastFrame.betas[nearLastFrame.step];
    const trueSurvived = trueNonzeroIdx.filter((j) => nearLast[j] !== 0).length;
    expect(trueSurvived).toBeGreaterThan(0);
  });

  it("係数がちょうど0になったコマではハイライト zeroed が立つ", () => {
    const zeroedFrames = frames.filter((f) => f.payload!.zeroedNow.length > 0);
    expect(zeroedFrames.length).toBeGreaterThan(0);
    for (const f of zeroedFrames) {
      expect(f.highlights).toContain("zeroed");
    }
  });

  it("全コマにコールアウトがある", () => {
    for (const f of frames) {
      expect(f.callout).toBeTruthy();
      expect(f.callout!.body.length).toBeGreaterThan(0);
    }
  });
});
