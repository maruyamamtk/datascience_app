import createMDX from "@next/mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // .mdx を pages / content として扱えるようにする（解説文に操作部品を直接埋め込む, SPEC §4.2）。
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
};

// - remark-frontmatter: frontmatter の「値」は registry 側で自前パースするため、描画では本文に出さない。
// - remark-math + rehype-katex: 本文中の `$...$` / `$$...$$` を KaTeX 描画（導出の途中式に使う）。
//   操作と強連動する数式は別途 <Math>（components/math）で `\htmlId` 付き描画する。
const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkFrontmatter, remarkMath],
    rehypePlugins: [[rehypeKatex, { strict: false, trust: true }]],
  },
});

export default withMDX(nextConfig);
