// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StepPlayer } from "./StepPlayer";

/**
 * jsdom 環境でのコンポーネント操作テスト（Issue #10）。
 * StepPlayer は controlled component なので、クリック → コールバック呼び出しと、
 * 境界（先頭/末尾/空）での disabled 制御を DOM レベルで検証する。
 */
function setup(overrides: Partial<React.ComponentProps<typeof StepPlayer>> = {}) {
  const props = {
    count: 3,
    index: 1,
    playing: false,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onSeek: vi.fn(),
    onTogglePlay: vi.fn(),
    ...overrides,
  };
  render(<StepPlayer {...props} />);
  return props;
}

describe("StepPlayer (DOM)", () => {
  it("現在位置を『index+1 / count』で表示する", () => {
    setup({ count: 3, index: 1 });
    expect(screen.getByTestId("step-counter")).toHaveTextContent("2 / 3");
  });

  it("前後送りボタンが各コールバックを呼ぶ", () => {
    const props = setup();
    fireEvent.click(screen.getByLabelText("1コマ前へ"));
    fireEvent.click(screen.getByLabelText("1コマ後へ"));
    expect(props.onPrev).toHaveBeenCalledTimes(1);
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });

  it("再生ボタンのクリックで onTogglePlay を呼ぶ", () => {
    const props = setup({ playing: false });
    fireEvent.click(screen.getByLabelText("再生"));
    expect(props.onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it("playing=true では再生ボタンが『一時停止』ラベルに切り替わる", () => {
    setup({ playing: true });
    expect(screen.getByLabelText("一時停止")).toBeInTheDocument();
    expect(screen.queryByLabelText("再生")).not.toBeInTheDocument();
  });

  it("先頭フレームでは『前へ』が、末尾フレームでは『後へ』が無効", () => {
    setup({ count: 3, index: 0 });
    expect(screen.getByLabelText("1コマ前へ")).toBeDisabled();
    expect(screen.getByLabelText("1コマ後へ")).toBeEnabled();
  });

  it("末尾フレームでは『後へ』が無効", () => {
    setup({ count: 3, index: 2 });
    expect(screen.getByLabelText("1コマ後へ")).toBeDisabled();
  });

  it("count=0 では全操作が無効で 0 / 0 表示", () => {
    setup({ count: 0, index: 0 });
    expect(screen.getByTestId("step-counter")).toHaveTextContent("0 / 0");
    expect(screen.getByLabelText("再生")).toBeDisabled();
    expect(screen.getByLabelText("フレームスライダー")).toBeDisabled();
  });

  it("スライダー操作で onSeek に index を渡す", () => {
    const props = setup({ count: 5, index: 0 });
    fireEvent.change(screen.getByLabelText("フレームスライダー"), { target: { value: "3" } });
    expect(props.onSeek).toHaveBeenCalledWith(3);
  });
});
