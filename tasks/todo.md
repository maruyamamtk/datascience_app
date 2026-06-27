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
- [x] CLT トピックページ実装（→ Issue #6 で完遂）
  - [x] ① 概念: 数式 + 導出 + 用語リンク
  - [x] ② 操作: 元分布選択・n 変更・再サンプリング → グラフ&数式が強連動
  - [x] ③ 演習: 確認問題 + 即時フィードバック
- [ ] スマホ/PC 両方で操作が 60fps 目標で動くか確認（自動ブラウザ検証は未実施）

### Issue #6: CLT トピック本体（概念→操作→演習の縦串・歩く骨格本体）
- [x] 計算層 `lib/stats/random.ts`（決定的 PRNG mulberry32）+ Vitest
- [x] 計算層 `lib/stats/distributions.ts`（一様/指数/二項、母 μ=5 に統一、理論 σ + sample）+ Vitest
- [x] 計算層 `lib/stats/clt.ts` 改修（controls={distKind,n} / derived={mu,sigma,SE}、drawSample / drawSampleMeans / sampleMean）+ Vitest
- [x] 計算層 `lib/stats/histogram.ts`（等幅ビニング）+ Vitest / `lib/stats/normal.ts`（収束先曲線）+ Vitest
- [x] フレームビルダー `components/topics/clt/frames.ts`（1観測ずつコマ送り）+ Vitest
- [x] ストア `lib/store/clt.ts` を新 controls 形に更新 + テスト更新（PoC は自前ローカルストアへ分離）
- [x] 描画 `CltSamplingLab`（分布選択・n スライダー・サンプリング蓄積・σ/√n 項の差し込み＋ハイライト・ヒストグラム+正規曲線+μ±SE帯）
- [x] 描画 `CltDrawStepper`（StepPlayer で1観測ずつ、暫定平均が動く）/ `CltQuiz`（確認問題→即時フィードバック→操作へ戻る）
- [x] MDX `central-limit-theorem.mdx` の Interact/Exercise に配線（L1）

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

### Issue #6: CLT トピック本体（2026-06-22）
- **変更概要**: CLT を 1 トピックとして縦串。計算層（`lib/stats` に random/distributions/histogram/normal を追加、`clt.ts` を元分布+n→μ/σ/SE へ改修）を全て純関数＋Vitest で固め、描画層（`components/topics/clt/`）に操作ラボ・コマ送り・演習を実装。操作値は `useCltStore`（distKind+n）が single source of truth、標本平均の蓄積のみ component local state。数式 σ/√n 項は `TermController` の DOM 差分パッチで実時間連動（全体再描画なし）。
- **検証結果**: Vitest 102 passed（+67: random/distributions/histogram/normal/clt/frames/store）。lint / typecheck / `next build` 成功（CLT を SSG 出力）。dev サーバで SSR レンダリングを確認（`clt-operation`/`clt-histogram`/`clt-observations`/`term-se` 等のマーカー出力・エラーオーバーレイなし・ログ無エラー）。
- **未実施/留意**: Playwright MCP が本セッションで未接続のため、ブラウザ実操作（サンプリング連動・60fps）の自動検証は未実施。クライアント連動は検証済みの StorePoc と同一パターンを踏襲。元分布は μ=5 に統一し「中心固定で σ/√n に縮みつつ正規へ」を可視化。
- **設計判断**: 元分布が σ を決めるため、ストアの操作値を旧 `{sigma,n}` から `{distKind,n}` へ変更（SE は σ/√n のまま）。これに伴い `/poc/store` は本番ストア非依存の自前ローカルストアに切り離した。

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

---

## Issue #7 — PWA対応 + スマホ/PC 動作確認（60fps・タッチ・オフライン）

設計判断と計測手順は [docs/design/pwa.md](../docs/design/pwa.md) に記録。

TODO:
- [x] manifest（`app/manifest.ts` → /manifest.webmanifest）+ アイコン生成（`scripts/gen-icons.mjs`、依存なし PNG、釣鐘型ヒストグラム意匠）
- [x] Service Worker（`public/sw.js`：ナビ=network-first→cache→/offline、静的=stale-while-revalidate、VERSION で旧キャッシュ破棄）
- [x] SW 登録（`components/pwa/ServiceWorkerRegister.tsx`：本番のみ登録／dev は解除）+ `app/offline/page.tsx`
- [x] レスポンシブ/タッチ（globals.css：touch-action/tap-highlight/range 当たり判定、viewportFit=cover + safe-area）
- [x] 60fps 計測ツール（`components/pwa/FpsMeter.tsx`：`?fps` で表示、本番でも実機計測可）
- [x] layout に themeColor / appleWebApp / アイコンメタ追加
- [x] manifest テスト + vitest include に app/** 追加 / lint / build / test

### レビュー: Issue #7 PWA対応（2026-06-22）
- **方針**: next-pwa を使わず**手動 manifest + SW**を採用（Next15/App Router 追従と pnpm allowBuilds リスク回避、要件が「閲覧済みトピックのオフライン閲覧」に限定されキャッシュ戦略を明示できるため）。
- **変更概要**: ネイティブ manifest（standalone/ja/192・512・maskable）、素の SW（ナビ network-first→cache→/offline、静的 SWR、VERSION 破棄）、本番限定登録、オフラインページ、タッチ最適化 CSS、FPS 計測オーバーレイ、計測手順 docs。
- **検証結果**: Vitest 105 passed（manifest 3 追加）。lint/format/build 成功（全16ページ静的生成、/manifest.webmanifest・/offline 出力）。`pnpm start` で manifest JSON 妥当・sw.js(application/javascript)・全アイコン 200・head に theme-color/manifest/apple-touch-icon を実配信確認。
- **残（実機手動確認）**: iPhone Safari の「ホーム画面追加」standalone 起動 と オフライン再訪、操作中 55fps 維持は docs/design/pwa.md のチェックリストに従い実機で確認する。

---

## Epic #8 — 歩く骨格 受け入れ（CLT縦串で強連動 × コマ送り）

子issue #1〜#7 はすべて CLOSED・main マージ済み。本エピックは新規実装ではなく、構築した歩く骨格が
**完了の定義**を満たすことの統合検証と受け入れ記録。詳細は [docs/design/walking-skeleton-acceptance.md](../docs/design/walking-skeleton-acceptance.md)。

TODO:
- [x] 子issue #1〜#7 のクローズ確認
- [x] 統合検証: `pnpm test`(105 passed) / `tsc --noEmit` / `pnpm lint` / `pnpm build`(16ページ) 全グリーン
- [x] ランタイム・スモーク: `pnpm start` で CLT トピック・用語・manifest・offline が 200、SSR に KaTeX/Level 枠
- [x] 強連動の結線確認（store SSOT → Histogram＋MathFormula/TermController の DOM 差分パッチ）
- [x] 受け入れ記録 docs 作成
- [ ] 実機目視（n スライダー/分布切替の数式実時間追従・指数→釣鐘収束・iPhone standalone/オフライン）← pwa.md チェックリスト

### レビュー: Epic #8 受け入れ（2026-06-22）
- **位置づけ**: 歩く骨格の完成検証。完了の定義 ↔ 証跡（コード/テスト箇所）を `walking-skeleton-acceptance.md` に対応付けて記録。
- **検証結果**: 単体 105 passed・型/lint/build 全グリーン・主要ルート 200。操作→グラフ→数式の強連動は単一ストア購読＋項ノードDOMパッチで結線済み（単体テストで計算層・ストア・フレームを保証）。
- **残**: 実時間の見た目（体感60fps）と iPhone 実機挙動はヘッドレス不可のため pwa.md の実機チェックリストに送る。

---

## Issue #10 — テスト環境: コンポーネントテスト用に jsdom 導入

PR #9 レビューの将来トラップ（`environment:"node"` 固定で `components/**/*.test.tsx` の DOM 描画が `document is not defined` になる）を解消。

設計方針:
- **既定は node を維持**（計算層 lib/** は高速・DOM 不要）。DOM 描画が要るテストだけファイル先頭の
  `// @vitest-environment jsdom` で個別に切り替える（issue 推奨方式・ファイル単位）。
- 依存追加: `jsdom` + `@testing-library/react` / `@testing-library/dom` / `@testing-library/jest-dom`（React19 対応版）。
- `vitest.setup.ts` で `@testing-library/jest-dom/vitest` を読み matcher 登録（マッチャ追加のみで node 安全）。
  tsconfig の `**/*.ts` が setup を拾うため型 augmentation（toBeInTheDocument 等）も効く。
- 実証テスト: `Callout.dom.test.tsx`（純描画・role/バッジ/条件描画）＋ `StepPlayer.dom.test.tsx`（クリック→コールバック・先頭/末尾/空での disabled・slider→onSeek）。

TODO:
- [x] devDeps 追加（jsdom + testing-library 一式）
- [x] vitest.setup.ts（jest-dom 登録）+ vitest.config.ts に setupFiles 追加
- [x] Callout / StepPlayer の jsdom 描画・操作テスト追加
- [x] test / typecheck / lint / build / format 全グリーン

### レビュー: Issue #10 jsdom 導入（2026-06-22）
- **変更概要**: グローバルは node のまま、`// @vitest-environment jsdom` でファイル単位に jsdom 切替。testing-library 一式を導入し、共通部品 Callout/StepPlayer の DOM 描画・操作・disabled を実テストで実証（導入が機能することの証明込み）。
- **検証結果**: Vitest **116 passed**（DOM 11 追加、lib/** は node 環境のまま）。typecheck / lint / build（16ページ）/ format すべて成功。
- **再利用方針**: 今後のコンポーネントテストは `*.dom.test.tsx` でファイル先頭に `// @vitest-environment jsdom` を付け、`@testing-library/react` の render/screen/fireEvent と jest-dom マッチャを使う。計算層は従来どおり node で書く。

---

## コンテンツ拡充 #1 — 正規分布トピック（フル実装）＋ /topics 一覧ページ

MVP計画（SPEC §7）の代表トピックは CLT のみ実装済みで、残り（正規分布／信頼区間／仮説検定／単回帰）が未着手。
かつトピックを回遊する一覧が無く「最低限しか学べない」体感だった。計画準拠の最優先トピック **正規分布** を
CLT と同等品質（Level制・操作→数式の強連動・3層疎結合・純関数＋テスト・用語ノード・演習）でフル実装し、
回遊の起点となる `/topics` 一覧ページを追加した。設計計画: `~/.claude/plans/groovy-wiggling-pelican.md`。

TODO:
- [x] 計算層 `lib/stats/normal.ts` 拡張（standardNormalCdf[A&S 26.2.17 有理近似] / normalCdf / areaWithin / standardize / deriveNormal / normalCurve）+ Vitest（21）
- [x] 状態層 `lib/store/normal.ts`（createTopicStore で useNormalStore、controls {mu,sigma}）
- [x] 描画層 `components/topics/normal/`（NormalCurve=純描画 / NormalLab=μ/σ→曲線＆数式の強連動 / NormalQuiz）
- [x] 用語ノード3件（probability-density-function / standard-normal-distribution / standardization）相互リンク
- [x] MDX `content/topics/normal-distribution.mdx`（L0-L2 充実：密度関数の導出＝ガウス積分で正規化定数・μ/σ²＝期待値/分散、標準化と標準正規・再生性、L3-L6 planned 枠）
- [x] `/topics` 一覧ページ（`listTopics()` で frontmatter 読込）+ トップのリンク更新 + parseTopicMeta テスト

### レビュー: 正規分布トピック＋ /topics 一覧（2026-06-24）
- **変更概要**: CLT で確立した4層パターン（計算 lib/stats → 状態 lib/store（createTopicStore）→ 描画 components/topics → コンテンツ MDX、用語ノードは content/terms）を踏襲し、正規分布を1トピックとして縦串。μ/σ スライダーが `useNormalStore`（single source of truth）を更新→密度曲線（NormalCurve, 固定軸でμのスライド・σの高さ変化を可視化）と数式 f(x) の μ・σ 項（TermController の DOM 差分パッチ）が同時連動。±1σ/2σ/3σ の入れ子帯＋確率コールアウトで 68-95-99.7 則を体感。標準正規CDFは A&S 26.2.17 の有理近似で実装し ±kσ 確率を数値根拠つきで提示。`/topics` 一覧ページ追加でトップ→一覧→各トピックの回遊を回復。
- **検証結果**: Vitest **138 passed**（+33: normal 21 / topics 4 ほか、`registry.test.ts` のリンク切れゼロ維持）。`tsc --noEmit` / `pnpm lint`（警告0）/ `pnpm build`（21ページ SSG：/topics・/topics/normal-distribution・新用語3ページ出力）成功。`pnpm start` + Playwright で実機確認：一覧に CLT＋正規分布、正規分布ページで μ:0→3・σ:1→2 操作時に数式項（term-mu/sigmaA/sigmaB）と σ²=1→4（派生値）が同時更新、釣鐘が μ=3 へ移動、±kσ帯3本・コールアウト・演習・L2標準化・L3-L6 planned 枠を描画、コンソールエラー0件。スクショ `normal-topic.png`。
- **設計判断**: 曲線は μ±4σ の追従ではなく固定軸（x∈[-10,10], y∈[0,0.85]）で描画し、μ＝横スライド・σ＝高さ/広がりの変化を視覚的に分離。areaWithin(k) はスケール不変（k のみ依存）として実装し「μ・σ をどう変えても ±kσ の確率は不変」を演習・コールアウトの主眼に据えた。
- **残/次フェーズ**: 信頼区間・仮説検定・単回帰の各トピック（同じ型で順次）。L3-L6（正規性検定・多変量正規・最大エントロピー）は planned 枠のまま。iPhone 実機の体感60fps は pwa.md チェックリストへ。

---

## コンテンツ拡充 #2 — 信頼区間（区間推定）トピック（フル実装）

正規分布(#20)・CLT(#6) を前提に、区間推定を1トピックとして縦串。CLT/正規分布と同等品質
（Level制・操作→数式の強連動・4層疎結合・純関数＋Vitest・用語ノード・演習）でフル実装し、
「95%」の頻度論的意味を被覆シミュレーションで体感させる（Issue #21）。

TODO:
- [x] 計算層 `lib/stats/interval.ts`（confidenceInterval / zCritical / coverageRate / simulateIntervals）+ Vitest（14）
- [x] `lib/stats/normal.ts` に zQuantile（Acklam 逆正規 CDF）/ normalSample（Box–Muller）追加 + Vitest（+6）
- [x] 状態層 `lib/store/interval.ts`（createTopicStore で useIntervalStore、controls {n,level,sigma}、derived {z,se,lower,upper,halfWidth}）
- [x] 描画層 `components/topics/interval/`（IntervalBar=純描画 / IntervalLab=n・信頼係数・σ→区間幅＆数式 z·σ/√n の強連動 / CoverageSimulator=繰り返し抽出をStepPlayerで1本ずつコマ送り・含む青/外す赤 / IntervalQuiz）+ frames.ts ビルダー + Vitest（6）
- [x] 用語ノード4件（confidence-interval / confidence-level / coverage-probability / pivotal-quantity）相互リンク＋既存（standard-error 等）と結合
- [x] MDX `content/topics/confidence-interval.mdx`（L0-L2 充実：ピボット量 (x̄−μ)/(σ/√n)~N(0,1) からの全ステップ導出、被覆確率の幾何学的直感、σ既知z/未知t・母比率・母分散・片側、L3-L6 planned 枠）
- [x] `/topics` 一覧へ自動反映（frontmatter status: published）

### レビュー: 信頼区間トピック（2026-06-26）
- **変更概要**: 正規分布/CLT で確立した4層パターンを踏襲。n・信頼係数 level・σ スライダーが `useIntervalStore`（single source of truth）を更新→区間バー（IntervalBar, 固定軸±25）と数式 `x̄ ± z·σ/√n` の z・σ・n・半幅 h 項（TermController の DOM 差分パッチ）が同時連動。中核の CoverageSimulator は母集団 N(0,σ²) から n 個を30回抽出し各信頼区間を縦積み描画、StepPlayer で1本ずつコマ送り・母平均を含む区間=青/外す区間=赤・最新フレームを強調し「約95%が母平均を含む」頻度論的意味を体感させる（アルゴリズム図鑑スタイル）。z は標準正規分位点 `zQuantile`（Acklam 有理近似）、母集団抽出は `normalSample`（Box–Muller）を新設し決定的 PRNG で再現可能に。
- **検証結果**: Vitest **164 passed**（+26: interval 14 / normal +6 / frames 6、`registry.test.ts` のリンク切れゼロ維持）。`tsc --noEmit` / `pnpm lint`（警告0）/ `pnpm build`（26ページ SSG：/topics/confidence-interval・新用語4ページ出力）成功。dev + Playwright で実機確認：信頼係数 95%→99% 操作で数式 z 1.96→2.58・半幅 h 3.92→5.15・区間 [-5.15,5.15] が同時更新、被覆シミュレーターを末尾まで送ると「30本中28本的中（被覆率93%/名目95%）」＋赤い外れ区間2本を描画、コンソールエラー0件。
- **設計判断**: ラボは x̄=0 固定で「区間幅が z・σ・n で決まる」ことに集中。シミュレーターは μ=0 中心の対称固定軸（全件で決定し提示中に軸が動かない）で被覆の当たり外れを視認しやすくした。z 区間（σ既知）を主軸に据え、σ未知の t 分布・母比率・母分散・片側は L2 概念＋導出要点で網羅（実装は z 区間に限定し MVP のスコープを守る）。
- **残/次フェーズ**: 仮説検定・単回帰トピック（同じ型で順次）。L3-L6（ブートストラップ区間・ベイズ信用区間・同時信頼区間・post-selection inference）は planned 枠のまま。

---

## カリキュラム網羅フェーズ — SPEC §3 全領域(A〜S) をバックログ起票し優先順に実装

MVP 5トピック完了後、SPEC §3 のチェックリスト全項目（A〜S, 約82トピック）を Level制でサイトに反映する
目標に着手。全件を GitHub issue（#27〜#108）として依存の浅い順に起票し、キューを [tasks/backlog.md](./backlog.md) に記録。
以降このフェーズは「1トピック=1issue=1PR」で順次マージしていく。

### コンテンツ拡充 #27 — [B-1] 事象と確率（条件付き確率・ベイズの定理）

優先度 1/82。確率の最も土台のトピック。中核可視化は**ベイズの定理を自然頻度で体感**するラボ。

- [x] 計算層 `lib/stats/bayes.ts`（deriveBayes / bayesPosterior / naturalFrequencies / 独立性）+ `combinatorics.ts`（factorial / nPr / nCr / 包除原理）+ Vitest（24）
- [x] 状態層 `lib/store/probability-basics.ts`（createTopicStore, controls {prior,sensitivity,specificity}）
- [x] 描画層 `components/topics/probability-basics/`（MosaicPlot=面積比の純描画 / BayesLab=3スライダー→数式 P(D|+) の各項＆事後確率の強連動 / BayesStepper=自然頻度の4段コマ送り / ProbabilityQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード7件（conditional-probability / bayes-theorem / statistical-independence / prior-probability / posterior-probability / law-of-total-probability / inclusion-exclusion-principle）相互リンク
- [x] MDX `content/topics/probability-basics.mdx`（L0-L2 充実：条件付き確率の向きの罠→ベイズ導出全ステップ→独立・包除・場合の数、L3-L6 planned 枠）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 事象と確率トピック（2026-06-28）
- **変更概要**: 既存4層パターン（計算 lib/stats → 状態 lib/store → 描画 components/topics → MDX、用語 content/terms）を踏襲。有病率(事前)・感度・特異度の3スライダーが `useProbabilityStore`（single source of truth）を更新→モザイク図（病気/健康×陽性/陰性の面積分割）と数式 `P(D|+)=P(+|D)P(D)/[…]` の各項（TermController の DOM 差分パッチ）と事後確率が同時連動。BayesStepper は母集団1000人を「母集団→事前で病気/健康→検査で陽性/陰性→陽性者の中の病気割合」と4段でコマ送り（アルゴリズム図鑑スタイル）、最終コマで P(D|+) が「陽性の人だけの中の真陽性割合」と腑に落ちる。場合の数（階乗・nPr・nCr）と包除原理は計算層＋テストで固め L2 で網羅。
- **検証結果**: Vitest **237 passed**（+28: bayes 11 / combinatorics 13 / frames 4、`registry.test.ts` のリンク切れゼロ維持）。`tsc --noEmit` / `pnpm lint`（警告0）/ `pnpm build`（51ページ SSG：/topics/probability-basics・新用語7ページ出力）成功。`pnpm start` + Playwright で実機確認：有病率 1%→30% 操作で数式 term-post 0.09→0.81・term-prior/priorc 追従、モザイク「P(D|+)=9%→81%」、ステッパー最終コマで自然頻度（陽性333=真陽性270＋偽陽性63, P(D|+)=81%）を描画、/topics 一覧に反映、コンソールエラー0件。
- **設計判断**: 中核例は「有病率1%・感度90%・特異度91%→事後9%」の検査の罠を初期値に採用し、最初の一手で «P(+|D)≠P(D|+)» を体感させる。モザイク図は面積比で「陽性帯の中の青の横割合＝事後確率」を直感化。自然頻度ステッパーは率より人数で考える方が直感的という認知科学の知見に沿う。
