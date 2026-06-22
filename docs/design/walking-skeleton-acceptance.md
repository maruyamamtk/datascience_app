# 受け入れ記録 — Epic #8「歩く骨格: CLT縦串で強連動 × コマ送り」

関連: [walking-skeleton.md](./walking-skeleton.md) / [SPEC.md](../../SPEC.md) / Epic #8
作成: 2026-06-22

本エピックは新規コードの追加ではなく、子issue **#1〜#7（すべて CLOSED・main マージ済み）** で
構築した「歩く骨格」が **完了の定義** を満たすことの統合検証と受け入れ記録である。
ここで確立した部品・規約（3層疎結合 / 強連動数式 / コマ送り可視化）を全トピックの土台とする。

---

## 1. 子issueの達成状況（すべて CLOSED）

| # | 内容 | 状態 |
| --- | --- | --- |
| #1 | 基盤セットアップ (Next.js+TS+Tailwind+pnpm+Vitest) | ✅ CLOSED |
| #2 | 数式基盤: KaTeX 項ID付与・ハイライト【核心スパイク】 | ✅ CLOSED |
| #3 | 状態管理基盤: Zustand + 3層疎結合 | ✅ CLOSED |
| #4 | 可視化共通部品: StepPlayer / Highlight / Callout | ✅ CLOSED |
| #5 | コンテンツ基盤: MDX + Level制テンプレート + 用語リンク | ✅ CLOSED |
| #6 | CLTトピック実装【骨格本体】 | ✅ CLOSED |
| #7 | PWA対応 + スマホ/PC 動作確認 | ✅ CLOSED |

## 2. 完了の定義 ↔ 証跡

### ① CLT トピックで 操作→グラフ→数式 が破綻なく強連動
- **結線（single source of truth → グラフ＋数式）**: `components/topics/clt/CltSamplingLab.tsx`
  - 操作値 `{distKind, n}` は `useCltStore`（Zustand）に集約。派生値 `{mu, sigma, standardError}` を同ストアが算出。
  - 同一 state を `Histogram`（グラフ）と `MathFormula`（数式）が購読 → 操作のたび両者が同時更新。
- **数式の強連動（60fps 狙いの DOM 差分パッチ）**: `components/math/tex.ts` が `\htmlId{term-x}{...}` で項に id を付与し、
  `components/math/term-controller.ts` が**数式全体を再描画せず該当項ノードだけ**値差し込み＋色ハイライト（σ/n/SE）。
- **テスト**: `components/math/tex.test.ts`(7) / `lib/store/clt.test.ts`(3) / `lib/store/topicStore.test.ts`(8) /
  `components/topics/clt/frames.test.ts`(5) / `components/viz/frame.test.ts`(8) ＝ 計算層・ストア・コマ送りフレームを純関数で検証。

### ② 「元分布が何でも n を増やすと平均分布が正規に近づき σ/√n に縮む」を体感
- 元分布（一様/指数/二項など）は **μ を共通**に揃え、σ のみ分布で変化（`lib/stats/distributions.ts`）。
  → 中心固定のまま標本平均分布が `μ±SE = μ±σ/√n` に縮み、収束先 `N(μ, σ²/n)` の曲線へ重なる（`CltSamplingLab` ④）。
- **テスト**: `lib/stats/clt.test.ts`(13) / `lib/stats/distributions.test.ts`(9) / `lib/stats/histogram.test.ts`(7) /
  `lib/stats/sample.test.ts`(3) / `lib/stats/normal.test.ts`(4) / `lib/stats/random.test.ts`(4)。

### ③ スマホ/PC 両対応・60fps 目標・オフライン閲覧
- PWA: `app/manifest.ts` / `public/sw.js`（ナビ network-first→cache→/offline、静的 SWR）/ `app/offline/page.tsx`。
- レスポンシブ・タッチ最適化（`app/globals.css`）、60fps 計測オーバーレイ（`components/pwa/FpsMeter.tsx`、`?fps`）。
- **テスト**: `app/manifest.test.ts`(3)。

## 3. 統合検証の実行結果（2026-06-22 / main 取り込み済みコード）

| 検証 | コマンド | 結果 |
| --- | --- | --- |
| 単体テスト | `pnpm test` | **105 passed / 17 files** |
| 型チェック | `tsc --noEmit` | エラーなし |
| Lint | `pnpm lint` | warning/error なし |
| 本番ビルド | `pnpm build` | 成功（16 ページ静的生成、`/topics/central-limit-theorem` SSG） |
| ランタイム・スモーク | `pnpm start` + curl | `/topics/central-limit-theorem`・`/terms/standard-error`・`/manifest.webmanifest`・`/offline` すべて **200** |
| SSR 構造 | 配信 HTML 検査 | 本文 KaTeX（`class="katex"`）・Level 0/1 枠を配信確認。強連動 `<Math>` はクライアント描画のため SSR HTML には現れない（設計通り）。 |

## 4. 残（実機での目視確認）

コード・テスト・ビルド・ランタイムは全グリーン。以下は性質上ヘッドレスでは確証できないため、
[pwa.md](./pwa.md) のチェックリストに従い実機で目視確認する（#6/#7 の残と同一）。

- n スライダー / 分布切替で数式項（σ・n・SE）の数値・色が**実時間で**追従する見た目（DOM パッチの体感 60fps）。
- 元分布を指数（非対称）にして n を大きくすると釣鐘型へ近づく視覚的収束。
- iPhone Safari の「ホーム画面追加」standalone 起動・オフライン再訪。

## 5. 結論

完了の定義のうち**コードで保証できる範囲はすべて達成・検証済み**。歩く骨格は全トピック展開の土台として確立した。
残る実機目視（§4）を別途消化のうえ、Epic #8 をクローズする。
