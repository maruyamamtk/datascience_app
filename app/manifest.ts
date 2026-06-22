import type { MetadataRoute } from "next";

/**
 * PWA マニフェスト（Next.js App Router ネイティブ → /manifest.webmanifest を生成）。
 * オフライン閲覧・ホーム画面追加（standalone 表示）を成立させる（Issue #7 / SPEC §5.1）。
 * テーマ色はアイコン背景（slate-900）と揃え、起動時のスプラッシュを違和感なくする。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "データサイエンス学習アプリ",
    short_name: "DS学習",
    description: "操作と数式が強連動する、アルゴリズム図鑑スタイルのデータサイエンス学習アプリ。",
    lang: "ja",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    categories: ["education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
