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
