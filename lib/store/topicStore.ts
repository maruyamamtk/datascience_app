import { create, type StoreApi, type UseBoundStore } from "zustand";

/**
 * トピック単位ストアの雛形（状態層）。全トピックで使い回す single source of truth。
 *
 * 設計（walking-skeleton.md §2 / CLAUDE.md §2）:
 * - **操作値 (controls)**: ユーザーが直接いじる値。これだけが真実。
 * - **派生値 (derived)**: 計算層の純関数 `derive(controls)` で再計算した結果。直接書き換えない。
 * - **フレーム状態 (frame)**: アルゴリズム図鑑スタイルのコマ送り（StepPlayer）用。
 *
 * Control 層は action を呼ぶだけ、Compute 層は純関数 `derive`、Render 層（Graph/Math/数値）は
 * このストアの controls・derived を購読するだけ、と 3 層を疎結合に保つ。
 */

/** StepPlayer 用のフレーム状態（コマ送り）。 */
export type FrameState = {
  /** フレーム総数（0 のときコマ送り無効）。 */
  count: number;
  /** 現在のフレーム index（0..count-1）。 */
  index: number;
  /** 自動再生中か。 */
  playing: boolean;
};

/** トピックストアの状態とアクション。Controls/Derived はトピックごとに型指定する。 */
export type TopicState<Controls, Derived> = {
  /** 操作値（single source of truth）。 */
  controls: Controls;
  /** 派生値（controls から derive で再計算した読み取り専用の値）。 */
  derived: Derived;
  /** コマ送り状態。 */
  frame: FrameState;
  /** 操作値を 1 つ更新し、派生値を再計算する。 */
  setControl: <K extends keyof Controls>(key: K, value: Controls[K]) => void;
  /** 操作値を部分更新し、派生値を再計算する。 */
  patchControls: (patch: Partial<Controls>) => void;
  /** フレーム総数を設定（index は範囲内へクランプ）。 */
  setFrameCount: (count: number) => void;
  /** フレーム index を指定（範囲外はクランプ）。 */
  goToFrame: (index: number) => void;
  /** 次フレームへ（末尾で停止）。 */
  nextFrame: () => void;
  /** 前フレームへ（先頭で停止）。 */
  prevFrame: () => void;
  /** 再生 / 一時停止を設定。 */
  setPlaying: (playing: boolean) => void;
  /** 操作値・フレームを初期状態へ戻す。 */
  reset: () => void;
};

export type TopicStoreConfig<Controls, Derived> = {
  /** 操作値の初期値。 */
  initialControls: Controls;
  /** 操作値 → 派生値の純関数（計算層 lib/stats から渡す）。 */
  derive: (controls: Controls) => Derived;
  /** フレーム総数の初期値（既定 0 = コマ送りなし）。 */
  initialFrameCount?: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * トピック単位の Zustand ストアを生成するファクトリ。
 * 派生値の再計算を `setControl`/`patchControls` に一元化することで、
 * 1 つの操作変更が Graph・Math 双方へ一貫して反映される（受け入れ条件）。
 */
export function createTopicStore<Controls, Derived>(
  config: TopicStoreConfig<Controls, Derived>,
): UseBoundStore<StoreApi<TopicState<Controls, Derived>>> {
  const { initialControls, derive, initialFrameCount = 0 } = config;
  const initialFrame: FrameState = { count: initialFrameCount, index: 0, playing: false };

  return create<TopicState<Controls, Derived>>((set, get) => ({
    controls: initialControls,
    derived: derive(initialControls),
    frame: initialFrame,

    setControl: (key, value) => {
      const controls = { ...get().controls, [key]: value };
      set({ controls, derived: derive(controls) });
    },

    patchControls: (patch) => {
      const controls = { ...get().controls, ...patch };
      set({ controls, derived: derive(controls) });
    },

    setFrameCount: (count) => {
      const next = Math.max(0, Math.floor(count));
      const maxIndex = Math.max(0, next - 1);
      set((state) => ({
        frame: { ...state.frame, count: next, index: clamp(state.frame.index, 0, maxIndex) },
      }));
    },

    goToFrame: (index) => {
      set((state) => {
        const maxIndex = Math.max(0, state.frame.count - 1);
        return { frame: { ...state.frame, index: clamp(Math.floor(index), 0, maxIndex) } };
      });
    },

    nextFrame: () => {
      set((state) => {
        const maxIndex = Math.max(0, state.frame.count - 1);
        return { frame: { ...state.frame, index: Math.min(state.frame.index + 1, maxIndex) } };
      });
    },

    prevFrame: () => {
      set((state) => ({ frame: { ...state.frame, index: Math.max(state.frame.index - 1, 0) } }));
    },

    setPlaying: (playing) => set((state) => ({ frame: { ...state.frame, playing } })),

    reset: () =>
      set({
        controls: initialControls,
        derived: derive(initialControls),
        frame: initialFrame,
      }),
  }));
}
