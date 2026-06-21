import { describe, expect, it } from "vitest";
import { mean } from "./sample";

describe("mean", () => {
  it("数値配列の平均を返す", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it("空配列では 0 を返す", () => {
    expect(mean([])).toBe(0);
  });

  it("単一要素ではその値を返す", () => {
    expect(mean([42])).toBe(42);
  });
});
