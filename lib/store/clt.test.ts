import { afterEach, describe, expect, it } from "vitest";
import { useCltStore } from "./clt";

// 共有シングルトンなので、各テスト後に初期状態へ戻す。
afterEach(() => useCltStore.getState().reset());

describe("useCltStore", () => {
  it("初期操作値から SE を派生する", () => {
    const s = useCltStore.getState();
    expect(s.controls).toEqual({ sigma: 10, n: 4 });
    expect(s.derived.standardError).toBe(5); // 10/√4
  });

  it("n を4倍にすると SE が半分になる（1操作で派生値が一貫更新）", () => {
    useCltStore.getState().setControl("n", 16);
    expect(useCltStore.getState().derived.standardError).toBe(2.5); // 10/√16
  });

  it("σ を変えると SE が連動する", () => {
    useCltStore.getState().setControl("sigma", 20);
    expect(useCltStore.getState().derived.standardError).toBe(10); // 20/√4
  });
});
