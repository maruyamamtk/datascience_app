import { describe, expect, it } from "vitest";
import { betaTargetKernel, metropolisHastingsChain } from "@/lib/stats/mcmc-methods";
import { mulberry32 } from "@/lib/stats/random";
import { buildMhFrames } from "./mh-frames";

describe("buildMhFrames", () => {
  const target = (x: number) => betaTargetKernel(x, { alpha: 6, beta: 6 });
  const chain = metropolisHastingsChain(0.5, target, 0.3, 12, mulberry32(1));
  const frames = buildMhFrames(0.5, chain);

  it("フレーム数はchain.length+1(先頭が初期状態)", () => {
    expect(frames.length).toBe(chain.length + 1);
  });

  it("先頭フレームはstep=nullでvisitedが開始点のみ", () => {
    expect(frames[0].payload?.step).toBeNull();
    expect(frames[0].payload?.visited).toEqual([0.5]);
    expect(frames[0].callout?.title).toContain("初期状態");
  });

  it("各フレームのvisitedは1つずつ増え、末尾がそのステップのnextと一致する", () => {
    for (let i = 1; i < frames.length; i++) {
      const payload = frames[i].payload;
      expect(payload?.visited.length).toBe(i + 1);
      expect(payload?.visited[payload.visited.length - 1]).toBe(chain[i - 1].next);
    }
  });

  it("各フレームのpayload.stepは対応するchainの要素と一致する", () => {
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].payload?.step).toEqual(chain[i - 1]);
    }
  });

  it("受理フレームのcalloutタイトルには«受理»、棄却フレームには«棄却»が含まれる", () => {
    for (let i = 1; i < frames.length; i++) {
      const step = chain[i - 1];
      const title = frames[i].callout?.title ?? "";
      expect(title).toContain(step.accepted ? "受理" : "棄却");
    }
  });
});
