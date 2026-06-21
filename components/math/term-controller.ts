import katex from "katex";
import { termId } from "./tex";

/**
 * KaTeX で描画済みの数式に対し、**項単位の DOM 差分パッチ**を行う描画層。
 * 数式全体を再描画せず、`\htmlId{term-x}{...}` で id を持つ項ノードだけを更新する
 * （walking-skeleton.md §3「KaTeX 再描画コストを避け DOM パッチで差分更新」、60fps を意識）。
 *
 * 計算層（tex.ts の純関数）には依存するが、副作用（DOM 操作）はここに閉じる。
 */
export class TermController {
  /** 数式を描画したコンテナ。id 解決をこのサブツリーに限定する。 */
  private readonly root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  /** id を持つ項ノードを取得（描画前・未存在なら null）。 */
  private getTermElement(key: string): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`#${CSS.escape(termId(key))}`);
  }

  /**
   * 項の中身だけを KaTeX で再描画して差し込む（数式全体は再描画しない）。
   * @param key  項キー（"n" など）
   * @param tex  差し込む TeX 断片（数値は formatNumber で整形済みを渡す）
   */
  setValue(key: string, tex: string): boolean {
    const el = this.getTermElement(key);
    if (!el) return false;
    katex.render(tex, el, {
      throwOnError: false,
      strict: false,
      trust: true,
    });
    return true;
  }

  /**
   * 項のハイライト（色・枠）を切り替える。CSS クラスのトグルのみで再描画しない。
   * 色は CSS 変数 `--term-color` で項ごとに上書きできる。
   */
  setHighlight(key: string, active: boolean, color?: string): boolean {
    const el = this.getTermElement(key);
    if (!el) return false;
    el.classList.toggle("katex-term--active", active);
    if (color) {
      el.style.setProperty("--term-color", color);
    } else {
      el.style.removeProperty("--term-color");
    }
    return true;
  }

  /** 全ハイライトを解除する。 */
  clearHighlights(): void {
    this.root.querySelectorAll<HTMLElement>(".katex-term--active").forEach((el) => {
      el.classList.remove("katex-term--active");
      el.style.removeProperty("--term-color");
    });
  }
}
