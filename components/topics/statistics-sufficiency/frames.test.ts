import { describe, expect, it } from "vitest";
import { buildOrderStatFrames } from "./frames";

describe("buildOrderStatFrames", () => {
  const frames = buildOrderStatFrames([3, 1, 4, 1, 5]);

  it("標本数ぶんのフレーム", () => {
    expect(frames).toHaveLength(5);
  });

  it("値は昇順に取り出される", () => {
    expect(frames.map((f) => f.payload?.value)).toEqual([1, 1, 3, 4, 5]);
  });

  it("先頭は最小、末尾は最大のラベル", () => {
    expect(frames[0].payload?.role).toContain("最小");
    expect(frames[4].payload?.role).toContain("最大");
  });

  it("各フレームにハイライト", () => {
    frames.forEach((f, i) => expect(f.highlights).toContain(`ord-${i}`));
  });
});
