import { beforeEach, describe, expect, it } from "vitest";
import { createTopicStore } from "./topicStore";

// テスト用の最小トピック: 操作値 {value} から 派生値 {doubled} を計算する純関数。
type Controls = { value: number };
type Derived = { doubled: number };
const derive = (c: Controls): Derived => ({ doubled: c.value * 2 });

describe("createTopicStore", () => {
  let store: ReturnType<typeof createTopicStore<Controls, Derived>>;

  beforeEach(() => {
    store = createTopicStore<Controls, Derived>({
      initialControls: { value: 3 },
      derive,
      initialFrameCount: 4,
    });
  });

  it("初期化時に派生値を計算する", () => {
    const s = store.getState();
    expect(s.controls).toEqual({ value: 3 });
    expect(s.derived).toEqual({ doubled: 6 });
    expect(s.frame).toEqual({ count: 4, index: 0, playing: false });
  });

  it("setControl が操作値を更新し派生値を再計算する（1変更で一貫反映）", () => {
    store.getState().setControl("value", 10);
    const s = store.getState();
    expect(s.controls.value).toBe(10);
    expect(s.derived.doubled).toBe(20);
  });

  it("patchControls でも派生値を再計算する", () => {
    store.getState().patchControls({ value: 7 });
    expect(store.getState().derived.doubled).toBe(14);
  });

  it("nextFrame / prevFrame は範囲をクランプする", () => {
    const { nextFrame, prevFrame } = store.getState();
    nextFrame(); // 0 -> 1
    nextFrame(); // 1 -> 2
    expect(store.getState().frame.index).toBe(2);
    nextFrame(); // 2 -> 3 (max = count-1 = 3)
    nextFrame(); // 3 -> 3 (止まる)
    expect(store.getState().frame.index).toBe(3);
    prevFrame();
    prevFrame();
    prevFrame();
    prevFrame(); // 0 で止まる
    expect(store.getState().frame.index).toBe(0);
  });

  it("goToFrame は範囲外をクランプする", () => {
    store.getState().goToFrame(99);
    expect(store.getState().frame.index).toBe(3);
    store.getState().goToFrame(-5);
    expect(store.getState().frame.index).toBe(0);
  });

  it("setFrameCount を減らすと index が範囲内へクランプされる", () => {
    store.getState().goToFrame(3);
    store.getState().setFrameCount(2);
    const s = store.getState();
    expect(s.frame.count).toBe(2);
    expect(s.frame.index).toBe(1);
  });

  it("setPlaying で再生フラグを切り替える", () => {
    store.getState().setPlaying(true);
    expect(store.getState().frame.playing).toBe(true);
    store.getState().setPlaying(false);
    expect(store.getState().frame.playing).toBe(false);
  });

  it("reset で操作値・派生値・フレームが初期へ戻る", () => {
    const s0 = store.getState();
    s0.setControl("value", 99);
    s0.goToFrame(3);
    s0.setPlaying(true);
    store.getState().reset();
    const s = store.getState();
    expect(s.controls).toEqual({ value: 3 });
    expect(s.derived).toEqual({ doubled: 6 });
    expect(s.frame).toEqual({ count: 4, index: 0, playing: false });
  });
});
