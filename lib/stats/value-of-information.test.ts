import { describe, expect, it } from "vitest";
import { PRIMARY_PAYOFF_MATRIX } from "./decision-analysis";
import {
  bayesPosteriorFromSignal,
  evpi,
  expectedRegretOfAction,
  perfectInfoBestActionPerState,
  perfectInformationEsv,
  priorPosteriorAnalysis,
  symmetricForecast,
} from "./value-of-information";

// 出典第2部第6章「情報の価値」の定義式を、決定分析(P-1)と同じ工場稼働の例
// (0台/1台/2台 × 好況/不況、単位:万円)で手計算した値と照合する。

describe("perfectInformationEsv: 完全情報があった場合の期待利得", () => {
  it("p(好況)=0.5では 0.5*700+0.5*300=500", () => {
    expect(perfectInformationEsv(PRIMARY_PAYOFF_MATRIX, [0.5, 0.5])).toBeCloseTo(500, 6);
  });
  it("p(好況)=0.7では 0.7*700+0.3*300=580", () => {
    expect(perfectInformationEsv(PRIMARY_PAYOFF_MATRIX, [0.7, 0.3])).toBeCloseTo(580, 6);
  });
  it("statesと長さが違うprobabilitiesはエラー", () => {
    expect(() => perfectInformationEsv(PRIMARY_PAYOFF_MATRIX, [1])).toThrow();
  });
});

describe("perfectInfoBestActionPerState: 状態ごとの最善行動", () => {
  it("好況なら2台稼働(index2)、不況なら1台稼働(index1)が最善", () => {
    expect(perfectInfoBestActionPerState(PRIMARY_PAYOFF_MATRIX)).toEqual([2, 1]);
  });
});

describe("evpi: 完全情報の期待価値", () => {
  it("p(好況)=0.5では 500-300=200(事前は1台稼働のESV=300が最善)", () => {
    expect(evpi(PRIMARY_PAYOFF_MATRIX, [0.5, 0.5])).toBeCloseTo(200, 6);
  });
  it("p(好況)=0.7では 580-400=180(事前は2台稼働のESV=400が最善)", () => {
    expect(evpi(PRIMARY_PAYOFF_MATRIX, [0.7, 0.3])).toBeCloseTo(180, 6);
  });
  it("EVPIは常に0以上", () => {
    for (let p = 0; p <= 1; p += 0.05) {
      expect(evpi(PRIMARY_PAYOFF_MATRIX, [p, 1 - p])).toBeGreaterThanOrEqual(-1e-9);
    }
  });
  it("状態が完全に決まっている(p=0 または p=1)ときEVPIは0(不確実性がないので情報の価値もない)", () => {
    expect(evpi(PRIMARY_PAYOFF_MATRIX, [1, 0])).toBeCloseTo(0, 6);
    expect(evpi(PRIMARY_PAYOFF_MATRIX, [0, 1])).toBeCloseTo(0, 6);
  });
});

describe("期待リグレット = EVPI(第2部第6章「情報の有効性と不確実性の費用」)", () => {
  it("p=0.5: 事前ESV最大の1台稼働(index1)の期待リグレットはEVPI(200)と一致", () => {
    const p = [0.5, 0.5];
    const regret = expectedRegretOfAction(PRIMARY_PAYOFF_MATRIX, p, 1);
    expect(regret).toBeCloseTo(evpi(PRIMARY_PAYOFF_MATRIX, p), 6);
    expect(regret).toBeCloseTo(200, 6);
  });
  it("p=0.7: 事前ESV最大の2台稼働(index2)の期待リグレットはEVPI(180)と一致", () => {
    const p = [0.7, 0.3];
    const regret = expectedRegretOfAction(PRIMARY_PAYOFF_MATRIX, p, 2);
    expect(regret).toBeCloseTo(evpi(PRIMARY_PAYOFF_MATRIX, p), 6);
    expect(regret).toBeCloseTo(180, 6);
  });
  it("statesと長さが違うprobabilitiesはエラー", () => {
    expect(() => expectedRegretOfAction(PRIMARY_PAYOFF_MATRIX, [1], 0)).toThrow();
  });
});

describe("bayesPosteriorFromSignal: 離散状態へのベイズの定理", () => {
  it("尤度が一様(1,1)なら事後確率は事前確率のまま", () => {
    const { posterior, signalProbability } = bayesPosteriorFromSignal([0.3, 0.7], [1, 1]);
    expect(posterior[0]).toBeCloseTo(0.3, 6);
    expect(posterior[1]).toBeCloseTo(0.7, 6);
    expect(signalProbability).toBeCloseTo(1, 6);
  });
  it("尤度(1,0)は状態0を確定させる(完全情報)", () => {
    const { posterior, signalProbability } = bayesPosteriorFromSignal([0.5, 0.5], [1, 0]);
    expect(posterior).toEqual([1, 0]);
    expect(signalProbability).toBeCloseTo(0.5, 6);
  });
});

describe("symmetricForecast: 対称な的中率を持つ二値予報", () => {
  it("accuracy=1で完全的中(対角行列)になる", () => {
    const f = symmetricForecast(1);
    expect(f.likelihoods).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });
  it("accuracy=0.5で無情報(全セル0.5)になる", () => {
    const f = symmetricForecast(0.5);
    expect(f.likelihoods).toEqual([
      [0.5, 0.5],
      [0.5, 0.5],
    ]);
  });
  it("0.5未満はクランプされる", () => {
    expect(symmetricForecast(0.2)).toEqual(symmetricForecast(0.5));
  });
});

describe("priorPosteriorAnalysis: 事前/事後分析", () => {
  it("的中率1(完全情報)ではVOI_preがEVPIと一致する", () => {
    const prior = [0.5, 0.5];
    const result = priorPosteriorAnalysis(PRIMARY_PAYOFF_MATRIX, prior, symmetricForecast(1));
    expect(result.voiPre).toBeCloseTo(evpi(PRIMARY_PAYOFF_MATRIX, prior), 6);
    expect(result.voiPre).toBeCloseTo(200, 6);
  });
  it("的中率1では、シグナルごとの事後確率が状態を確定させ、事後分析VOI_postも各シグナルで正になる", () => {
    const prior = [0.5, 0.5];
    const result = priorPosteriorAnalysis(PRIMARY_PAYOFF_MATRIX, prior, symmetricForecast(1));
    expect(result.posterior[0]).toEqual([1, 0]);
    expect(result.posterior[1]).toEqual([0, 1]);
    // 予報:好況 → 好況確定 → 2台稼働(700)が最善、予報:不況 → 不況確定 → 1台稼働(300)が最善
    expect(result.bestEsvGivenSignal[0]).toBeCloseTo(700, 6);
    expect(result.bestEsvGivenSignal[1]).toBeCloseTo(300, 6);
    expect(result.voiPost[0]).toBeGreaterThan(0);
  });
  it("的中率0.5(無情報)ではVOI_preが0になる(事後確率が事前確率と変わらないため)", () => {
    const prior = [0.5, 0.5];
    const result = priorPosteriorAnalysis(PRIMARY_PAYOFF_MATRIX, prior, symmetricForecast(0.5));
    expect(result.voiPre).toBeCloseTo(0, 6);
    expect(result.voiPost.every((v) => Math.abs(v) < 1e-9)).toBe(true);
  });
  it("VOI_preは的中率qについて単調非減少で、EVPIを超えない(EVPIが情報の価値の上限)", () => {
    const prior = [0.5, 0.5];
    const ceiling = evpi(PRIMARY_PAYOFF_MATRIX, prior);
    let prevVoiPre = -Infinity;
    for (let q = 0.5; q <= 1; q += 0.05) {
      const result = priorPosteriorAnalysis(PRIMARY_PAYOFF_MATRIX, prior, symmetricForecast(q));
      expect(result.voiPre).toBeLessThanOrEqual(ceiling + 1e-9);
      expect(result.voiPre).toBeGreaterThanOrEqual(prevVoiPre - 1e-9);
      prevVoiPre = result.voiPre;
    }
  });
  it("priorとstatesの長さが違うとエラー", () => {
    expect(() =>
      priorPosteriorAnalysis(PRIMARY_PAYOFF_MATRIX, [1], symmetricForecast(1)),
    ).toThrow();
  });
});
