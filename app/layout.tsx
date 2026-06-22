import type { Metadata, Viewport } from "next";
import "./globals.css";
// rehype-katex（MDX 本文の数式）のサーバ描画出力にスタイルを当てるため全体で読み込む。
import "katex/dist/katex.min.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { FpsMeter } from "@/components/pwa/FpsMeter";

export const metadata: Metadata = {
  title: "データサイエンス学習アプリ",
  description: "操作と数式が強連動する、アルゴリズム図鑑スタイルのデータサイエンス学習アプリ。",
  // iOS Safari の「ホーム画面に追加」で全画面（standalone）起動させる（Issue #7）。
  appleWebApp: {
    capable: true,
    title: "DS学習",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // PWA のスプラッシュ/アドレスバー色をアイコン背景と揃える。
  themeColor: "#0f172a",
  // ノッチ端末で全画面利用するため safe-area を有効化。
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans">
        {children}
        <ServiceWorkerRegister />
        <FpsMeter />
      </body>
    </html>
  );
}
