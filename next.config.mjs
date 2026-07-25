import createMDX from "@next/mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // .mdx を pages / content として扱えるようにする（解説文に操作部品を直接埋め込む, SPEC §4.2）。
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
};

// - remark-frontmatter: frontmatter の「値」は registry 側で自前パースするため、描画では本文に出さない。
// - remark-gfm: GitHub Flavored Markdown(`| .. | .. |` のテーブル記法など)を有効化する。
//   これがないと `|公理|内容|` 形式のテーブルがただのパイプ文字を含む段落として描画されてしまう
//   （効用理論(P-4)実装時に発覚。既存の confusion-matrix.mdx 等も同じ記法を使っていたため、
//   このトピックに限らず content/ 全体に及ぶ既存バグだった）。
// - remark-math + rehype-katex: 本文中の `$...$` / `$$...$$` を KaTeX 描画（導出の途中式に使う）。
//   操作と強連動する数式は別途 <Math>（components/math）で `\htmlId` 付き描画する。
const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkFrontmatter, remarkGfm, remarkMath],
    rehypePlugins: [[rehypeKatex, { strict: false, trust: true }]],
  },
});

export default withMDX(nextConfig);
