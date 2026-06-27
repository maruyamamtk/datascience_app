import { describe, expect, it } from "vitest";
import {
  areIndependent,
  bayesPosterior,
  deriveBayes,
  independenceGap,
  naturalFrequencies,
  POPULATION,
} from "./bayes";

describe("bayesPosterior", () => {
  it("古典的な医療検査の例（有病率1%・感度99%・特異度99%）で事後確率≈0.5", () => {
    // prior=0.01, sens=0.99, fpr=1-0.99=0.01
    const post = bayesPosterior(0.01, 0.99, 0.01);
    expect(post).toBeCloseTo(0.5, 5);
  });

  it("事前確率が0なら事後も0（病気が一人もいないなら陽性でも病気ではない）", () => {
    expect(bayesPosterior(0, 0.99, 0.01)).toBe(0);
  });

  it("偽陽性が起こり得ず事前0なら分母0でNaN", () => {
    expect(bayesPosterior(0, 0.9, 0)).toBeNaN();
  });

  it("完璧な検査（感度1・偽陽性0）なら陽性で事後確率1", () => {
    expect(bayesPosterior(0.3, 1, 0)).toBe(1);
  });
});

describe("deriveBayes", () => {
  it("同時確率が周辺確率・全体に整合する", () => {
    const d = deriveBayes({ prior: 0.2, sensitivity: 0.9, specificity: 0.8 });
    expect(d.fpr).toBeCloseTo(0.2, 10);
    expect(d.pTP).toBeCloseTo(0.18, 10); // 0.9*0.2
    expect(d.pFN).toBeCloseTo(0.02, 10); // 0.1*0.2
    expect(d.pFP).toBeCloseTo(0.16, 10); // 0.2*0.8
    expect(d.pTN).toBeCloseTo(0.64, 10); // 0.8*0.8
    expect(d.pTP + d.pFN + d.pFP + d.pTN).toBeCloseTo(1, 10);
    expect(d.pPos).toBeCloseTo(0.34, 10);
    expect(d.pNeg).toBeCloseTo(0.66, 10);
    expect(d.pPos + d.pNeg).toBeCloseTo(1, 10);
  });

  it("事後確率 P(D|+) = P(D∩+)/P(+)", () => {
    const d = deriveBayes({ prior: 0.2, sensitivity: 0.9, specificity: 0.8 });
    expect(d.posterior).toBeCloseTo(0.18 / 0.34, 10);
    expect(d.posteriorGivenNeg).toBeCloseTo(0.02 / 0.66, 10);
  });

  it("入力は[0,1]へクランプされる", () => {
    const d = deriveBayes({ prior: -1, sensitivity: 2, specificity: 0.5 });
    expect(d.pTP).toBe(0); // prior clamp→0
    expect(Number.isFinite(d.pFP)).toBe(true);
  });
});

describe("naturalFrequencies", () => {
  it("人数の内訳が母集団Nに整合（病気=TP+FN, 健康=FP+TN, 合計=N）", () => {
    const f = naturalFrequencies({ prior: 0.01, sensitivity: 0.9, specificity: 0.91 }, 1000);
    expect(f.total).toBe(1000);
    expect(f.sick).toBe(10); // round(0.01*1000)
    expect(f.healthy).toBe(990);
    expect(f.tp + f.fn).toBe(f.sick);
    expect(f.fp + f.tn).toBe(f.healthy);
    expect(f.tp + f.fn + f.fp + f.tn).toBe(1000);
    expect(f.positives).toBe(f.tp + f.fp);
    expect(f.negatives).toBe(f.fn + f.tn);
  });

  it("既定の母集団はPOPULATION", () => {
    const f = naturalFrequencies({ prior: 0.5, sensitivity: 1, specificity: 1 });
    expect(f.total).toBe(POPULATION);
    expect(f.tp).toBe(POPULATION / 2);
    expect(f.tn).toBe(POPULATION / 2);
    expect(f.fp).toBe(0);
    expect(f.fn).toBe(0);
  });
});

describe("independence", () => {
  it("独立ならギャップ0", () => {
    // P(A)=0.5, P(B)=0.4, P(A∩B)=0.2=0.5*0.4
    expect(independenceGap(0.5, 0.4, 0.2)).toBeCloseTo(0, 12);
    expect(areIndependent(0.5, 0.4, 0.2)).toBe(true);
  });

  it("正の相関ならギャップ>0で非独立", () => {
    expect(independenceGap(0.5, 0.4, 0.3)).toBeCloseTo(0.1, 12);
    expect(areIndependent(0.5, 0.4, 0.3)).toBe(false);
  });
});
