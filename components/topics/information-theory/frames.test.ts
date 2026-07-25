import { describe, expect, it } from "vitest";
import { selfInformation } from "@/lib/stats/information-theory";
import { buildSelfInformationFrames, SELF_INFO_EXAMPLES } from "./frames";

describe("buildSelfInformationFrames", () => {
  const frames = buildSelfInformationFrames();

  it("SELF_INFO_EXAMPLESの数だけフレームを作る", () => {
    expect(frames.length).toBe(SELF_INFO_EXAMPLES.length);
  });

  it("各フレームのpayload.pはSELF_INFO_EXAMPLESの確率と一致する", () => {
    frames.forEach((f, i) => {
      expect(f.payload?.p).toBe(SELF_INFO_EXAMPLES[i].p);
    });
  });

  it("確率pが小さくなるにつれ自己情報量が単調に増える(珍しい事象ほど驚きが大きい)", () => {
    const infos = SELF_INFO_EXAMPLES.map((ex) => selfInformation(ex.p));
    for (let i = 1; i < infos.length; i++) {
      expect(infos[i]).toBeGreaterThan(infos[i - 1]);
    }
  });

  it("各フレームにcalloutが付いている(近傍コールアウト)", () => {
    frames.forEach((f) => {
      expect(f.callout).toBeDefined();
      expect(f.callout?.body.length).toBeGreaterThan(0);
    });
  });

  it("p=1の最初のフレームは自己情報量0(必ず起きる事象は驚きゼロ)", () => {
    expect(selfInformation(SELF_INFO_EXAMPLES[0].p)).toBeCloseTo(0, 10);
  });
});
