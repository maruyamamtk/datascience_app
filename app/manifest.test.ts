import { describe, expect, it } from "vitest";
import manifest from "./manifest";

// PWA 成立に必要なフィールドが欠けていないことを担保する（Issue #7 受け入れ条件）。
describe("PWA manifest", () => {
  const m = manifest();

  it("ホーム画面追加に必要な基本フィールドを持つ", () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    // standalone でアプリのように全画面起動する。
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
    expect(m.lang).toBe("ja");
  });

  it("スプラッシュ用の色がアイコン背景と整合している", () => {
    expect(m.background_color).toBe("#0f172a");
    expect(m.theme_color).toBe("#0f172a");
  });

  it("192/512 とマスカブルアイコンを含む", () => {
    const icons = m.icons ?? [];
    const sizes = icons.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    // ホーム画面でトリミングされても崩れない maskable を 1 つ以上持つ。
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
    // 参照先はすべて png。
    expect(icons.every((i) => i.type === "image/png")).toBe(true);
  });
});
