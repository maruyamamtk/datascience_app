import { describe, expect, it } from "vitest";
import { listTopics, listTopicSlugs, parseTopicMeta } from "./topics";

describe("parseTopicMeta", () => {
  it("frontmatter の title/summary/status を取り出す", () => {
    const src = `---\ntitle: 正規分布\nsummary: 釣鐘型の分布。\nstatus: published\n---\n\n本文`;
    expect(parseTopicMeta("normal-distribution", src)).toEqual({
      slug: "normal-distribution",
      title: "正規分布",
      summary: "釣鐘型の分布。",
      status: "published",
    });
  });

  it("title 未指定なら slug、status 未指定なら published を既定にする", () => {
    const src = `---\nsummary: メモ\n---\n本文`;
    const meta = parseTopicMeta("foo", src);
    expect(meta.title).toBe("foo");
    expect(meta.status).toBe("published");
    expect(meta.summary).toBe("メモ");
  });
});

describe("listTopics（実ファイル）", () => {
  it("slug 一覧と件数が一致し、各メタに title がある", () => {
    const slugs = listTopicSlugs();
    const topics = listTopics();
    expect(topics.map((t) => t.slug)).toEqual(slugs);
    for (const t of topics) {
      expect(t.title, `${t.slug} の title`).not.toBe("");
    }
  });

  it("正規分布トピックが published で含まれる", () => {
    const normal = listTopics().find((t) => t.slug === "normal-distribution");
    expect(normal).toBeDefined();
    expect(normal?.status).toBe("published");
  });
});
