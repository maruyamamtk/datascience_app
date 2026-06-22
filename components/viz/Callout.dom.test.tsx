// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Callout } from "./Callout";

/**
 * jsdom 環境でのコンポーネント描画テスト（Issue #10 の導入実証も兼ねる）。
 * Callout は純表示の描画層なので、props → 期待される DOM/アクセシビリティ属性を検証する。
 */
describe("Callout (DOM)", () => {
  it("body を描画し role=note を持つ", () => {
    render(<Callout body="標本平均を 1 つ引いた" />);
    const note = screen.getByRole("note");
    expect(note).toBeInTheDocument();
    expect(note).toHaveTextContent("標本平均を 1 つ引いた");
  });

  it("kind の既定は explain で『解説』バッジを出す", () => {
    render(<Callout body="本文" />);
    expect(screen.getByText("解説")).toBeInTheDocument();
  });

  it("kind=supplement は『補足』バッジを出す", () => {
    render(<Callout body="本文" kind="supplement" />);
    expect(screen.getByText("補足")).toBeInTheDocument();
    expect(screen.queryByText("解説")).not.toBeInTheDocument();
  });

  it("title と note は与えたときだけ描画する", () => {
    const { rerender } = render(<Callout body="本文" />);
    // note(💡)・title は未指定なら出ない
    expect(screen.queryByText(/💡/)).not.toBeInTheDocument();

    rerender(<Callout title="ステップ1" body="本文" note="ここが理由" />);
    expect(screen.getByText("ステップ1")).toBeInTheDocument();
    expect(screen.getByText(/ここが理由/)).toBeInTheDocument();
  });
});
