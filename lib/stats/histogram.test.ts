import { describe, expect, it } from "vitest";
import { histogram, maxCount } from "./histogram";

describe("histogram", () => {
  it("等幅ビンに正しく割り当てる", () => {
    const bins = histogram([0.5, 1.5, 1.6, 2.5], { min: 0, max: 3, bins: 3 });
    expect(bins.map((b) => b.count)).toEqual([1, 2, 1]);
    expect(bins[0]).toMatchObject({ x0: 0, x1: 1 });
    expect(bins[2]).toMatchObject({ x0: 2, x1: 3 });
  });

  it("空入力でも bins 個の count=0 ビンを返す（軸の安定）", () => {
    const bins = histogram([], { min: 0, max: 10, bins: 5 });
    expect(bins).toHaveLength(5);
    expect(maxCount(bins)).toBe(0);
  });

  it("範囲外の値は両端のビンへクランプする", () => {
    const bins = histogram([-5, 100], { min: 0, max: 10, bins: 2 });
    expect(bins[0].count).toBe(1); // -5 → 先頭
    expect(bins[1].count).toBe(1); // 100 → 末尾
  });

  it("上端ちょうどの値は最終ビンに入る", () => {
    const bins = histogram([10], { min: 0, max: 10, bins: 5 });
    expect(bins[4].count).toBe(1);
  });

  it("width<=0（min==max）でも壊れず 0 件で返す", () => {
    const bins = histogram([1, 2, 3], { min: 5, max: 5, bins: 4 });
    expect(maxCount(bins)).toBe(0);
  });
});

describe("maxCount", () => {
  it("最大度数を返す", () => {
    expect(
      maxCount([
        { x0: 0, x1: 1, count: 3 },
        { x0: 1, x1: 2, count: 7 },
      ]),
    ).toBe(7);
  });

  it("空配列では 0", () => {
    expect(maxCount([])).toBe(0);
  });
});
