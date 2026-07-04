import { describe, expect, it } from "vitest";
import { buildBootstrapFrames, SAMPLE } from "./frames";
import { mean } from "@/lib/stats/monte-carlo";

describe("buildBootstrapFrames", () => {
  const frames = buildBootstrapFrames();

  it("original → resample×6 → grow → summary の順", () => {
    const kinds = frames.map((f) => f.payload?.kind);
    expect(kinds[0]).toBe("original");
    expect(kinds.filter((k) => k === "resample")).toHaveLength(6);
    expect(kinds[kinds.length - 2]).toBe("grow");
    expect(kinds[kinds.length - 1]).toBe("summary");
  });

  it("resample フレームは元標本の値だけからなる同サイズの再標本", () => {
    const f = frames.find((fr) => fr.payload?.kind === "resample");
    const drawn = f?.payload?.drawn ?? [];
    expect(drawn).toHaveLength(SAMPLE.length);
    for (const v of drawn) expect(SAMPLE as readonly number[]).toContain(v);
  });

  it("統計量は単調に積み上がる（後のフレームほど多い）", () => {
    const counts = frames.map((f) => f.payload?.stats.length ?? 0);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
  });

  it("summary は95%区間を持ち、下限<上限、標本平均を含む", () => {
    const last = frames[frames.length - 1].payload;
    const ci = last?.ci;
    expect(ci).not.toBeNull();
    expect(ci![0]).toBeLessThan(ci![1]);
    const sm = mean([...SAMPLE]);
    expect(ci![0]).toBeLessThanOrEqual(sm);
    expect(ci![1]).toBeGreaterThanOrEqual(sm);
  });

  it("各フレームにコールアウトとハイライト", () => {
    frames.forEach((f) => {
      expect((f.callout?.title ?? "").length).toBeGreaterThan(0);
      expect((f.highlights ?? []).length).toBeGreaterThan(0);
    });
  });
});
