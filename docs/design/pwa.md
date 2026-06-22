# 設計メモ — PWA 対応とスマホ/PC 動作確認（Issue #7）

関連: [SPEC.md](../../SPEC.md) §5.1, §9 / [walking-skeleton.md](./walking-skeleton.md) §6

## 1. 方針決定: 手動 manifest + Service Worker

walking-skeleton §1 の選択肢「next-pwa もしくは手動」のうち **手動実装**を採用した。

- 理由:
  - `next-pwa` 系は Next 15 / App Router 追従が不安定で、ビルドラッパ（`next.config` 包み込み）と
    ネイティブ依存ビルド許可（pnpm allowBuilds）の追加リスクがある。
  - 本アプリのオフライン要件は「閲覧済みトピックが開ける」だけで、キャッシュ戦略を自前で
    明示的に持つ方が見通しがよい（CLAUDE.md「Simplicity First」）。
- 構成:
  - `app/manifest.ts` … Next ネイティブの `MetadataRoute.Manifest`（`/manifest.webmanifest` を生成）。
  - `public/sw.js` … 素の Service Worker。`components/pwa/ServiceWorkerRegister.tsx` が**本番のみ**登録。
  - `app/offline/page.tsx` … 未キャッシュページのオフライン時フォールバック。
  - `scripts/gen-icons.mjs` … 依存なしでアイコン PNG を生成（釣鐘型ヒストグラム＝CLT 標本平均分布の意匠）。

## 2. キャッシュ戦略（sw.js）

| 種別 | 戦略 | 意図 |
| --- | --- | --- |
| ナビゲーション(HTML) | network-first → cache → `/offline` | 最新を優先しつつ、一度開いたトピックはオフライン再訪可 |
| 静的アセット(`_next/static`, 画像, css/js, フォント) | stale-while-revalidate | 初回表示を軽く、裏で更新 |
| 外部オリジン | 素通し | キャッシュ対象外 |

- キャッシュ名に `VERSION` を持たせ、`activate` で旧バージョンを破棄する。
- 開発時は `ServiceWorkerRegister` が既存登録を解除し、HMR がキャッシュで壊れないようにする。

## 3. レスポンシブ / タッチ

- 操作系はネイティブ `<input type="range">` とボタンで構成済み → タッチ操作は標準で機能する。
- ヒストグラム等の SVG は `viewBox` + `w-full h-auto` で可変幅に追従（実装済み）。
- 追加対応（`globals.css`）:
  - `touch-action: manipulation` でダブルタップズーム由来の操作遅延を抑制。
  - `-webkit-tap-highlight-color: transparent` でアプリらしいタップ感。
  - スライダーに `min-height` を与えタッチの当たり判定を確保。
  - `viewportFit: cover` + `env(safe-area-inset-*)` でノッチ端末の全画面利用に対応。

## 4. 60fps 計測の手順

`?fps` クエリを付けると右下に FPS オーバーレイ（`components/pwa/FpsMeter.tsx`）が出る。本番ビルドでも有効。

```
pnpm build && pnpm start
# PC(Chrome): http://localhost:3000/topics/central-limit-theorem?fps
# iPhone(Safari): 同 URL を LAN 経由で開く（同一 Wi-Fi）
```

計測対象（受け入れ条件）:
- n スライダーを左右に連続ドラッグ → 数式項の差し込み・ハイライト追従中の fps。
- 「＋100 標本」を連打 → ヒストグラム更新中の fps。
- StepPlayer のコマ送り自動再生中の fps。

判定: 操作中に概ね 55fps 以上（緑表示）を維持できれば「60fps 目標」を満たすとみなす。
min 値が 40 を下回る場合は再計算の間引き/メモ化を検討する。

## 5. 実機/シミュレータ確認チェックリスト

- [ ] PC Chrome: DevTools > Application > Manifest が警告なく解決。
- [ ] PC Chrome: Application > Service Workers が activated。Network=Offline で閲覧済みトピックが開ける。
- [ ] PC Chrome: 未訪問 URL をオフラインで開くと `/offline` が出る。
- [ ] iPhone Safari: 「ホーム画面に追加」→ standalone 起動（アドレスバーなし）。
- [ ] iPhone Safari: スライダー/ボタンがタッチで快適に操作でき、操作中 55fps 以上。
