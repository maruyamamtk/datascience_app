import type { Metadata, Viewport } from "next";
import "./globals.css";
// rehype-katex（MDX 本文の数式）のサーバ描画出力にスタイルを当てるため全体で読み込む。
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "データサイエンス学習アプリ",
  description: "操作と数式が強連動する、アルゴリズム図鑑スタイルのデータサイエンス学習アプリ。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans">{children}</body>
    </html>
  );
}
