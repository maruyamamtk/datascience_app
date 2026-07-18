import { describe, expect, it } from "vitest";
import { buildKnnFrames, KNN_STEP_K, KNN_STEP_POINTS, KNN_STEP_QUERY } from "./knn-frames";

describe("buildKnnFrames", () => {
  it("データ点数と同じフレーム数を返す", () => {
    const frames = buildKnnFrames();
    expect(frames.length).toBe(KNN_STEP_POINTS.length);
  });

  it("revealedは1から点数まで単調に増える", () => {
    const frames = buildKnnFrames();
    frames.forEach((f, i) => expect(f.payload?.revealed).toBe(i + 1));
  });

  it("distは距離順（単調非減少）に並ぶ", () => {
    const frames = buildKnnFrames();
    let prevDist = -Infinity;
    for (const f of frames) {
      const p = f.payload!;
      const dist = p.order[p.revealed - 1].dist;
      expect(dist).toBeGreaterThanOrEqual(prevDist - 1e-9);
      prevDist = dist;
    }
  });

  it("revealed<=kのフレームはneighborハイライト、それ以外はexcluded", () => {
    const frames = buildKnnFrames();
    frames.forEach((f, i) => {
      const expected = i + 1 <= KNN_STEP_K ? "neighbor" : "excluded";
      expect(f.highlights).toEqual([expected]);
    });
  });

  it("k番目のフレームの票数合計はk", () => {
    const frames = buildKnnFrames();
    const kthFrame = frames[KNN_STEP_K - 1];
    const votes = kthFrame.payload!.votes;
    expect(votes.label0 + votes.label1).toBe(KNN_STEP_K);
  });

  it("k番目以降のフレームでも票数は変わらない（多数決はk個で確定）", () => {
    const frames = buildKnnFrames();
    const votesAtK = frames[KNN_STEP_K - 1].payload!.votes;
    for (let i = KNN_STEP_K; i < frames.length; i++) {
      expect(frames[i].payload!.votes).toEqual(votesAtK);
    }
  });

  it("最終フレームのnoteに最終決定（多数決の結果）が含まれる", () => {
    const frames = buildKnnFrames();
    const last = frames[frames.length - 1];
    expect(last.callout?.note).toBeDefined();
    expect(last.callout?.kind).toBe("supplement");
  });

  it("kやクエリ点を変えるとフレームの中身も変わる", () => {
    const frames5 = buildKnnFrames(KNN_STEP_POINTS, KNN_STEP_QUERY, 5);
    const frames1 = buildKnnFrames(KNN_STEP_POINTS, KNN_STEP_QUERY, 1);
    expect(frames5[0].highlights).toEqual(frames1[0].highlights); // 1番目は両方neighbor
    expect(frames5[1].highlights).not.toEqual(frames1[1].highlights); // 2番目はk=5ならneighbor、k=1ならexcluded
  });
});
