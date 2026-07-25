import { describe, expect, it } from "vitest";
import { PRIMARY_PAYOFF_MATRIX } from "./decision-analysis";
import {
  certaintyEquivalentBisection,
  certaintyEquivalentCara,
  classifyRiskAttitudeFromAlpha,
  compareEvAndEuDecisions,
  concavityProbe,
  expectedUtility,
  expectedUtilityCriterion,
  expectedValue,
  riskPremium,
  stPetersburgLogUtility,
  stPetersburgPartialExpectedUtility,
  stPetersburgPartialExpectedValue,
  stPetersburgPayoff,
  stPetersburgProbability,
  utilityCara,
  utilityLinear,
  utilitySqrt,
} from "./utility-theory";

// 出典第4部「効用理論入門」の定義式を、工場稼働の利得行列(決定分析(P-1)と同じ例)や
// 手計算値と照合する。

describe("utilityCara: CARA効用の正規化形", () => {
  it("α=0では直線 u(x)=x に一致する", () => {
    for (const x of [-300, 0, 100, 700]) {
      expect(utilityCara(x, 0)).toBeCloseTo(utilityLinear(x), 9);
    }
  });
  it("α>0(リスク回避的)では凹関数: 中点の効用が両端の平均を上回る", () => {
    const probe = concavityProbe((x) => utilityCara(x, 0.01), -300, 700);
    expect(probe.gap).toBeGreaterThan(0);
    expect(probe.classification).toBe("risk-averse");
  });
  it("α<0(リスク受容的)では凸関数: 中点の効用が両端の平均を下回る", () => {
    const probe = concavityProbe((x) => utilityCara(x, -0.01), -300, 700);
    expect(probe.gap).toBeLessThan(0);
    expect(probe.classification).toBe("risk-loving");
  });
  it("α→0の極限でu(x;α)→xに連続的に近づく(場合分けの整合性)", () => {
    // テイラー展開 (1-e^{-αx})/α ≈ x-αx²/2 より、誤差は|α|に比例して小さくなっていくはず。
    const x = 1;
    let prevDiff = Infinity;
    for (const alpha of [0.01, 0.001, 0.0001, 0.00001]) {
      const diff = Math.abs(utilityCara(x, alpha) - x);
      expect(diff).toBeLessThan(prevDiff);
      prevDiff = diff;
    }
    expect(prevDiff).toBeLessThan(1e-4);
  });
});

describe("classifyRiskAttitudeFromAlpha: リスク態度の3分類(αの符号)", () => {
  it("α>0はリスク回避的、α=0はリスク中立、α<0はリスク受容的", () => {
    expect(classifyRiskAttitudeFromAlpha(0.01)).toBe("risk-averse");
    expect(classifyRiskAttitudeFromAlpha(0)).toBe("risk-neutral");
    expect(classifyRiskAttitudeFromAlpha(-0.01)).toBe("risk-loving");
  });
});

describe("concavityProbe: 効用関数の凹凸の数値判定(高校数学の«上に凸/下に凸»の定義)", () => {
  it("線形関数はgapがちょうど0(risk-neutral)", () => {
    const probe = concavityProbe(utilityLinear, -100, 300);
    expect(probe.gap).toBeCloseTo(0, 9);
    expect(probe.classification).toBe("risk-neutral");
  });
  it("√xは凹関数(risk-averse): u(mid) > (u(a)+u(b))/2", () => {
    const probe = concavityProbe(utilitySqrt, 0, 400);
    expect(probe.midpointInput).toBe(200);
    expect(probe.classification).toBe("risk-averse");
  });
});

describe("expectedValue / expectedUtility: 期待金額と期待効用", () => {
  it("期待金額は加重平均そのもの(2台稼働: 700*0.5+(-300)*0.5=200)", () => {
    expect(expectedValue([700, -300], [0.5, 0.5])).toBeCloseTo(200, 6);
  });
  it("期待効用はuをxに適用してから加重平均する(u=linearなら期待金額と一致)", () => {
    expect(expectedUtility([700, -300], [0.5, 0.5], utilityLinear)).toBeCloseTo(
      expectedValue([700, -300], [0.5, 0.5]),
      6,
    );
  });
  it("長さが違うとエラー", () => {
    expect(() => expectedValue([1, 2], [1])).toThrow();
    expect(() => expectedUtility([1, 2], [1], utilityLinear)).toThrow();
  });
});

describe("certaintyEquivalentCara: 確実同値額(閉形式の逆関数)", () => {
  it("α=0(リスク中立)ではCE=E[X]", () => {
    const outcomes = [700, -300];
    const probs = [0.5, 0.5];
    expect(certaintyEquivalentCara(outcomes, probs, 0)).toBeCloseTo(
      expectedValue(outcomes, probs),
      6,
    );
  });
  it("α>0(リスク回避的)ではCE<E[X]", () => {
    const outcomes = [700, -300];
    const probs = [0.5, 0.5];
    expect(certaintyEquivalentCara(outcomes, probs, 0.01)).toBeLessThan(
      expectedValue(outcomes, probs),
    );
  });
  it("α<0(リスク受容的)ではCE>E[X]", () => {
    const outcomes = [700, -300];
    const probs = [0.5, 0.5];
    expect(certaintyEquivalentCara(outcomes, probs, -0.01)).toBeGreaterThan(
      expectedValue(outcomes, probs),
    );
  });
  it("E[u(CE)]=E[u(X)]を満たす(定義の確認)", () => {
    const outcomes = [700, -300];
    const probs = [0.7, 0.3];
    const alpha = 0.002;
    const ce = certaintyEquivalentCara(outcomes, probs, alpha);
    const eu = expectedUtility(outcomes, probs, (x) => utilityCara(x, alpha));
    expect(utilityCara(ce, alpha)).toBeCloseTo(eu, 6);
  });
});

describe("certaintyEquivalentBisection: 確実同値額(数値探索版)", () => {
  it("CARA効用でcertaintyEquivalentCaraと一致する(閉形式と数値探索の整合性)", () => {
    const outcomes = [700, -300];
    const probs = [0.6, 0.4];
    const alpha = 0.003;
    const u = (x: number) => utilityCara(x, alpha);
    const target = expectedUtility(outcomes, probs, u);
    const ceNumeric = certaintyEquivalentBisection(u, target, -300, 700);
    const ceClosedForm = certaintyEquivalentCara(outcomes, probs, alpha);
    expect(ceNumeric).toBeCloseTo(ceClosedForm, 3);
  });
  it("√x効用(狭義単調増加)でも数値探索でCEが求まる", () => {
    const outcomes = [400, 0];
    const probs = [0.5, 0.5];
    const target = expectedUtility(outcomes, probs, utilitySqrt);
    const ce = certaintyEquivalentBisection(utilitySqrt, target, 0, 400);
    expect(utilitySqrt(ce)).toBeCloseTo(target, 6);
    // 凹関数なのでCEは期待値(200)より小さい
    expect(ce).toBeLessThan(expectedValue(outcomes, probs));
  });
  it("uが単調増加でない([lo,hi]でu(lo)>u(hi))とエラー", () => {
    expect(() => certaintyEquivalentBisection((x) => -x, 0, 0, 10)).toThrow();
  });
});

describe("riskPremium: リスクプレミアム RP=E[X]-CE", () => {
  it("リスク回避的(α>0)では正になる", () => {
    expect(riskPremium([700, -300], [0.5, 0.5], 0.01)).toBeGreaterThan(0);
  });
  it("リスク中立(α=0)では0になる", () => {
    expect(riskPremium([700, -300], [0.5, 0.5], 0)).toBeCloseTo(0, 6);
  });
  it("リスク受容的(α<0)では負になる", () => {
    expect(riskPremium([700, -300], [0.5, 0.5], -0.01)).toBeLessThan(0);
  });
});

describe("expectedUtilityCriterion: 期待効用による意思決定", () => {
  it("α=0では期待金額による意思決定(expectedValueCriterion相当)と同じbestIndexになる", () => {
    const probs = [0.7, 0.3];
    const result = expectedUtilityCriterion(PRIMARY_PAYOFF_MATRIX, probs, 0);
    expect(result.bestIndex).toBe(2); // p=0.7ではESVは2台稼働(400)が最大
  });
  it("statesと長さが違うprobabilitiesはエラー", () => {
    expect(() => expectedUtilityCriterion(PRIMARY_PAYOFF_MATRIX, [1], 0.01)).toThrow();
  });
});

describe("compareEvAndEuDecisions: 期待金額と期待効用で意思決定が食い違う具体例", () => {
  it("p(好況)=0.7, α=0.002ではESVは2台稼働(400)を選ぶがEUは1台稼働を選ぶ(diverge=true)", () => {
    const result = compareEvAndEuDecisions(PRIMARY_PAYOFF_MATRIX, [0.7, 0.3], 0.002);
    expect(result.esv.bestIndex).toBe(2);
    expect(result.eu.bestIndex).toBe(1);
    expect(result.diverge).toBe(true);
  });
  it("α=0(リスク中立)ではESVとEUの最善行動は必ず一致する(diverge=false)", () => {
    for (let p = 0; p <= 1; p += 0.1) {
      const result = compareEvAndEuDecisions(PRIMARY_PAYOFF_MATRIX, [p, 1 - p], 0);
      expect(result.diverge).toBe(false);
    }
  });
});

describe("サンクトペテルブルクのパラドックス", () => {
  it("payoff(n)=2^n, probability(n)=(1/2)^n", () => {
    expect(stPetersburgPayoff(1)).toBe(2);
    expect(stPetersburgPayoff(4)).toBe(16);
    expect(stPetersburgProbability(1)).toBeCloseTo(0.5, 9);
    expect(stPetersburgProbability(4)).toBeCloseTo(1 / 16, 9);
  });
  it("期待金額の部分和は各項がちょうど1なのでNに一致する(発散を体感できる)", () => {
    expect(stPetersburgPartialExpectedValue(1)).toBeCloseTo(1, 9);
    expect(stPetersburgPartialExpectedValue(5)).toBeCloseTo(5, 9);
    expect(stPetersburgPartialExpectedValue(20)).toBeCloseTo(20, 9);
  });
  it("Nを増やすほど期待金額の部分和は際限なく増える(発散)", () => {
    expect(stPetersburgPartialExpectedValue(100)).toBeGreaterThan(
      stPetersburgPartialExpectedValue(10),
    );
    expect(stPetersburgPartialExpectedValue(1000)).toBeGreaterThan(500);
  });
  it("log2効用: u(2^n)=nなので各項はn/2^n", () => {
    expect(stPetersburgLogUtility(stPetersburgPayoff(4))).toBeCloseTo(4, 9);
  });
  it("log2効用による期待効用の部分和は単調増加し、2に収束する(出典の解決例と一致)", () => {
    let prev = 0;
    for (let n = 1; n <= 30; n++) {
      const cur = stPetersburgPartialExpectedUtility(n);
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
    expect(stPetersburgPartialExpectedUtility(30)).toBeCloseTo(2, 3);
    expect(stPetersburgPartialExpectedUtility(30)).toBeLessThanOrEqual(2 + 1e-6);
  });
});
