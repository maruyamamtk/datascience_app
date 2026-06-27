import { describe, expect, it } from "vitest";
import {
  convolve,
  fairDie,
  linearCombinationMoments,
  linearTransformMoments,
  linearTransformNormalPdf,
} from "./transform";

describe("linearTransformMoments", () => {
  it("E[aX+b]=aμ+b、Var[aX+b]=a²σ²（b は分散に効かない）", () => {
    const r = linearTransformMoments(5, 4, 2, 3); // mean 5, var 4
    expect(r.mean).toBe(13); // 2*5+3
    expect(r.variance).toBe(16); // 4*4
  });
  it("負の a でも分散は a² で正", () => {
    expect(linearTransformMoments(0, 9, -2, 1).variance).toBe(36);
  });
});

describe("linearTransformNormalPdf（ヤコビアン 1/|a|）", () => {
  it("a 倍に伸ばすと高さは 1/|a| 倍（面積保存）", () => {
    // Y=2X, X~N(0,1): f_Y(0)=f_X(0)/2
    const fx0 = linearTransformNormalPdf(0, 0, 1, 1, 0);
    const fy0 = linearTransformNormalPdf(0, 0, 1, 2, 0);
    expect(fy0).toBeCloseTo(fx0 / 2, 12);
  });
  it("平行移動 b は形を変えず位置だけずらす", () => {
    const f = linearTransformNormalPdf(3, 0, 1, 1, 3); // Y=X+3 -> f_Y(3)=f_X(0)
    expect(f).toBeCloseTo(linearTransformNormalPdf(0, 0, 1, 1, 0), 12);
  });
  it("a=0 は退化で NaN", () => {
    expect(linearTransformNormalPdf(0, 0, 1, 0, 0)).toBeNaN();
  });
});

describe("linearCombinationMoments", () => {
  it("独立な和 X+Y は分散が足し算", () => {
    const r = linearCombinationMoments(1, 2, 3, 5, 1, 1); // a=b=1
    expect(r.mean).toBe(4);
    expect(r.variance).toBe(7); // 2+5
  });
  it("差 X−Y でも分散は足し算（独立）", () => {
    const r = linearCombinationMoments(0, 2, 0, 5, 1, -1);
    expect(r.variance).toBe(7);
  });
  it("共分散があると 2ab·Cov が付く", () => {
    const r = linearCombinationMoments(0, 1, 0, 1, 1, 1, 0.5);
    expect(r.variance).toBeCloseTo(1 + 1 + 2 * 0.5, 12); // 3
  });
});

describe("convolve（独立な和の分布）", () => {
  it("確率を保存（総和1）", () => {
    const z = convolve(fairDie(6), fairDie(6));
    expect(z.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
  it("2つのサイコロの和は三角分布で合計7が最頻（6/36）", () => {
    const z = convolve(fairDie(6), fairDie(6)); // 出力 index k は和(k+2)
    expect(z).toHaveLength(11);
    // 和=7 は index 5、確率 6/36
    expect(z[5]).toBeCloseTo(6 / 36, 12);
    // 和=2 と 和=12 は端で 1/36
    expect(z[0]).toBeCloseTo(1 / 36, 12);
    expect(z[10]).toBeCloseTo(1 / 36, 12);
  });
});
