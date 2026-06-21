# Todo — データサイエンス学習アプリ

参照: [SPEC.md](../SPEC.md)

## 現在のフェーズ: Phase 0（仕様確定・技術検証）

### 確定済み
- [x] 配信方針: Web優先（PWA）→後でネイティブ
- [x] バックエンド: あり（Supabase 想定）
- [x] MVP範囲: 統計検定準1級の基礎
- [x] 学習体験: 概念→操作→演習
- [x] 連動レベル: 強連動（リッチ）
- [x] 最初のプロトタイプ題材: 中心極限定理（CLT）
- [x] 仕様書ドラフト作成（SPEC.md）
- [x] 深掘り標準: Level 0〜6 制（例外なし、Zenn記事基準）
- [x] 可視化スタイル: 『アルゴリズム図鑑』準拠（コマ送り+色+コールアウト）
- [x] 学習トピックに Bookmemo 各書籍を網羅（SPEC §3, §11）
- [x] 実装上の注意を プロジェクト CLAUDE.md に反映
- [x] カリキュラム網羅性担保（準1級/DSエキスパート/DS発展 公式範囲表 + ML記事を §3 に反映、A〜S 領域、タグ式チェックリスト化）

### 次のステップ（要ユーザー確認）
- [ ] 仕様書レビュー: SPEC.md の内容に合意できるか確認
- [ ] 技術スタック最終確定（Next.js / D3 / KaTeX / Supabase で進めるか）
- [ ] 開発環境セットアップ（リポジトリ初期化、Next.js プロジェクト作成）

## プロトタイプ（CLT）実装計画 ※合意後に着手
- [x] 技術検証スパイク: KaTeX の項に id 付与 → 操作で数値/ハイライト連動できるか PoC（Issue #2）
- [ ] state ストア設計（操作値・派生値の single source of truth）→ Issue #3 で実装中
- [ ] 部品分離: コントロール / 計算（純関数）/ 描画（グラフ・数式）→ Issue #3 で規約化

### Issue #3: 状態管理基盤（Zustand トピックストア + 3層疎結合）
- [x] 計算層 `lib/stats/clt.ts`（純関数 deriveClt / standardError、副作用なし）
- [x] `standardError` を計算層へ集約（tex.ts は後方互換 re-export）
- [x] トピック単位ストア雛形 `lib/store/topicStore.ts`（操作値+派生値+フレーム状態）
- [x] CLT 具象ストア `lib/store/clt.ts`（useCltStore）
- [x] Vitest: 計算層・ストアの単体テスト
- [x] 配線パターン PoC `app/poc/store/`（Graph+Math+数値が同一ストアを購読）
- [x] ドキュメント `docs/design/state-store.md`
- [ ] CLT トピックページ実装
  - [ ] ① 概念: 数式 + 導出 + 用語リンク
  - [ ] ② 操作: 元分布選択・n 変更・再サンプリング → グラフ&数式が強連動
  - [ ] ③ 演習: 確認問題 + 即時フィードバック
- [ ] スマホ/PC 両方で操作が 60fps 目標で動くか確認

### Issue #4: 可視化共通部品（StepPlayer / Highlight / Callout）
- [x] 計算層 `components/viz/frame.ts`（純関数 stepTick / isFirstFrame / isLastFrame / frameAt / isHighlighted、型 VizFrame / CalloutContent）+ Vitest
- [x] `StepPlayer`（Control・controlled）: 自動再生 / 一時停止 / 1コマ前後送り / スライダー
- [x] `useFramePlayer`（副作用 hook）: 自動再生タイマー（末尾で自動停止、判定は stepTick に委譲）
- [x] `Highlight`: フレームごとに着目要素を色・枠で強調（数式項と同じ様式）
- [x] `Callout`: 図の近傍に「いま・何が・なぜ」を短文表示（解説 / 補足）
- [x] `VizPanel`: レイアウト規約（1画面1概念・余白多め・番号付き見出し）
- [x] 再利用インターフェース `components/viz/index.ts`（barrel export）
- [x] ダミーフレーム列のデモ `app/poc/viz/`（線形探索で最大値、Issue #3 の frame 状態に配線）
- [x] 実機検証（コマ送り・再生・ハイライト・コールアウト動作、`issue4-poc-verified.png`）

## レビュー（実装後に記入）

### Issue #4: 可視化共通部品（2026-06-21）
- **変更概要**: アルゴリズム図鑑スタイルの共通部品を `components/viz/` に新設。計算層（純関数 frame.ts）/ コントロール（StepPlayer）/ 副作用（useFramePlayer）/ 描画（Highlight・Callout・VizPanel）を 3 層疎結合で分離。フレーム位置は Issue #3 の topicStore の `frame` 状態を single source of truth として再利用。
- **検証結果**: Vitest 35 passed（うち frame.test.ts 8）。lint / typecheck / build 成功。`/poc/viz` で実機確認（前後送り・スライダー・自動再生＋末尾自動停止・2色ハイライト・解説/補足コールアウト切替）。スクショ `issue4-poc-verified.png`。
- **再利用方針**: 新トピックは `@/components/viz` から import し様式を統一。VizFrame 配列にトピック固有 payload を載せ、highlights / callout を共通部品が解釈する。

### Issue #5: コンテンツ基盤（MDX + Level制テンプレート + 用語リンク/用語集）
参照: docs/design/walking-skeleton.md §5 / SPEC §4.1.5, §4.3

設計方針（4本柱を 3層疎結合で実装）:
- **計算層（純関数・テスト可能）**: `lib/content/`
  - `frontmatter.ts`: 最小 frontmatter パーサ（key: value / 引用符 / インライン配列）。依存追加せず自前。
  - `terms.ts`: `content/terms/*.mdx` を fs で読み registry 化（slug/title/definition/seeAlso）。
  - `links.ts`: MDX から用語参照抽出 + 未解決リンク検出（リンク切れゼロ保証）。
  - `inline-math.ts`: 定義文中の `$...$` 分割（ポップオーバーのインライン数式用）。
- **状態/描画層**: `components/content/`
  - `TermsProvider`(context) + `Term`(client, ホバー/タップでポップオーバー)。未解決idは可視エラー。
  - Level制テンプレート部品: `Topic` / `ReaderGuide`(対象読者ガイド) / `Level`(L0..L6) / `Concept`/`Interact`/`Exercise` / `Derivation`(折りたたみ導出)。
- **MDX 設定**: `@next/mdx` 導入、`next.config.mjs` に pageExtensions、ルート `mdx-components.tsx` で部品マッピング。
- **テンプレート保証**: `content/topics/_template.mdx`（L0..L6 枠を必ず含む）+ 生成スクリプト `scripts/new-topic.mjs`（pnpm new:topic）。テストで「テンプレに L0..L6 が揃う」を保証。
- **動作確認**: `app/topics/[slug]/page.tsx` で MDX を描画。テンプレ由来のスキャフォールド（CLT 骨格 L0-L2 + L3-L6 枠）を1本作りブラウザ検証。

TODO:
- [x] `@next/mdx` 等の依存追加 + next.config / mdx-components 設定（remark-frontmatter / remark-math / rehype-katex）
- [x] 計算層 frontmatter / terms / links / inline-math + Vitest
- [x] content/terms に用語ノード（標本平均・標準誤差・期待値・母平均・分散）
- [x] TermsProvider + Term ポップオーバー（ホバー/タップ・未解決idは可視エラー）
- [x] Level制テンプレート部品（Topic/ReaderGuide/Level/Concept/Interact/Exercise/Derivation）
- [x] _template.mdx + new-topic 生成スクリプト（pnpm new:topic）+ テンプレ検証テスト
- [x] app/topics/[slug] / app/terms ルート + デモ topic（CLT骨格）でブラウザ検証
- [x] リンク切れゼロ確認 / lint / typecheck / build / test

### レビュー: Issue #5 コンテンツ基盤（2026-06-21）
- **変更概要**: 4本柱を 3層疎結合で実装。
  - 計算層 `lib/content/`（純関数・Vitest）: frontmatter パーサ / inline-math 分割 / 用語参照抽出・リンク切れ検出 / terms・topics ローダ。
  - 描画・状態層 `components/content/`: `TermsProvider`(context) + `Term`(ホバー/タップでポップオーバー、定義はインライン数式 KaTeX、未解決idは赤波線で可視化) + Level制テンプレート部品（Topic/ReaderGuide/Level(L0..L6)/Concept・Interact・Exercise/Derivation）。
  - MDX: `@next/mdx` + ルート `mdx-components.tsx`。frontmatter は remark-frontmatter で本文非表示・値は自前パース。本文数式は remark-math + rehype-katex、強連動数式は従来 `<Math>`。
  - ルート: `app/topics/[slug]`（MDX を TermsProvider 配下で SSG）/ `app/terms`（用語集）/ `app/terms/[slug]`（用語詳細）。
  - テンプレ保証: `content/topics/_template.mdx`（L0..L6 必須）+ `scripts/new-topic.mjs`（`pnpm new:topic`）+ テンプレ検証テスト。
- **受け入れ条件**: ① テンプレから作ると Level 枠が必ず入る（生成スクリプト + template.test.ts で保証）。② 用語リンクをホバー/タップで定義参照でき、リンク切れなし（registry.test.ts が seeAlso・本文リンク・<Term>参照を全検証）。
- **検証結果**: Vitest 66 passed（content 計算層 31 追加）。lint / typecheck / build 成功（全14ページ静的生成）。`/topics/central-limit-theorem`・`/terms/*` をブラウザ確認（Level表示・数式・導出折りたたみ・用語ポップオーバー[定義+インライン数式+詳しくリンク]・相対リンク遷移）。ハイドレーションエラー（`<p>`入れ子）を1件修正。スクショ: `issue5-topic.png` / `issue5-popover.png` / `issue5-term-page.png`。
- **再利用方針**: 新トピックは `pnpm new:topic <slug> "<title>"` で雛形生成 → L0〜L2 を埋め、用語は `<Term id>` で結ぶ。用語ノードは `content/terms/*.mdx` に frontmatter（title/definition/aliases/seeAlso）で追加。
