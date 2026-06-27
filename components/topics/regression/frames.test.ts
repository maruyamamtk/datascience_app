import { describe, expect, it } from "vitest";
import { olsFit, type Point } from "@/lib/stats/regression";
import { buildRssFrames } from "./frames";

const PTS: Point[] = [
  { x: 1, y: 2 },
  { x: 2, y: 3 },
  { x: 3, y: 5 },
  { x: 4, y: 4 },
  { x: 5, y: 6 },
]; // OLS 傾き0.9・最小 RSS1.9

// OLS 傾き(0.9)を含む傾き列。
const SLOPES = [0.3, 0.5, 0.7, 0.9, 1.1, 1.3];

describe("buildRssFrames", () => {
  it("傾き 1 つにつき 1 フレームを作る", () => {
    expect(buildRssFrames(SLOPES, PTS)).toHaveLength(SLOPES.length);
  });

  it("各フレームで revealed が 1 点ずつ増える", () => {
    const frames = buildRssFrames(SLOPES, PTS);
    expect(frames[0].payload?.revealed).toHaveLength(1);
    expect(frames[5].payload?.revealed).toHaveLength(6);
  });

  it("RSS は傾きについて下に凸（最小の前で減り後で増える）", () => {
    const frames = buildRssFrames(SLOPES, PTS);
    const rss = frames.map((f) => f.payload?.rss ?? 0);
    const minIdx = rss.indexOf(Math.min(...rss));
    for (let i = 1; i <= minIdx; i++) expect(rss[i]).toBeLessThanOrEqual(rss[i - 1]);
    for (let i = minIdx + 1; i < rss.length; i++) expect(rss[i]).toBeGreaterThanOrEqual(rss[i - 1]);
  });

  it("最小 RSS のフレームは OLS 傾きで、isMin=true・補足コールアウト", () => {
    const frames = buildRssFrames(SLOPES, PTS);
    const minFrame = frames.find((f) => f.payload?.isMin);
    expect(minFrame?.payload?.slope).toBeCloseTo(olsFit(PTS).slope, 12); // 0.9
    expect(minFrame?.callout?.kind).toBe("supplement");
  });

  it("切片は重心を通す最適値（ȳ−slope·x̄）", () => {
    const { meanX, meanY } = olsFit(PTS);
    const frames = buildRssFrames(SLOPES, PTS);
    frames.forEach((f) => {
      const p = f.payload!;
      expect(p.intercept).toBeCloseTo(meanY - p.slope * meanX, 12);
    });
  });

  it("いま開示した点をハイライトする", () => {
    const frames = buildRssFrames(SLOPES, PTS);
    expect(frames[2].highlights).toEqual(["rss-2"]);
  });

  it("空配列なら空のフレーム列", () => {
    expect(buildRssFrames([], PTS)).toEqual([]);
  });
});
