import { describe, expect, it } from "vitest";
import {
  binaryEntropy,
  conditionalEntropy,
  entropy,
  jointEntropy,
  klDivergence,
  marginalX,
  marginalY,
  mutualInformation,
  mutualInformationViaEntropies,
  mutualInformationViaKL,
  normalize,
  normalizeJoint,
  productDistribution,
  selfInformation,
} from "./information-theory";

describe("selfInformation（シャノン情報量・自己情報量）", () => {
  it("公正なコイン(p=0.5)はちょうど1 bit", () => {
    expect(selfInformation(0.5)).toBeCloseTo(1, 10);
  });

  it("必ず起きる事象(p=1)は0 bit", () => {
    expect(selfInformation(1)).toBeCloseTo(0, 10);
  });

  it("珍しい事象ほど大きい(単調減少)", () => {
    expect(selfInformation(0.1)).toBeGreaterThan(selfInformation(0.5));
    expect(selfInformation(0.01)).toBeGreaterThan(selfInformation(0.1));
  });

  it("独立事象の自己情報量は加法的：I(p1*p2) = I(p1)+I(p2)", () => {
    const p1 = 0.5;
    const p2 = 0.25;
    expect(selfInformation(p1 * p2)).toBeCloseTo(selfInformation(p1) + selfInformation(p2), 10);
  });

  it("p<=0 は Infinity", () => {
    expect(selfInformation(0)).toBe(Infinity);
    expect(selfInformation(-1)).toBe(Infinity);
  });
});

describe("entropy / binaryEntropy", () => {
  it("公正なコインのエントロピーは1 bit", () => {
    expect(binaryEntropy(0.5)).toBeCloseTo(1, 10);
  });

  it("確定した事象(p=0 or p=1)のエントロピーは0", () => {
    expect(binaryEntropy(0)).toBeCloseTo(0, 10);
    expect(binaryEntropy(1)).toBeCloseTo(0, 10);
  });

  it("p=0.5で最大(五分五分から離れるほど下がる)", () => {
    const atHalf = binaryEntropy(0.5);
    expect(atHalf).toBeGreaterThan(binaryEntropy(0.3));
    expect(atHalf).toBeGreaterThan(binaryEntropy(0.7));
    expect(atHalf).toBeGreaterThan(binaryEntropy(0.9));
  });

  it("偏りコイン(p=0.9)のエントロピーは公正なコインより小さい", () => {
    expect(binaryEntropy(0.9)).toBeLessThan(binaryEntropy(0.5));
  });

  it("公正なサイコロ(6面均等)のエントロピーはlog2(6)", () => {
    const die = Array(6).fill(1 / 6);
    expect(entropy(die)).toBeCloseTo(Math.log2(6), 10);
  });

  it("一様分布のエントロピーは同じ要素数の中で最大(N面均等 > 偏りあり)", () => {
    const uniform4 = [0.25, 0.25, 0.25, 0.25];
    const skewed4 = [0.7, 0.1, 0.1, 0.1];
    expect(entropy(uniform4)).toBeGreaterThan(entropy(skewed4));
  });

  it("確定分布(1点に確率1)のエントロピーは0", () => {
    expect(entropy([1, 0, 0, 0])).toBeCloseTo(0, 10);
  });
});

describe("normalize / normalizeJoint", () => {
  it("重みを合計1に正規化する", () => {
    const dist = normalize([1, 1, 2]);
    expect(dist.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(dist[2]).toBeCloseTo(0.5, 10);
  });

  it("合計0の重みは一様分布にフォールバックする(NaN伝播を防ぐ)", () => {
    const dist = normalize([0, 0, 0, 0]);
    expect(dist.every((p) => p === 0.25)).toBe(true);
  });

  it("2次元表を全セル合計1に正規化する", () => {
    const joint = normalizeJoint([
      [10, 10],
      [10, 10],
    ]);
    const total = joint.flat().reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(joint[0][0]).toBeCloseTo(0.25, 10);
  });
});

describe("marginalX / marginalY / jointEntropy / conditionalEntropy", () => {
  // X,Yが独立になるよう作った同時分布(2x2): p(x,y)=p(x)p(y)
  const independentJoint = [
    [0.25, 0.25],
    [0.25, 0.25],
  ];

  it("独立な同時分布の周辺分布は一様", () => {
    expect(marginalX(independentJoint)).toEqual([0.5, 0.5]);
    expect(marginalY(independentJoint)).toEqual([0.5, 0.5]);
  });

  it("独立ならH(Y|X)=H(Y)(Xを知ってもYの不確実性は減らない)", () => {
    const hy = entropy(marginalY(independentJoint));
    expect(conditionalEntropy(independentJoint)).toBeCloseTo(hy, 10);
  });

  it("完全に従属(対角のみ確率あり)ならH(Y|X)=0(Xが分かればYが確定)", () => {
    const dependentJoint = [
      [0.5, 0],
      [0, 0.5],
    ];
    expect(conditionalEntropy(dependentJoint)).toBeCloseTo(0, 10);
  });

  it("jointEntropy(X,Y)は各周辺エントロピー以上になる(独立なら合計と一致)", () => {
    const hxy = jointEntropy(independentJoint);
    const hx = entropy(marginalX(independentJoint));
    const hy = entropy(marginalY(independentJoint));
    expect(hxy).toBeCloseTo(hx + hy, 10);
  });
});

describe("mutualInformation とその等価な計算経路", () => {
  it("独立な同時分布の相互情報量は0", () => {
    const independentJoint = [
      [0.25, 0.25],
      [0.25, 0.25],
    ];
    expect(mutualInformation(independentJoint)).toBeCloseTo(0, 10);
  });

  it("完全に従属(対角のみ)なら相互情報量はH(X)と一致する(Yを知れば完全にXが分かる)", () => {
    const dependentJoint = [
      [0.5, 0],
      [0, 0.5],
    ];
    const hx = entropy(marginalX(dependentJoint));
    expect(mutualInformation(dependentJoint)).toBeCloseTo(hx, 10);
  });

  it("相関のある同時分布(天気×傘)で相互情報量は正", () => {
    // 40:10:10:40 の相関ありテーブル(合計100→正規化)
    const joint = normalizeJoint([
      [40, 10],
      [10, 40],
    ]);
    expect(mutualInformation(joint)).toBeGreaterThan(0);
  });

  it("3つの等価な定義(直接式・KL経由・エントロピー経由)が数値的に一致する", () => {
    const joint = normalizeJoint([
      [40, 10],
      [10, 40],
    ]);
    const direct = mutualInformation(joint);
    const viaKL = mutualInformationViaKL(joint);
    const viaEntropies = mutualInformationViaEntropies(joint);
    expect(viaKL).toBeCloseTo(direct, 10);
    expect(viaEntropies).toBeCloseTo(direct, 10);
  });

  it("productDistributionは周辺分布の直積を作る", () => {
    const p = productDistribution([0.5, 0.5], [0.5, 0.5]);
    expect(p).toEqual([
      [0.25, 0.25],
      [0.25, 0.25],
    ]);
  });
});

describe("klDivergence（KLダイバージェンス）", () => {
  it("P=Qなら0", () => {
    const p = [0.5, 0.3, 0.2];
    expect(klDivergence(p, p)).toBeCloseTo(0, 10);
  });

  it("常に0以上(非負性)", () => {
    const p = normalize([5, 1, 1, 1]);
    const q = normalize([1, 1, 1, 5]);
    expect(klDivergence(p, q)).toBeGreaterThanOrEqual(0);
    expect(klDivergence(q, p)).toBeGreaterThanOrEqual(0);
  });

  it("非対称：KL(P‖Q) ≠ KL(Q‖P) が一般に成り立つ", () => {
    const p = normalize([5, 3, 1, 1]);
    const q = normalize([1, 1, 1, 1]);
    const pq = klDivergence(p, q);
    const qp = klDivergence(q, p);
    expect(pq).not.toBeCloseTo(qp, 3);
  });

  it("Qが0を含みPが同じ位置で正なら発散(Infinity)", () => {
    const p = [0.5, 0.5];
    const q = [1, 0];
    expect(klDivergence(p, q)).toBe(Infinity);
  });

  it("相互情報量はKL(P(X,Y)‖P(X)P(Y))と一致する(定義上の関係)", () => {
    const joint = normalizeJoint([
      [40, 10],
      [10, 40],
    ]);
    const px = marginalX(joint);
    const py = marginalY(joint);
    const product = productDistribution(px, py);
    const kl = klDivergence(joint.flat(), product.flat());
    expect(kl).toBeCloseTo(mutualInformation(joint), 10);
  });
});
