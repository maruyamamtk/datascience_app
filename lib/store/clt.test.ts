import { afterEach, describe, expect, it } from "vitest";
import { getDistribution } from "@/lib/stats/distributions";
import { useCltStore } from "./clt";

// 共有シングルトンなので、各テスト後に初期状態へ戻す。
afterEach(() => useCltStore.getState().reset());

describe("useCltStore", () => {
  it("初期操作値（一様 / n=5）から μ・σ・SE を派生する", () => {
    const s = useCltStore.getState();
    expect(s.controls).toEqual({ distKind: "uniform", n: 5 });
    expect(s.derived.mu).toBe(5);
    expect(s.derived.sigma).toBeCloseTo(getDistribution("uniform").sd, 10);
    expect(s.derived.standardError).toBeCloseTo(getDistribution("uniform").sd / Math.sqrt(5), 10);
  });

  it("n を4倍にすると SE が半分になる（1操作で派生値が一貫更新）", () => {
    useCltStore.getState().setControl("n", 4);
    const se4 = useCltStore.getState().derived.standardError;
    useCltStore.getState().setControl("n", 16);
    const se16 = useCltStore.getState().derived.standardError;
    expect(se16).toBeCloseTo(se4 / 2, 10);
  });

  it("元分布を変えると μ は固定(5)・σ と SE が連動する", () => {
    useCltStore.getState().patchControls({ distKind: "exponential", n: 25 });
    const d = useCltStore.getState().derived;
    expect(d.mu).toBe(5);
    expect(d.sigma).toBe(5);
    expect(d.standardError).toBe(1); // 5/√25
  });
});
