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

### コンテンツ拡充 #28 — [B-3] 分布の特性値（期待値・分散・モーメント）

優先度 2/82。前提=事象と確率。中核可視化は**数直線上の点をドラッグして特性値が連動**するラボ。

- [x] 計算層 `lib/stats/moments.ts`（centralMoment / variance(母/標本) / skewness / kurtosisExcess / cv / quantile / chebyshevBound / correlation / partialCorrelation、`mean` は sample.ts を再利用）+ Vitest（21）
- [x] 状態層 `lib/store/distribution-characteristics.ts`（createTopicStore, controls {points}）
- [x] 描画層 `components/topics/distribution-characteristics/`（MomentLab=点ドラッグ→重心・μ±σ帯・μ/σ²数式の強連動＋歪度/尖度/CV数値 / VarianceStepper=偏差平方を1点ずつ積み上げるコマ送り / MomentQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード9件（moment / skewness / kurtosis / coefficient-of-variation / correlation-coefficient / partial-correlation / chebyshev-inequality / quantile-function / conditional-expectation）+ 既存 expected-value/variance 再利用
- [x] MDX `content/topics/distribution-characteristics.mdx`（L0-L2 充実：期待値=重心・分散の組み立て→モーメントで形を測る→変動係数/分位点/相関/偏相関/条件付き期待値/チェビシェフ導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 分布の特性値トピック（2026-06-28）
- **変更概要**: 単回帰と同じ «点ドラッグ» 型の4層実装。数直線上の7点を `useMomentStore`（SSOT）が保持し、ドラッグ→期待値 μ（重心の三角フルクラム）・μ±σ帯・数式 `μ=1/n Σx`・`σ²=1/n Σ(x−μ)²` の値（TermController の DOM 差分パッチ）・歪度/尖度/変動係数の数値が同時連動。VarianceStepper は偏差平方 (xᵢ−μ)² を1点ずつ加え最後に n で割ると母分散になる過程をコマ送り（アルゴリズム図鑑スタイル）。相関・偏相関・分位点・チェビシェフは計算層＋テスト＋L2導出で網羅（チェビシェフはマルコフから1行で導出）。`mean` は既存 sample.ts を再利用し重複を避けた。
- **検証結果**: Vitest **262 passed**（+25: moments 21 / frames 4、registry リンク切れゼロ維持）。tsc / lint（警告0）/ build（/topics/distribution-characteristics・新用語9ページ出力）成功。`pnpm start` + Playwright 実機確認: 初期 μ=3.29・σ²=4.49・歪度+1.33（右裾）、外れ値 8→3 ドラッグで μ→2.57・σ²→0.82・歪度→−0.21 が数式・統計値・ステッパー（μ追従）とも実時間追従、コンソールエラー0件。
- **設計判断**: 初期標本は右に裾の長い [1,2,2,3,3,4,8] にして «歪度が正» を最初の一手で見せる。分散を平方和で測る理由（符号消去＋外れ強調）を導出とステッパーの両輪で説明。相関/偏相関は2変数で別概念のため重い専用ラボは作らず、計算層＋概念＋数式で反映（回帰トピックで再登場）。

### コンテンツ拡充 #29 — [B-2] 確率分布と母関数

優先度 3/82。前提=分布の特性値。二項分布を題材に PMF→CDF→生存関数の連結を強連動で。

- [x] 計算層 `lib/stats/mass-functions.ts`（binomialPmf/Vector・cdfFromPmf・survivalFromCdf・cdfAt・binomialMgf/Pgf・mgfDerivativeAtZero・marginalX/Y・conditionalXgivenY・isIndependentJoint、二項係数は combinatorics.ts 再利用）+ Vitest（13）
- [x] 状態層 `lib/store/probability-distributions-mgf.ts`（createTopicStore, controls {n,p,x}）
- [x] 描画層 `components/topics/probability-distributions-mgf/`（DistributionLab=PMF棒/CDF階段/生存＋数式 F(x)・S(x) 強連動 / CdfStepper=PMFを1本ずつ積んでCDFを作るコマ送り / JointDistribution=同時分布ヒートマップ＋周辺＋列クリックで条件付き / DistributionQuiz）+ frames.ts + Vitest（3）
- [x] 用語ノード8件（probability-mass-function / cumulative-distribution-function / survival-function / joint-distribution / marginal-distribution / conditional-distribution / moment-generating-function / probability-generating-function）+ 既存 probability-density-function 再利用
- [x] MDX `content/topics/probability-distributions-mgf.mdx`（L0-L2 充実：PMF/CDF/生存→積み上げ導出→同時/周辺/条件付き＋母関数（テイラー展開でモーメント生成）、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 確率分布と母関数トピック（2026-06-28）
- **変更概要**: 二項分布 Bin(n,p) を題材に4層実装。n・p・しきい値 x のスライダーが `useMassStore`（SSOT）を更新→確率関数の棒（x以下=青）・累積分布関数の階段・数式 `F(x)=Σ_{k≤x}P(X=k)`・`S(x)=1−F(x)` の値（TermController）が同時連動。CdfStepper は P(X=k) を1本ずつ累積に加え階段が1へ到達する過程をコマ送り。JointDistribution は天気×傘の同時分布ヒートマップで行和=周辺P(X)・列和=周辺P(Y)を示し、列クリックで条件付き P(X|Y=y)（列を正規化）を提示。母関数 MGF/PGF は計算層＋テスト（M'(0)=μ を中心差分で確認）＋L2導出（テイラー展開）で網羅。二項係数は combinatorics.ts を再利用。
- **検証結果**: Vitest **278 passed**（+16: mass-functions 13 / frames 3、registry リンク切れゼロ維持）。tsc / lint（警告0）/ build（/topics/probability-distributions-mgf・新用語8ページ出力）成功。`pnpm start` + Playwright 実機確認: 初期 F(5)=62%（Bin(10,.5)のCDFと一致）、x 5→7 で F→95%・S→5% が数式追従、同時分布で「傘あり」列クリックで P(雨|傘あり)=0.59 を正しく算出、CdfStepper で F(3)=17.2%、コンソールエラー0件。
- **設計判断**: 連続の確率密度関数は既存トピック（正規分布）に譲り、離散の二項を主役にして «確率関数→CDF→生存» の積み上げ関係を強連動で見せることに集中。同時分布は身近な «天気×傘» の従属例にして周辺化・条件付け・独立性を一望。レビューで n を x 未満に下げると x が範囲外になる不整合を発見→ n 変更時に x をクランプして修正。

### コンテンツ拡充 #30 — [B-4] 変数変換と確率変数の線形結合

優先度 4/82。前提=確率分布と母関数。線形変換 aX+b のスケール・シフトをヤコビアンとともに体感。

- [x] 計算層 `lib/stats/transform.ts`（linearTransformMoments / linearTransformNormalPdf / linearCombinationMoments / convolve / fairDie、normalPdf 再利用）+ Vitest（10）
- [x] 状態層 `lib/store/variable-transformation.ts`（controls {muX,sigmaX,a,b}）
- [x] 描画層 `components/topics/variable-transformation/`（TransformLab=a/b/σ→元と変換後の密度＆数式 E[aX+b]・Var[aX+b] 強連動＋ヤコビアン / ConvolutionStepper=2サイコロの和を6×6グリッドの反対角線で1マスずつ畳み込むコマ送り / TransformQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（change-of-variables / jacobian / linear-combination / convolution）
- [x] MDX `content/topics/variable-transformation.mdx`（L0-L2 充実：線形変換のモーメント→ヤコビアン補正の導出（CDF微分）→線形結合の分散と畳み込み、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 変数変換トピック（2026-06-28）
- **変更概要**: X~N(μ,σ²) に Y=aX+b を施す4層実装。a・b・σ_X のスライダーが `useTransformStore`（SSOT）を更新→元X（破線）と変換後Y（実線）の密度曲線・数式 `E[aX+b]=μ_Y`・`Var[aX+b]=a²σ²=σ_Y²`（TermController）が同時連動。ヤコビアン 1/|a|（面積=確率を保つ高さ補正）をコールアウト＋導出（CDFを微分し連鎖律で1/aが出る）で説明。ConvolutionStepper は2サイコロの和を6×6グリッドの反対角線(i+j=s)強調＋和の分布（三角形）の積み上げでコマ送りし、畳み込み P(Z=k)=ΣP(X=i)P(Y=k−i) を可視化。線形結合の分散（独立で足し算・共分散項）も計算層＋L2で網羅。normalPdf を再利用。
- **検証結果**: Vitest **292 passed**（+14: transform 10 / frames 4、registry リンク切れゼロ維持）。tsc / lint（警告0）/ build（/topics/variable-transformation・新用語4ページ出力）成功。`pnpm start` + Playwright 実機確認: 初期 a=2,b=1 で μ_Y=1・Var_Y=4、a 2→3 で Var_Y→9 が数式追従、畳み込みステッパーで P(Z=7)=16.7%（6通り/36）、コンソールエラー0件。
- **設計判断**: 密度変換のヤコビアンは «横を伸ばすと面積保存で高さが縮む» を曲線の見た目＋導出で二重に提示。和の分布は «一様どうしの和でも中央が膨らむ＝CLTの芽» と次トピック（大数の法則・CLT）への伏線にした。ConvolutionStepper は frame 状態を useTransformStore に同居（TransformLab は frame 不使用なので競合なし）。

### コンテンツ拡充 #31 — [C-1] 離散型確率分布（二項・ポアソン他）

優先度 5/82。前提=確率分布と母関数。6分布族のエクスプローラ＋二項→ポアソン収束。

- [x] 計算層 `lib/stats/discrete.ts`（poisson/geometric/negativeBinomial/discreteUniform PMF + DISCRETE_SPECS（族メタ：平均/分散/PMF/support）+ discretePmfVector、binomialPmf 再利用）+ Vitest（13）
- [x] 状態層 `lib/store/discrete-distributions.ts`（controls {kind,n,p,lambda,r}・族切替で全パラメータ保持）
- [x] 描画層 `components/topics/discrete-distributions/`（DiscreteExplorer=6族ボタン＋種別別スライダー→PMF棒＆平均/分散の数式強連動 / PoissonLimitStepper=np=λ固定でnを増やし二項→ポアソン収束をコマ送り（青棒vs赤点線） / DiscreteQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード7件（bernoulli/binomial/poisson/geometric/negative-binomial/discrete-uniform/multinomial-distribution）相互リンク
- [x] MDX `content/topics/discrete-distributions.mdx`（L0-L2 充実：何を数えるかで選ぶ→二項→ポアソン極限の導出→分布の地図＋多項分布、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 離散型確率分布トピック（2026-06-28）
- **変更概要**: 6分布を共通インターフェース DISCRETE_SPECS（label/mean/variance/pmf/support の関数群）で統一し、`useDiscreteStore` の controls.kind 切替で1つのラボが全族を扱う4層実装。族ボタン＋種別別スライダーが PMF棒・平均線・数式 E[X]=μ/Var[X]=σ²（TermController）を同時更新。PoissonLimitStepper は np=λ=4 固定で n を 2→1000 と増やし、二項（青棒）がポアソン（赤点線）に重なる過程をコマ送り＋最大差%で定量化（アルゴリズム図鑑スタイル）。二項→ポアソン極限は導出（3つの極限因子）でも提示。binomialPmf/combinations を再利用し重複回避。
- **検証結果**: Vitest **309 passed**（+17: discrete 13 / frames 4、registry リンク切れゼロ維持）。tsc / lint（警告0）/ build（/topics/discrete-distributions・新用語7ページ出力）成功。`pnpm start` + Playwright 実機確認: 初期 二項 μ=4・σ²=2.4、ポアソン族に切替で Po(3) μ=σ²=3（平均=分散を確認）、PoissonLimitStepper を末尾(n=1000)まで送ると最大差0.04%、コンソールエラー0件。
- **設計判断**: バラバラな分布カタログにせず «何を数えるか» と «分布の地図（ベルヌーイ→二項→ポアソン、幾何→負の二項）» で関係づけて選べるようにした。多項分布は2D可視化が重いため概念＋多項係数の導出で反映。PoissonLimitStepper の frame は useDiscreteStore に同居（DiscreteExplorer は frame 不使用で競合なし）。

### コンテンツ拡充 #32 — [C-2] 連続型確率分布（指数・ガンマ・ベータ他）

優先度 6/82。前提=離散型確率分布・正規分布。7分布族のエクスプローラ＋指数→ガンマ構築。

- [x] 計算層 `lib/stats/continuous.ts`（lnGamma(Lanczos)/gammaFn + uniform/exponential/gamma/beta/cauchy/lognormal/halfNormal の PDF + CONTINUOUS_SPECS（平均/分散/PDF/range）+ continuousCurve）+ Vitest（14, 台形則で各PDF総和≈1も検証）
- [x] 状態層 `lib/store/continuous-distributions.ts`（controls {kind,lambda,k,theta,mu,sigma}）
- [x] 描画層 `components/topics/continuous-distributions/`（ContinuousExplorer=7族ボタン＋種別別スライダー→PDF曲線＆平均/分散の数式強連動（コーシーは—表示） / GammaBuildStepper=指数をk個足してガンマになる過程をコマ送り / ContinuousQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード8件（exponential/gamma/beta/cauchy/lognormal/half-normal/continuous-uniform/multivariate-normal-distribution）相互リンク
- [x] MDX `content/topics/continuous-distributions.mdx`（L0-L2 充実：何を表すかで選ぶ→指数→ガンマ構築の母関数導出→割合/掛け算/多変量/裾の重さ、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 連続型確率分布トピック（2026-06-28）
- **変更概要**: 7連続分布を共通インターフェース CONTINUOUS_SPECS で統一した4層実装。ガンマ・ベータの正規化に lnGamma（Lanczos近似）を新設。族ボタン＋種別別スライダーが PDF曲線・平均線・数式 E[X]=μ/Var[X]=σ²（TermController）を同時更新。**コーシーは平均/分散が存在しないので mean/variance=NaN→「—」表示＋赤注記**（教育的正しさ）。GammaBuildStepper は θ固定で形状 k を 1→6 と増やし、右肩下がりの指数が釣鐘型のガンマへ近づく過程をコマ送り（指数の和＝ガンマ、CLTの芽）。指数→ガンマは母関数（(λ/(λ−t))^k）でも導出。正規分布は既存トピックに譲りスコープ重複を回避。
- **検証結果**: Vitest **327 passed**（+18: continuous 14 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build（/topics/continuous-distributions・新用語8ページ出力）成功。`pnpm start` + Playwright 実機確認: 初期 ガンマ μ=2・σ²=2、コーシーに切替で μ=σ²=「—」＋注記、GammaBuildStepper を k=6 まで送ると μ=6（指数6個の和）、コンソールエラー0件。
- **設計判断 / つまずき**: ベータ分布の seeAlso に未作成の将来用語 `bayesian-basics`（#59）を入れて registry.test.ts が落ちた→除去。lessons.md に «将来トピックの用語へ先回りリンクしない» を追記。コーシーを入れることで «平均が常に存在するとは限らない/裾の重さ» という連続分布選びの本質を演習に組み込んだ。

### コンテンツ拡充 #33 — [B-5] 大数の法則と正規近似

優先度 7/82。前提=中心極限定理。標本平均の収束と二項→正規近似（連続修正）を体感。

- [x] 計算層 `lib/stats/convergence.ts`（runningMeans / binomialNormalApproxCdf(連続修正) / binomialExactCdf / maxApproxError / deltaMethodVariance、normal・mass-functions 再利用）+ Vitest（8）
- [x] 状態層 `lib/store/law-of-large-numbers.ts`（controls {distKind,revealed}・derived {mu,sigma,se}、distributions 再利用）
- [x] 描画層 `components/topics/law-of-large-numbers/`（LlnLab=元分布選択＋n開示で累積平均がμへ収束する折れ線＋μ±SE帯＋数式|x̄−μ|の強連動 / NormalApproxStepper=nを増やし二項→正規（標準化軸固定・連続修正の最大誤差%）をコマ送り / LlnQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード6件（law-of-large-numbers / convergence-in-probability / convergence-in-distribution / continuity-correction / delta-method / extreme-value-distribution）相互リンク
- [x] MDX `content/topics/law-of-large-numbers.mdx`（L0-L2 充実：標本平均の収束→二項→正規近似＋LLN vs CLT の違いの導出→収束概念/連続修正/ポアソン近似/デルタ法、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 大数の法則と正規近似トピック（2026-06-28）
- **変更概要**: CLT の «兄弟» として4層実装。LlnLab は元分布（一様/指数/二項, μ=5）から500標本を決定的PRNGで生成、n開示スライダーで累積平均の折れ線が母平均μ（紫線）へ収束する様子＋μ±σ/√n帯（√nで収縮）を log横軸で描き、数式 x̄_n・|x̄_n−μ| が同時連動。NormalApproxStepper は p=0.4固定で n=5→150 と増やし、標準化軸(z=(k−μ)/σ)固定で二項（青棒）が標準正規（赤線）へ重なる過程＋CDF最大誤差%（連続修正あり）をコマ送り。連続修正・ポアソン近似・デルタ法・確率収束vs分布収束をL2＋計算層で網羅。
- **検証結果**: Vitest **339 passed**（+12: convergence 8 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build（/topics/law-of-large-numbers・新用語6ページ出力）成功。`pnpm start` + Playwright 実機確認: 指数分布 n=30 で x̄=5.9・差0.9 → n=500 で x̄=4.84・差0.16（収束）、NormalApproxStepper n=150 で μ=60・σ=6・CDF最大誤差0.22%、コンソールエラー0件。
- **設計判断**: LLN と CLT の違い（収束先 vs 収束の形、確率収束 vs 分布収束）を導出で明示し «なぜ √n で割るか» を腑に落とす設計。正規近似ステッパーは軸を標準化して «形の収束» だけに注目させた（PoissonLimitと同型）。frame は NormalApproxStepper のみ使用（LlnLab は revealed を controls で持ち frame 不使用）で競合なし。

### コンテンツ拡充 #34 — [C-3] 標本分布（t・カイ二乗・F）

優先度 8/82。前提=連続型確率分布。3標本分布のエクスプローラ＋t→正規収束。検定・区間推定の裏方。

- [x] 計算層 `lib/stats/sampling-distributions.ts`（tPdf / chiSquarePdf(=gammaPdf(k/2,2)) / fPdf + SAMPLING_SPECS（平均/分散の存在条件込み）+ samplingCurve、continuous.lnGamma/gammaPdf・normalPdf 再利用）+ Vitest（11, 台形則で総和≈1）
- [x] 状態層 `lib/store/sampling-distributions.ts`（controls {kind,df1,df2}）
- [x] 描画層 `components/topics/sampling-distributions/`（SamplingExplorer=t/χ²/F切替＋自由度→PDF曲線＆平均/分散の数式強連動 / TtoNormalStepper=νを増やしt→標準正規の収束をコマ送り / SamplingQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード5件（t-distribution / chi-square-distribution / f-distribution / degrees-of-freedom / noncentral-distribution）相互リンク
- [x] MDX `content/topics/sampling-distributions.mdx`（L0-L2 充実：3分布の役割→t→正規＋σ未知でt分布になる導出→作られ方/t²=F/非心分布、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 標本分布トピック（2026-06-28）
- **変更概要**: t・カイ二乗・F を共通インターフェース SAMPLING_SPECS で統一した4層実装。カイ二乗は gammaPdf(k/2,2)、t/F は lnGamma で正規化（continuous.ts 再利用）。族ボタン＋自由度スライダーが PDF曲線・平均線・数式 E[X]=μ/Var[X]=σ²（モーメント存在条件込み）を同時更新。TtoNormalStepper は ν を 1→200 と増やし、裾の重い t が標準正規（赤点線）へ重なる過程を中心の差%でコマ送り。σ未知で t 分布になる理由（Z/√(χ²/ν)）・標本分散がカイ二乗・t²=F を導出で網羅。
- **検証結果**: Vitest **354 passed**（+15: sampling 11 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build（/topics/sampling-distributions・新用語5ページ出力）成功。`pnpm start` + Playwright 実機確認: t(ν=3) μ=0/σ²=3、χ²(k=3) に切替で μ=3/σ²=6、TtoNormalStepper ν=200で中心差0.0005、コンソールエラー0件。
- **設計判断**: 3分布をバラバラに教えず «正規からの作られ方»（二乗和→χ²、正規÷√(χ²/ν)→t、χ²の比→F）で関係づけ、検定・区間推定（次フェーズ）の伏線にした。t 分布のテスト許容精度は ν=500・精度3 に調整（ν=200・精度3は0.0005差で落ちたため）。非心分布は検出力の基礎として概念＋power 用語リンクで反映。

### コンテンツ拡充 #35 — [D-1] 統計量と十分性

優先度 9/82（Tier2 推定の起点）。前提=標本分布。十分統計量・ネイマン分解・順序統計量を体感。

- [x] 計算層 `lib/stats/sufficiency.ts`（bernoulliSuccesses / bernoulliLogLikelihood / bernoulliMle / likelihoodCurve / orderStatistics / orderStatistic / sampleMedian）+ Vitest（8）
- [x] 状態層 `lib/store/statistics-sufficiency.ts`（controls {bits}・derived {successes,n,mle}）
- [x] 描画層 `components/topics/statistics-sufficiency/`（SufficiencyLab=コイン列トグル→成功数T・尤度曲線・MLE p̂=T/n の強連動＋「並べ替え（T不変）」で十分性を実証 / OrderStatStepper=標本を昇順に整列し最小・中央値・最大を取り出すコマ送り / SufficiencyQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（statistic / sufficient-statistic / neyman-factorization-theorem / order-statistic）相互リンク
- [x] MDX `content/topics/statistics-sufficiency.mdx`（L0-L2 充実：統計量と十分性→ネイマン分解でベルヌーイのTが十分の導出→順序統計量・標本平均と標本分散の独立性とt分布、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 統計量と十分性トピック（2026-06-28）
- **変更概要**: «要約はどこまで情報を保つか» を体感する4層実装。SufficiencyLab はベルヌーイのコイン列（0/1トグル）→ 成功数 T（十分統計量）・尤度曲線 L(p)=pᵀ(1−p)ⁿ⁻ᵀ・MLE p̂=T/n（TermController）が同時更新。「並べ替え（T不変）」ボタンで «順序を変えても T が同じなら尤度も p̂ も不変» を実証＝十分性の核心。OrderStatStepper は標本を昇順に整列し x₍₁₎（最小）→中央値→x₍ₙ₎（最大）を1つずつ取り出すコマ送り。ネイマンの分解定理（L=h(x)g(T,θ)）と標本平均・標本分散の独立性（コクラン）→t分布の正当性を導出で網羅。
- **検証結果**: Vitest **366 passed**（+12: sufficiency 8 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build（/topics/statistics-sufficiency・新用語4ページ出力）成功。`pnpm start` + Playwright 実機確認: 初期 T=6/n=10/p̂=0.6、並べ替えで T=6・p̂=0.6 不変（十分性）、コイン反転で T=5・p̂=0.5（データ変更で追従）、順序統計量ステッパーが [7,2,9,4,2,6,1,8]→[1,2,2,4,6,7,8,9] に整列、コンソールエラー0件。
- **設計判断**: 抽象的な «十分性» を «並べ替えても尤度が動かない» という操作可能な現象に落として体感させた。標本平均と標本分散の独立性を前トピック（標本分布）の t 分布導出と接続し、推定・検定の正当性の土台として位置づけた。frame は OrderStatStepper のみ使用（SufficiencyLab は frame 不使用）で競合なし。

### コンテンツ拡充 #36 — [D-2] 推定法（最尤法・モーメント法・最小二乗法）

優先度 10/82。前提=統計量と十分性。3つの推定流儀と勾配上昇でMLEへ登る過程。

- [x] 計算層 `lib/stats/estimation.ts`（exponentialLogLikelihood/Mle/Score / logLikCurve / gradientAscentSteps / uniformMomentEstimate / uniformMaxMle / residualSumOfSquares、sample.mean 再利用）+ Vitest（10）
- [x] 状態層 `lib/store/estimation-methods.ts`（controls {lambda}・固定標本 ESTIMATION_SAMPLE）
- [x] 描画層 `components/topics/estimation-methods/`（MleLab=λ→対数尤度曲線上の現在地・勾配・MLE頂上の強連動 / GradientAscentStepper=勾配上昇で頂上(MLE)へ1ステップずつ登るコマ送り / EstimationQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（likelihood-function / maximum-likelihood / method-of-moments / linear-model）+ 既存 least-squares 再利用
- [x] MDX `content/topics/estimation-methods.mdx`（L0-L2 充実：最尤法→勾配上昇＋指数のλ̂=1/x̄導出→モーメント法/最小二乗＝正規誤差の最尤の導出/線形模型、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 推定法トピック（2026-06-28）
- **変更概要**: «母数をどう決めるか» の3流儀を4層実装。MleLab は指数分布の率 λ スライダー→対数尤度曲線上の現在地・勾配（スコア）・MLE頂上 λ̂=1/x̄（TermController）が同時更新。GradientAscentStepper は勾配上昇法で出発点から頂上（勾配0=MLE）へ1ステップずつ登る過程をコマ送り（アルゴリズム図鑑スタイル）。モーメント法（一様U[0,θ]の2x̄ vs 最尤max）・最小二乗＝正規誤差の最尤を導出で網羅し、線形模型・回帰へ接続。
- **検証結果**: Vitest **380 passed**（+14: estimation 10 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build（/topics/estimation-methods・新用語4ページ出力）成功。`pnpm start` + Playwright 実機確認: 初期 λ=0.3/logL=−13.35/λ̂=0.65、λ→0.65 で logL=−11.51（上昇）・勾配−0.09（≈0）、勾配上昇ステッパー末尾で λ=0.645=λ̂・勾配0、コンソールエラー0件。
- **設計判断 / つまずき**: 抽象的な «尤度最大化» を «曲線を登る» 操作に落とした。勾配上昇の学習率は安定領域 η<2/n を超えると発散（η=0.5>2/8で発散）→テスト・部品とも η=0.2 に設定、lessons.md に教訓追記。モーメント法は «2x̄ が最大観測を覆えない» 反例で «推定法で答えが変わる» ことを実感させた。最小二乗＝正規誤差の最尤の導出で前トピック（単回帰）と接続。

### コンテンツ拡充 #37 — [D-3] 点推定の性質（不偏性・一致性・バイアス分散分解）

優先度 11/82。前提=推定法。推定量の標本分布でバイアス/分散/MSE/一致性を体感。

- [x] 計算層 `lib/stats/estimator-properties.ts`（sampleVarianceBiased/Unbiased / bias / estimatorVariance / meanSquaredError / biasVarianceDecomposition / relativeEfficiency / simulateVarianceEstimators、normalSample・mean 再利用）+ Vitest（7, MC込み）
- [x] 状態層 `lib/store/point-estimation-properties.ts`（controls {n}・母σ=2固定）
- [x] 描画層 `components/topics/point-estimation-properties/`（BiasVarianceLab=n→偏り/不偏分散の標本分布ヒストグラム＋バイアス/分散/MSEテーブル＋数式 MSE=bias²+分散の強連動 / ConsistencyStepper=nを増やし標本分布が真値へ集中するコマ送り / EstPropQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード7件（unbiasedness / consistency / efficiency / mean-squared-error / bias-variance-decomposition / cramer-rao-bound / gauss-markov-theorem）相互リンク
- [x] MDX `content/topics/point-estimation-properties.mdx`（L0-L2 充実：標本分布とバイアス→n−1で割る理由の導出・一致性→MSE分解の導出/有効性/クラメールラオ/ガウスマルコフ、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 点推定の性質トピック（2026-06-28）
- **変更概要**: «良い推定量とは» を推定量の標本分布で体感する4層実装。BiasVarianceLab は母 N(0,4) から サイズ n を2000回抽出し、偏り分散(1/n,赤)と不偏分散(1/(n-1),青)の標本分布ヒストグラムを重ね描き、各バイアス/分散/MSE と数式 MSE=bias²+分散（TermController）が n に同時連動。偏り分散の山が真値σ²より −σ²/n 左へずれる «なぜ n−1 で割るか» を体感。ConsistencyStepper は n を 3→200 と増やし不偏分散の標本分布が真値の一点へ潰れる（一致性）をコマ送り。MSE分解・有効性・クラメールラオ・ガウスマルコフ(BLUE)を導出＋用語で網羅。
- **検証結果**: Vitest **391 passed**（+11: estimator-properties 7 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build（/topics/point-estimation-properties・新用語7ページ出力）成功。`pnpm start` + Playwright 実機確認: n=5 で MSE=5.87=bias²(0.5)+分散(5.38)、n=40 で MSE=0.82・bias²=0.01（バイアス→0）、一致性ステッパー n=200 で推定量分散0.17へ縮小、コンソールエラー0件。
- **設計判断 / つまずき**: «n−1で割る» の腑落ちを «標本分布の山が左にずれる» 可視化＋自由度の導出で二重化。simulateVarianceEstimators のテストは MC誤差を見込み厳密一致でなく範囲/緩い許容で検証（不偏バイアス<0.2、偏りバイアス∈(−1.2,−0.5)）。フィッシャー情報量は次トピック D-4 の主役なので前方リンクせず本文テキストで触れるに留めた。frame は ConsistencyStepper のみ使用で競合なし。

### コンテンツ拡充 #38 — [D-4] 推定量の漸近的性質（フィッシャー情報量）

優先度 12/82。前提=点推定の性質。最尤推定量の漸近正規性をシミュレーションで体感。

- [x] 計算層 `lib/stats/asymptotics.ts`（exponentialFisherInfo / mleAsymptoticVariance / simulateMleSampling / klExponential / jackknife / stdNormalPdf、estimation.exponentialMle 再利用）+ Vitest（9, MC込み）
- [x] 状態層 `lib/store/asymptotic-properties.ts`（controls {n}・真の率 TRUE_LAMBDA=1.5）
- [x] 描画層 `components/topics/asymptotic-properties/`（AsymptoticLab=n→λ̂の標本分布ヒスト＋漸近正規N(λ,λ²/n)曲線＋数式の漸近分散の強連動 / AsymptoticStepper=nを増やしλ̂が正規へ重なるコマ送り / AsymptoticQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（fisher-information / asymptotic-normality / kullback-leibler-divergence / jackknife）+ 既存 delta-method/cramer-rao-bound 再利用
- [x] MDX `content/topics/asymptotic-properties.mdx`（L0-L2 充実：漸近正規性→指数のI(λ)=1/λ²導出・下限達成→デルタ法/ジャックナイフ/KL＋最尤=KL最小化の導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 推定量の漸近的性質トピック（2026-06-28）
- **変更概要**: «大標本で最尤推定量はどんな分布か» を4層実装。AsymptoticLab は Exp(λ=1.5) から サイズ n を2500回抽出し λ̂=1/x̄ の標本分布ヒストグラム（青）と漸近正規 N(λ,λ²/n)（赤曲線）を重ね、数式の漸近分散 λ²/n（TermController）・フィッシャー情報量 I(λ)=1/λ²・漸近SD=実測SD が n に同時連動。小標本では右に歪み、n を増やすと正規に重なる＝漸近正規性。AsymptoticStepper は n=5→400 でコマ送り。I(λ)=1/λ² の導出（スコアの分散）・最尤=KL最小化の導出・デルタ法・ジャックナイフ・KL非対称を網羅。
- **検証結果**: Vitest **404 passed**（+13: asymptotics 9 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0、実装中に useMemo 依存警告を解消）/ build（/topics/asymptotic-properties・新用語4ページ出力）成功。`pnpm start` + Playwright 実機確認: n=10 で漸近分散0.225・I(λ)=0.444、n=200 で漸近分散0.011・漸近SD=実測SD=0.106（漸近正規性を実証）、ステッパー n=400 で SD=0.075一致、コンソールエラー0件。
- **設計判断 / つまずき**: «漸近分散がフィッシャー情報量の逆数» を «実測SDと理論SDが一致する» 可視化で実証。AsymptoticLab の normalPath を当初 useMemo にしたら toX/toYcount 依存で lint 警告→ 軽量な毎描画計算に変更。KL を最尤と接続（最尤＝経験分布とモデルの KL 最小化）し、次の情報量規準（AIC/BIC, J領域）への伏線にした。frame は AsymptoticStepper のみ使用で競合なし。これで推定ブロック（D-1〜D-4＋既存 D-5 信頼区間）が完成。

### コンテンツ拡充 #39 — [E-2] 検定法の導出（ネイマン・ピアソン）

優先度 13/82（Tier2 検定の導出）。前提=仮説検定・点推定の性質。最強力検定と3検定の関係を体感。

- [x] 計算層 `lib/stats/test-derivation.ts`（normalTestErrors / npThreshold / threeTestStatistics / normalLogLikMu、normalPdf・standardNormalCdf 再利用）+ Vitest（7）
- [x] 状態層 `lib/store/test-derivation.ts`（controls {c}・2単純仮説 NP_CONFIG）
- [x] 描画層 `components/topics/test-derivation/`（NeymanPearsonLab=閾値c→H0/H1分布のα/検出力の面積＆数式の強連動＋α=5%NP閾値ボタン / ThreeTestsStepper=対数尤度曲線上でワルド/スコア/尤度比の幾何をコマ送り / TestDerivQuiz）+ frames.ts + Vitest（3）
- [x] 用語ノード5件（neyman-pearson-lemma / likelihood-ratio-test / wald-test / score-test / exact-test）相互リンク
- [x] MDX `content/topics/test-derivation.mdx`（L0-L2 充実：α/検出力トレードオフ→NP定理＋尤度比>k=x̄>cの導出→3検定の関係＋2次近似で漸近等価の導出/正確検定、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 検定法の導出トピック（2026-06-28）
- **変更概要**: «検定をどう作るか» を4層実装。NeymanPearsonLab は2単純仮説 H0:μ=0 vs H1:μ=1.2（σ既知, n=20）で閾値 c スライダー→H0(灰)/H1(青)の分布上に α(赤面積)/検出力(青面積)＋数式（TermController）が同時連動。「α=5%NP閾値に合わせる」で最強力検定の境界へジャンプ。ThreeTestsStepper は対数尤度曲線上でワルド(水平距離)/スコア(μ0の傾き)/尤度比(高さの差)を1つずつ図示し、正規モデルで3つとも z² に一致することを実証。NP定理（尤度比>k=x̄>c）・3検定の2次近似による漸近等価を導出で網羅。
- **検証結果**: Vitest **414 passed**（+10: test-derivation 7 / frames 3、registry リンク切れゼロ）。tsc / lint（警告0）/ build（/topics/test-derivation・新用語5ページ出力）成功。`pnpm start` + Playwright 実機確認: c=0.37 で α=0.049/検出力≈1、c=1.0 で α→0/検出力0.814（トレードオフ）、3検定ステッパーで Wald=Score=LRT=7.2=z²、コンソールエラー0件。
- **設計判断**: 抽象的なNP定理を «αと検出力の面積のトレードオフ» と «尤度比>k=x̄>c の導出» で具体化。3検定の «同じ隔たりを別角度で測る» を対数尤度の幾何（横/傾き/高さ）で可視化し、2次近似で等価になる理屈を導出。正確検定は小標本での厳密計算として概念＋用語で反映。frame は ThreeTestsStepper のみ使用で競合なし。これで検定の «作り方» の理論が揃った（次は E-3 正規分布に関する検定）。

### コンテンツ拡充 #40 — [E-3] 正規分布に関する検定（t検定・2標本）

優先度 14/82。前提=検定法の導出・標本分布。2標本t検定の手順とt/p連動を体感。

- [x] 計算層 `lib/stats/normal-tests.ts`（tCdf(シンプソン則数値積分)/tTestPValue/oneSampleT/twoSampleT/correlationT/varianceChiSquare/tCurve、sampling-distributions.tPdf/chiSquarePdf 再利用）+ Vitest（12, 既知臨界値2.228で両側p≈0.05検証）
- [x] 状態層 `lib/store/normal-tests.ts`（controls {meanDiff,sd,n}）
- [x] 描画層 `components/topics/normal-tests/`（TwoSampleTLab=平均差/s/n→t分布・観測t・棄却域・p値＆数式の強連動 / TtestStepper=平均差→sp→SE→t→p の5手順コマ送り / NormalTestQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（t-test / two-sample-t-test / welch-t-test / correlation-test）相互リンク
- [x] MDX `content/topics/normal-tests.mdx`（L0-L2 充実：2標本t検定→なぜt=Δ/SEがt分布に従うか導出→等分散vsウェルチ/母分散χ²/無相関検定の導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 正規分布に関する検定トピック（2026-06-28）
- **変更概要**: «平均差は偶然か» を判断する t 検定を4層実装。TwoSampleTLab は平均差Δ・各群s・各群n のスライダー→t統計量・両側p値・棄却域（赤い裾）・数式（TermController）が同時連動。観測tが棄却域に入れば「有意（差あり）」と色分け判定。TtestStepper は «平均差→プールSD→標準誤差→t→p» の5手順を確定値とともにコマ送り（アルゴリズム図鑑スタイル）。tCDFはtPdfのシンプソン則数値積分で実装し既知臨界値で検証。なぜt=Δ/SEがt分布に従うか（正規÷√(χ²/df)）・無相関検定t=r√((n−2)/(1−r²))・等分散vsウェルチ・母分散χ²検定を導出＋用語で網羅。
- **検証結果**: Vitest **430 passed**（+16: normal-tests 12 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build（/topics/normal-tests・新用語4ページ出力）成功。`pnpm start` + Playwright 実機確認: 初期 Δ=1.2/n=15 で t=1.64・p=0.112（有意でない）、n=60 で t=3.29・p=0.001（有意＝同じ差でもnで有意に）、手順ステッパーが Δ1.2→sp2→SE0.365→t3.286→p0.001 と一致、コンソールエラー0件。
- **設計判断**: «有意性を決めるのは効果量と精度の両方» を «n を増やすと同じ差が有意になる» で実感させた。無相関検定で «大標本では小さな相関でも有意»＝有意性と相関の強さは別、を強調。等分散の崩れにウェルチ、母分散にχ²、分散比にF と «統計量→対応する標本分布の裾» の共通骨格で整理（前トピック標本分布と接続）。frame は TtestStepper のみ使用で競合なし。

### コンテンツ拡充 #41 — [E-4] 一般の分布に関する検定（適合度検定）

優先度 15/82。前提=正規分布に関する検定・標本分布。カイ二乗適合度検定をサイコロで体感。

- [x] 計算層 `lib/stats/goodness-of-fit.ts`（chiSquareGof / chiSquareCdf(シンプソン則, df=1は閉形式2Φ(√x)−1) / chiSquareGofPValue / expectedFromProbabilities / uniformExpected、chiSquarePdf・standardNormalCdf 再利用）+ Vitest（11, 既知臨界値3.841/11.07で検証）
- [x] 状態層 `lib/store/goodness-of-fit.ts`（controls {observed[6]}）
- [x] 描画層 `components/topics/goodness-of-fit-tests/`（GoodnessOfFitLab=観測度数の増減→観測vs期待の棒・χ²・p値＆数式の強連動＋有意判定 / ChiSquareStepper=各目の寄与(O−E)²/Eを1つずつ積み上げるコマ送り / GofQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード2件（goodness-of-fit-test / chi-square-test）相互リンク
- [x] MDX `content/topics/goodness-of-fit-tests.mdx`（L0-L2 充実：適合度検定→なぜ(O−E)²/Eがχ²か正規近似の導出・自由度→パラメータ推定/独立性検定の期待度数導出/正確検定、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 一般の分布に関する検定トピック（2026-06-28）
- **変更概要**: «観測度数は想定分布と整合するか» を4層実装。GoodnessOfFitLab はサイコロ6面の観測度数を+/−で増減→観測(青棒)vs期待(赤線, 一様)の差から χ²=Σ(O−E)²/E・p値・数式（TermController）が同時連動、p<0.05で「一様と言えない」色分け判定。ChiSquareStepper は各目の寄与 (O−E)²/E を1つずつ積み上げ合計がχ²になる過程をコマ送り。なぜ(O−E)²/Eがカイ二乗か（標準化した正規の二乗和）・自由度k−1・独立性検定の期待度数=行和×列和/総和を導出で網羅。
- **検証結果**: Vitest **445 passed**（+15: goodness-of-fit 11 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build（/topics/goodness-of-fit-tests・新用語2ページ出力）成功。`pnpm start` + Playwright 実機確認: 初期 観測[12,8,10,11,9,10] で χ²=1.0・p=0.963、目1を15に増やすと χ²=2.81・p=0.729（観測の偏りで連動）、χ²ステッパーが寄与[1.93,0.6,...]積み上げ合計2.81＝ラボ一致、コンソールエラー0件。
- **設計判断 / つまずき**: **本物のバグを修正** — chiSquareCdf の数値積分が df=1（密度がx=0で発散）で χ²=∞ を拾い CDF=1 を返した→ df=1 は閉形式 2Φ(√x)−1 に切替え。lessons.md に «カイ二乗CDF数値積分のdf=1特異点» を追記。E で割って «相対的なずれ» にする点・期待度数5以上の目安・パラメータ推定で自由度が減る点を演習で強調。frame は ChiSquareStepper のみ使用で競合なし。これで検定ブロック（E-1〜E-4）が概ね完成（残 E-5 ノンパラメトリック）。

### コンテンツ拡充 #42 — [E-5] ノンパラメトリック法

優先度 16/82。前提=一般の分布に関する検定。並べ替え検定で帰無分布をデータから作る体験。

- [x] 計算層 `lib/stats/nonparametric.ts`（meanDiff / permutationNull(Fisher-Yates) / permutationPValue / ranks(タイ平均) / wilcoxonRankSum / spearman、sample.mean 再利用）+ Vitest（9）
- [x] 状態層 `lib/store/nonparametric-tests.ts`（controls {shift}・固定シードの決定的並べ替えで p を再現可能に）
- [x] 描画層 `components/topics/nonparametric-tests/`（PermutationTestLab=shift→2群ドット・並べ替え帰無分布・観測差・p値＆数式の強連動 / PermutationStepper=並べ替え回数10→1200で帰無分布が育ちp収束するコマ送り / NonparamQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（permutation-test / wilcoxon-rank-sum-test / kruskal-wallis-test / rank-correlation）相互リンク
- [x] MDX `content/topics/nonparametric-tests.mdx`（L0-L2 充実：並べ替え検定→交換可能性で帰無分布が作れる導出→順位ベース検定群＋スピアマンが単調を捉える導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: ノンパラメトリック法トピック（2026-06-28）
- **変更概要**: «分布を仮定しない» 検定を4層実装。PermutationTestLab は群Aの底上げ shift スライダー→2群ドットプロット・並べ替え帰無分布（ラベルをシャッフルした平均差のヒスト）・観測差（緑線）・p値（観測以上に極端な割合, TermController）が同時連動、有意判定の色分け。PermutationStepper は並べ替え回数を10→1200と増やし帰無分布が滑らかになりp推定が安定する過程をコマ送り。ラベルの交換可能性で帰無分布が作れる導出・スピアマンが単調関係を捉える導出（y=x³でρ=1）を網羅。順位(タイ平均)・ウィルコクソン順位和・スピアマンを計算層で実装。
- **検証結果**: Vitest **458 passed**（+13: nonparametric 9 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0、実装中に useMemo 依存警告を解消）/ build（/topics/nonparametric-tests・新用語4ページ出力）成功。`pnpm start` + Playwright 実機確認: shift=1.5 で Δ=2.17・p=0.004（有意）、shift=0 で Δ=0.67・p=0.396（有意でない）、並べ替えステッパー1200回で p推定0.396＝ラボ一致、コンソールエラー0件。
- **設計判断**: 抽象的な «ノンパラ» を «ラベルをシャッフルして帰無分布をデータから作る» という操作可能な現象に落とした。帰無分布を固定シードの決定的並べ替えで derive し、shift にのみ依存して p を再現可能に。順位ベース検定群（ウィルコクソン/符号付き順位/クラスカル–ウォリス/順位相関）は «値でなく順位/並べ替えに着目して分布の仮定を外す» 共通思想で整理。frame は PermutationStepper のみ使用で競合なし。**これで検定ブロック（E-1〜E-5）が完成**。次は F群（回帰）へ。

### コンテンツ拡充 #43 — [F-2] 重回帰分析

優先度 17/82（F群 回帰の起点）。前提=単回帰。多重共線性とR²vs調整済みR²を体感。

- [x] 計算層 `lib/stats/linalg.ts`（transpose/matMul/matVec/inverse(部分ピボット)/solve）+ `multiple-regression.ts`（olsFit(正規方程式・SE・調整済みR²)/designMatrix/vif/generateCollinearData、normalSample 再利用）+ Vitest（10）
- [x] 状態層 `lib/store/multiple-regression.ts`（controls {rho}・真β=1固定・決定的データ生成）
- [x] 描画層 `components/topics/multiple-regression/`（MulticollinearityLab=相関ρ→係数±2SEのエラーバー・VIF・R²＆数式の強連動 / StepwiseStepper=前進選択でR²(青)vs調整済みR²(赤)をコマ送り / MultiRegQuiz）+ frames.ts + Vitest（3）
- [x] 用語ノード5件（multiple-regression / multicollinearity / variance-inflation-factor / adjusted-r-squared / l1-regularization）相互リンク
- [x] MDX `content/topics/multiple-regression.mdx`（L0-L2 充実：正規方程式・多重共線性→R²が必ず上がる導出・調整済みR²→正則化/変数選択/残差分析/GLS＋Ridgeが多重共線性に強い導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 重回帰分析トピック（2026-06-28）
- **変更概要**: 説明変数が複数の線形回帰を4層実装。再利用可能な行列演算 linalg.ts（転置/積/逆行列）を新設し olsFit を正規方程式 β=(XᵀX)⁻¹Xᵀy＋係数SE＝√(σ̂²·(XᵀX)⁻¹の対角)で実装。MulticollinearityLab は2説明変数の相関ρスライダー→係数±2SEのエラーバー・VIF=1/(1−ρ²)・R²（TermController）が同時連動、真β=1固定なのにρを上げると係数が暴れSEが膨らむ多重共線性の本質を可視化。StepwiseStepper は前進選択でR²(必ず上がる青)とノイズ変数で下がる調整済みR²(赤)をコマ送り。R²単調増加の導出・Ridgeが多重共線性に強い導出・L1スパース選択を網羅。
- **検証結果**: Vitest **471 passed**（+13: multiple-regression 10 / frames 3、registry リンク切れゼロ）。tsc / lint（警告0）/ build（/topics/multiple-regression・新用語5ページ出力）成功。`pnpm start` + Playwright 実機確認: rho=0.3 で VIF=1.1・β1=0.98±0.38、rho=0.96 で VIF=11.6・β1=0.07±1.24/β2=2.04±1.25（真値1から外れSE膨張）なのにR²=0.63維持＝多重共線性を実証、前進選択ステッパーで全変数R²=0.961/調整済み0.959、コンソールエラー0件。
- **設計判断 / つまずき**: «多重共線性は予測でなく係数の安定性を壊す» を «R²は良いのに係数が暴れる» 可視化で実感させた（教育的に最重要ポイント）。テスト期待値の切片を 1.6→1.8 に自己修正（ȳ−slope·x̄=4.2−2.4=1.8）。linalg は部分ピボット選択つきガウス–ジョルダンで特異行列を null 検出。frame は StepwiseStepper のみ使用で競合なし。次は F-3 回帰診断（残差分析）へ。

### コンテンツ拡充 #44 — [F-3] 回帰診断

優先度 18/82。前提=重回帰。残差で前提の崩れを診る（てこ比・影響点・残差パターン・Q-Q・DW）。

- [x] 計算層 `lib/stats/regression-diagnostics.ts`（fitSimple/leverage/residualSd/standardizedResiduals/durbinWatson/qqPoints、zQuantile 再利用）+ Vitest（8）
- [x] 状態層 `lib/store/regression-diagnostics.ts`（controls {px,py}・可動点+基準データ）
- [x] 描画層 `components/topics/regression-diagnostics/`（InfluenceLab=可動点→散布図+直線(点込み青/点なし緑破線)・てこ比・標準化残差の強連動 / ResidualPatternStepper=良い/非線形/不等分散/外れ値の残差プロット4図鑑コマ送り / DiagQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（leverage / durbin-watson / qq-plot / serial-correlation）相互リンク
- [x] MDX `content/topics/regression-diagnostics.mdx`（L0-L2 充実：てこ比と影響点→残差を予測値にプロットする理由・残差模様→標準化残差(分散σ²(1−h)の補正)/Q-Q/DWの導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 回帰診断トピック（2026-06-28）
- **変更概要**: «回帰の前提が崩れていないか» を残差で診る4層実装。InfluenceLab は可動点(x,y)スライダー→散布図＋回帰直線（青=点込み/緑破線=点を除く）・てこ比 h=1/n+(x−x̄)²/Sxx・標準化残差（TermController）が同時連動、高てこ比×外れの «影響点» が直線を引っ張る様子を青vs緑線で可視化。ResidualPatternStepper は良い当てはめ/非線形(U字)/不等分散(ラッパ)/外れ値 の残差プロット模様を4図鑑でコマ送り。標準化残差が分散σ²(1−h)を補正する理由・残差を予測値にプロットする理由を導出で網羅。
- **検証結果**: Vitest **483 passed**（+12: regression-diagnostics 8 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build（/topics/regression-diagnostics・新用語4ページ出力）成功。`pnpm start` + Playwright 実機確認: 初期 点(9,9) で h=0.38・標準化残差≈0・傾き0.99（除外時0.99=影響なし）、点を(9,20)へ動かすと標準化残差2.6(>2外れ値)・傾き0.99→1.72（除外時0.99=1点が直線を引っ張る影響点）、残差パターン4図鑑が動作、コンソールエラー0件。
- **設計判断**: «外れ値の危険度＝てこ比×外れ» を «点込み青線 vs 点なし緑破線» の差で実感させた（最重要ポイント）。残差プロットの «模様» で前提の種類を見分ける図鑑をコマ送りに。標準化残差がてこ比補正を含む理由（Var(eᵢ)=σ²(1−hᵢ)）を導出で明示。frame は ResidualPatternStepper のみ使用で競合なし。次は F-4 質的回帰（ロジスティック）へ。

### コンテンツ拡充 #45 — [F-4] 質的回帰（ロジスティック回帰）

優先度 19/82。前提=重回帰・推定法。2値応答の確率をシグモイドでモデル化。

- [x] 計算層 `lib/stats/logistic.ts`（sigmoid(数値安定)/logit/logisticPredict/oddsRatio/logLikelihood/gradientStep/fitLogistic/generateBinaryData）+ Vitest（9）
- [x] 状態層 `lib/store/qualitative-regression.ts`（controls {b0,b1}・固定2値データ）
- [x] 描画層 `components/topics/qualitative-regression/`（LogisticLab=b0/b1→シグモイド曲線・決定境界・オッズ比・対数尤度の強連動 / LogitFitStepper=勾配上昇で(0,0)から最尤へ登りシグモイドが馴染むコマ送り / LogitQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（logistic-regression / odds-ratio / log-odds / probit-analysis）相互リンク
- [x] MDX `content/topics/qualitative-regression.mdx`（L0-L2 充実：シグモイドで確率予測→対数オッズが線形になる導出(ロジットリンク)→オッズ比/プロビット/GLM＋オッズ比が確率の倍率でない導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 質的回帰トピック（2026-06-28）
- **変更概要**: 2値応答の回帰を4層実装。LogisticLab は b0・b1 スライダー→シグモイド曲線・決定境界(P=0.5)・オッズ比 e^b1・対数尤度（TermController）が同時連動、データ点(緑1/赤0)にS字を当てはめる。LogitFitStepper は勾配上昇で(0,0)から最尤へ登りシグモイドがデータに馴染む過程をコマ送り。シグモイドの逆関数=対数オッズが線形(ロジットリンク)の導出・オッズ比が«確率の倍率»でない導出を網羅。sigmoid は大|z|で exp 発散しないよう数値安定化。
- **検証結果**: Vitest **496 passed**（+13: logistic 9 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`pnpm start` + Playwright 実機確認: b0=-1,b1=0.6 で OR=1.82・決定境界1.67・対数尤度-26.2、b1=1.5 で OR=4.48・対数尤度-20.6（真値方向で改善）、当てはめステッパー反復400で b0=-2.46/b1=1.92・対数尤度-17.9（真値-2,1.5へ収束）、コンソールエラー0件。
- **設計判断 / つまずき**: **MDX build バグを修正** — odds-ratio.mdx の「<1 で起こりにくい」の `<1` が JSX タグ開始と誤認され build 失敗（テストは緑）。言葉に直し lessons.md に追記。«対数オッズが線形» というロジスティックの本質を逆関数の導出で示し、オッズ比が x によらず一定（確率の倍率は一定でない）点を強調。frame は LogitFitStepper のみ使用で競合なし。次は F-5 一般化線形モデルで回帰ブロック完成。

### コンテンツ拡充 #46 — [F-5] 一般化線形モデルと発展

優先度 20/82（F群 回帰の締め）。前提=質的回帰。ポアソン回帰を具体例にGLMを統一。

- [x] 計算層 `lib/stats/glm.ts`（linkFn/inverseLink(3族)/poissonMean/poissonLogLikelihood/poissonGradientStep/fitPoisson/poissonDeviance/generateCountData(Knuth)）+ Vitest（9）
- [x] 状態層 `lib/store/generalized-linear-models.ts`（controls {b0,b1}・固定カウントデータ）
- [x] 描画層 `components/topics/generalized-linear-models/`（PoissonRegressionLab=b0/b1→指数平均曲線λ=exp(b0+b1x)・デビアンス・対数尤度の強連動 / GlmFamilyStepper=正規(恒等)→二項(ロジット)→ポアソン(対数)の族ギャラリーコマ送り / GlmQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード5件（generalized-linear-model / link-function / poisson-regression / exponential-family / deviance）相互リンク
- [x] MDX `content/topics/generalized-linear-models.mdx`（L0-L2 充実：ポアソン回帰→なぜリンク関数が必要かの導出→指数型分布族/IRLS/過分散＋デビアンスが残差平方和の一般化の導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 一般化線形モデルトピック（2026-06-28）
- **変更概要**: 線形/ロジスティック/ポアソン回帰を統一するGLMを4層実装。PoissonRegressionLab は b0・b1 スライダー→指数の平均曲線 λ=exp(b0+b1x)・デビアンス・対数尤度（TermController）が同時連動、件数データに曲線を当てはめる。GlmFamilyStepper は同じ線形予測子 η を各リンクの逆関数（恒等→ロジット→対数）で平均μに写す3族ギャラリーをコマ送り＝«統一構造»を可視化。なぜリンク関数が必要か（μの範囲制約を線形予測子−∞〜∞に合わせる）・デビアンスが残差平方和の一般化である導出を網羅。
- **検証結果**: Vitest **509 passed**（+13: glm 9 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`pnpm start` + Playwright 実機確認: b0=0,b1=0.3 で D=217.8、b1=0.6（真値）で D=61.1・対数尤度-172.3→-93.9（大幅改善）、GLM族ステッパーが正規(恒等)→二項(ロジット)→ポアソン(対数)を循環表示、コンソールエラー0件。
- **設計判断 / つまずき**: GLMの抽象を «同じ η を別のリンクで別の曲線にする» 族ギャラリーで具体化（最重要の統一視点）。ポアソン乱数は Knuth のアルゴリズムで決定的生成。ステッパーの連続クリックは1 evaluate内だと stale state を読む既知挙動を再確認（setTimeout/別 evaluate で正常）。frame は GlmFamilyStepper のみ使用で競合なし。**これで F群（回帰 F-1〜F-5）完成**。次は G群（多変量解析）へ。

### コンテンツ拡充 #47 — [G-1] 分散分析・実験計画法

優先度 21/82（G群 多変量・実験計画の起点）。前提=正規分布の検定。全変動分解とF検定。

- [x] 計算層 `lib/stats/anova.ts`（oneWayAnova(全変動=級間+級内分解・F)/fUpperTail/regularizedIncompleteBeta(連分数)）+ Vitest（8）
- [x] 状態層 `lib/store/analysis-of-variance.ts`（controls {separation}・固定群内ノイズ）
- [x] 描画層 `components/topics/analysis-of-variance/`（AnovaLab=隔たり→3群の点・SS級間/級内・F・pの強連動 / VarianceDecompStepper=全変動→級内→級間→F比の分解コマ送り / AnovaQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（analysis-of-variance / f-test / multiple-comparison / experimental-design）相互リンク
- [x] MDX `content/topics/analysis-of-variance.mdx`（L0-L2 充実：群間vs群内→全変動が直交分解する導出→二元配置/多重比較/実験計画＋多重比較の誤り膨張の導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 分散分析トピック（2026-06-29）
- **変更概要**: 3群以上の平均差をF検定するANOVAを4層実装。AnovaLab は群平均の隔たり separation スライダー→3群の色分け点・総平均/群平均線・SS級間/級内・F・p（TermController）が同時連動、隔たりを増やすと級間変動が増えFが跳ね上がる（級内=誤差は不変）様子を可視化。VarianceDecompStepper は 全変動→級内→級間→F比 の分解を棒でコマ送り。全変動が直交分解する導出（交差項が消える）・多重比較の誤り膨張（1−0.95⁶≈26%）の導出を網羅。
- **検証結果**: Vitest **521 passed**（+12: anova 8 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`pnpm start` + Playwright 実機確認: separation=1 で F=5.19/p=0.019（差あり）、separation=0 で F=0.47/p=0.637（SS級内27.4不変・SS級間19→1.7）、分解ステッパー④F比でラボと一致、コンソールエラー0件。
- **設計判断 / つまずき**: **F分布CDFのバグを修正** — fPdfのシンプソン積分が大Fでピークを取りこぼし不正確→正則化不完全ベータ関数 I_z(d1/2,d2/2) の閉形式に置換（堅牢・t/ベータにも再利用可）、lessons追記。**用語リンクのバグも修正** — multiple-comparison/experimental-design が hypothesis-testing(トピックslug) を指して registry fail→significance-level(用語slug)に修正、lessons追記。級内変動が separation で不変な設計で «群間の差 vs 群内の誤差» の対比を明確化。次は G-2 標本調査法へ。

### コンテンツ拡充 #48 — [G-2] 標本調査法

優先度 22/82。前提=推定法。単純無作為 vs 層化抽出・分散低減・有限母集団修正。

- [x] 計算層 `lib/stats/sampling-survey.ts`（populationMean/populationVariance(層内+層間分解)/srsVariance(FPC)/proportionalAllocation/neymanAllocation/stratifiedVariance/drawSrsMean）+ Vitest（8）
- [x] 状態層 `lib/store/sampling-survey.ts`（controls {n, method}・固定3層母集団）
- [x] 描画層 `components/topics/sampling-survey/`（SamplingSurveyLab=n・抽出法→層構成・各法の標準誤差比較・配分の強連動 / VarianceReductionStepper=SRS→比例→ネイマンのSE低減コマ送り / SurveyQuiz）+ frames.ts + Vitest（3）
- [x] 用語ノード5件（simple-random-sampling / stratified-sampling / neyman-allocation / finite-population-correction / cluster-sampling）相互リンク
- [x] MDX `content/topics/sampling-survey.mdx`（L0-L2 充実：無作為抽出と層化→母分散分解で層化が効く・ネイマン配分が最適である導出→クラスター/FPC＋有限母集団修正の導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 標本調査法トピック（2026-06-29）
- **変更概要**: «どう標本を取れば精度が上がるか» を4層実装。SamplingSurveyLab は標本サイズ n スライダー＋抽出法トグル（SRS/比例/ネイマン）→3層の構成バー・各層への配分 n_h・3法の標準誤差比較バー・SE（TermController）が同時連動。VarianceReductionStepper は SRS→比例→ネイマンと SE が下がる過程をコマ送り。母分散=層内+層間の分解で層化が層間を除いて効くこと・ネイマン配分が分散最小（ラグランジュ）である導出・有限母集団修正の導出を網羅。
- **検証結果**: Vitest **532 passed**（+11: sampling-survey 8 / frames 3、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`pnpm start` + Playwright 実機確認: SRS で SE=1.161（比100%）、ネイマン配分で SE=0.253（**比22%**＝層間の差が大きく層化が劇的に効く）、分散低減ステッパー③でラボと一致、コンソールエラー0件。
- **設計判断**: 層平均を大きく離した3層（10/20/50）で «層化の威力» を体感的に見せた（SE が SRS の1/5に）。母分散の層内+層間分解を可視化の軸に据え、ネイマン配分の最適性を制約付き最小化で導出。frame は VarianceReductionStepper のみ使用で競合なし。**これで G群（分散分析・標本調査）完成**。次は H群（多変量解析）主成分分析へ。

### コンテンツ拡充 #49 — [H-1] 主成分分析

優先度 23/82（H群 多変量解析の起点）。前提=重回帰（共分散行列）。固有値分解で分散最大方向を求める。

- [x] 計算層 `lib/stats/pca.ts`（covariance2/eigenDecomposition2(2×2解析解)/explainedVarianceRatio/projectToPC/generateCorrelatedData）+ Vitest（8）
- [x] 状態層 `lib/store/principal-component-analysis.ts`（controls {corr}・固定2次元データ）
- [x] 描画層 `components/topics/principal-component-analysis/`（PcaLab=相関→散布図・主成分軸(赤PC1/青PC2)・寄与率・λの強連動 / MaxVarianceStepper=軸を0→180°回し射影分散最大=第1主成分を探すコマ送り / PcaQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード6件（principal-component / eigen-decomposition / explained-variance-ratio / dimensionality-reduction / covariance-matrix / covariance）相互リンク
- [x] MDX `content/topics/principal-component-analysis.mdx`（L0-L2 充実：分散最大方向→分散最大が共分散行列の固有ベクトルである導出(ラグランジュ)→標準化/主成分得点/SVD/因子分析＋累積寄与率で次元決定の導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 主成分分析トピック（2026-06-29）
- **変更概要**: 次元圧縮の代表PCAを4層実装。PcaLab は2変数の相関 corr スライダー→散布図・主成分軸(赤PC1/青PC2、長さ=√固有値)・寄与率バー・λ1/λ2・第1主成分寄与率（TermController）が同時連動、相関を強めると第1主成分にデータが集中し寄与率が上がる様子を可視化。MaxVarianceStepper は軸を0→180°回して各角度の射影分散を測り最大=第1主成分を探すコマ送り（«分散最大方向探し»を体感）。分散最大方向が共分散行列の固有ベクトルである導出（u'Σuの制約付き最大化→Σu=λu）・累積寄与率で残す次元を決める導出を網羅。2×2共分散行列の固有値分解は解析解（tr±√(tr²−4det))/2で堅牢。
- **検証結果**: Vitest **544 passed**（+12: pca 8 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`pnpm start` + Playwright 実機確認: corr=0.8 で 寄与率94.4%（λ1=7.57/λ2=0.45）、corr=0 で 82.6%（λ2=0.45→1.41）、分散最大方向ステッパーが角度20°で射影分散7.57=λ1を最大特定（ラボと一致）、コンソールエラー0件。
- **設計判断**: «PCA=分散最大の方向探し»を MaxVarianceStepper の軸回転で直接体感させ、ラボの固有値分解（一発で求まる）と対応づけた（最重要の直観）。固有ベクトルの符号の自由度は射影分散・寄与率に影響しないので問題なし。frame は MaxVarianceStepper のみ使用で競合なし。次は H-2 判別分析へ。

### コンテンツ拡充 #50 — [H-2] 判別分析

優先度 24/82。前提=主成分分析。フィッシャー線形判別で2群を分ける軸と境界。

- [x] 計算層 `lib/stats/discriminant.ts`（centroid/pooledWithinCovariance/fisherLda(w∝Σ_w⁻¹(μ1−μ2))/score/classify(混同行列)/generateTwoClasses、pca.covariance2 再利用）+ Vitest（8）
- [x] 状態層 `lib/store/discriminant-analysis.ts`（controls {separation}・固定2クラスデータ）
- [x] 描画層 `components/topics/discriminant-analysis/`（LdaLab=隔たり→2クラス散布図・判別境界・判別軸・混同行列・誤判別率の強連動 / FisherAxisStepper=軸を回し分離度最大=判別軸を探す＋1次元射影帯のコマ送り / LdaQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（discriminant-analysis / linear-discriminant / misclassification-rate / confusion-matrix）相互リンク
- [x] MDX `content/topics/discriminant-analysis.mdx`（L0-L2 充実：2群を分ける軸→判別軸がΣ_w⁻¹(μ1−μ2)である導出→LDA/QDA/ベイズ判別＋LDAの直線境界がベイズ判別から出る導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 判別分析トピック（2026-06-29）
- **変更概要**: 教師あり分類のLDAを4層実装。LdaLab は2クラスの隔たり separation スライダー→2クラス散布図・判別境界(緑、wに直交)・判別軸(紫)・混同行列・誤判別率（TermController）が同時連動、誤分類点を縁取りで表示。FisherAxisStepper は軸を0→180°回し各角度の分離度J=(群間隔たり)²/(群内分散)を測り最大=判別軸を探す＋下に1次元射影帯をコマ送り（PCAのMaxVarianceと対の構成で«分散最大 vs 分離最大»を対比）。判別軸がΣ_w⁻¹(μ1−μ2)である導出・LDAの直線境界がベイズ判別の2次項相殺から出る導出を網羅。pca.covariance2を再利用。
- **検証結果**: Vitest **556 passed**（+12: discriminant 8 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0、三項演算子の式文をif/elseに修正）/ build成功。`pnpm start` + Playwright 実機確認: separation=4 で 誤判別率3.3%（よく分離）、separation=0.6 で 35.8%（重なりあり）、判別軸ステッパーが角度10°で分離度6.84を最大特定、コンソールエラー0件。
- **設計判断 / つまずき**: PCA（分散最大・教師なし）と LDA（分離最大・教師あり）を対の可視化（軸回転ステッパー）で並べ、多変量解析の2大次元削減の違いを際立たせた。prettierが `(a>=b)===(c>=d)` の括弧を除去したが `>=`>`===` の優先順位で論理不変（実機で誤分類判定の正しさ確認）。lint警告（三項式文）は if/else に修正。frame は FisherAxisStepper のみ使用で競合なし。次は H-3 クラスター分析へ。

### コンテンツ拡充 #51 — [H-3] クラスター分析

優先度 25/82。前提=主成分分析（次元圧縮）。k-meansとエルボー・階層クラスタリング。

- [x] 計算層 `lib/stats/clustering.ts`（assignClusters/updateCentroids/withinClusterSumOfSquares/kmeansStep/kmeansIterate/initCentroids(k-means++)/singleLinkageMerges、pca.Point2 再利用）+ Vitest（10）
- [x] 状態層 `lib/store/cluster-analysis.ts`（controls {k}・固定4塊データ・wcssByK）
- [x] 描画層 `components/topics/cluster-analysis/`（ClusterLab=k→色分けクラスター・重心・WCSS・エルボー曲線の強連動 / KmeansStepper=割り当て→重心更新の収束を★重心でコマ送り / ClusterQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（cluster-analysis / k-means / within-cluster-sum-of-squares / hierarchical-clustering）相互リンク
- [x] MDX `content/topics/cluster-analysis.mdx`（L0-L2 充実：k-means手順→なぜ必ず収束するかの導出（2操作がWCSS非増加）→初期値依存/階層/評価＋エルボーとシルエットでk決定の導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: クラスター分析トピック（2026-06-29）
- **変更概要**: 教師なし学習のクラスタリングを4層実装。ClusterLab はクラスター数 k スライダー→色分けクラスター・重心(輪)・WCSS（TermController）・エルボー曲線（k=1..6のWCSS、現在kを強調）が同時連動、k=4が自然な分割（エルボー）であることを可視化。KmeansStepper は «割り当て→重心更新» の各ステップを★重心の移動と点の色変化でコマ送り（ロイドのアルゴリズムの収束）。k-meansが必ず収束する導出（割り当て・更新の両操作がWCSSを非増加）・エルボーとシルエットでkを選ぶ導出を網羅。pca.Point2を再利用、initCentroidsはk-means++風。
- **検証結果**: Vitest **570 passed**（+14: clustering 10 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`pnpm start` + Playwright 実機確認: k=4 で WCSS=52.5（1ステップ収束）、k=2 で WCSS=450.9（6ステップ・k=2と4の大差でエルボーがk=4を示す）、k-meansステッパーがk=4でステップ1・WCSS52.5収束（ラボと一致）、コンソールエラー0件。
- **設計判断**: PCA（次元圧縮）・判別分析（教師あり分類）に続き «教師なし分類» を据え、H群の多変量解析を «分散最大／分離最大／まとまり最大» の3視点で揃えた。WCSS by k のエルボー曲線をラボに併置し «k選択» を体感させた。CLUSTER_COLORS を ClusterLab から export し Stepper と共有。frame は KmeansStepper のみ使用で競合なし。次は H-4 共分散構造分析・因子分析へ。

### コンテンツ拡充 #52 — [H-4] 共分散構造分析・因子分析

優先度 26/82。前提=主成分分析。観測相関を潜在因子で説明する因子分析・SEM。

- [x] 計算層 `lib/stats/factor-analysis.ts`（impliedCorrelation(λᵢλⱼ)/communality/uniqueness/residualMatrix/residualSumOfSquares/meanCommunality/fitOneFactor(主因子法・冪乗法)）+ Vitest（7）
- [x] 状態層 `lib/store/factor-analysis.ts`（controls {loadingScale}・固定観測相関=真の1因子モデル）
- [x] 描画層 `components/topics/covariance-structure-analysis/`（FactorLab=負荷倍率→観測相関/含意相関のヒートマップ・残差・共通性/独自性バーの強連動 / CommunalityStepper=各変数の分散1=共通性+独自性を積み木でコマ送り / FactorQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（factor-analysis / factor-loading / communality / covariance-structure-analysis）相互リンク
- [x] MDX `content/topics/covariance-structure-analysis.mdx`（L0-L2 充実：潜在因子で相関説明→共通性=λ²・相関=λᵢλⱼの導出→回転/因子数/SEM＋回転の不定性の導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 共分散構造分析・因子分析トピック（2026-06-29）
- **変更概要**: 潜在因子で観測相関を説明する因子分析・SEMを4層実装。FactorLab は因子負荷倍率スライダー→観測相関と含意相関 r_ij=λ_iλ_j のヒートマップ並置・残差平方和（TermController）・共通性(青)/独自性(黄)バーが同時連動、倍率1（真値）で含意相関が観測相関に一致し残差0に。CommunalityStepper は各変数の分散1=共通性λ²+独自性(1−λ²)を積み木でコマ送り。共通性=λ²・相関=λ_iλ_jの導出（独自因子の無相関で交差項が消える）・因子回転の不定性の導出（直交回転で含意共分散不変）を網羅。fitOneFactorは主因子法（冪乗法）。
- **検証結果**: Vitest **581 passed**（+11: factor-analysis 7 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`pnpm start` + Playwright 実機確認: 倍率0.6 で 残差平方和1.201（ずれあり）、倍率1 で 残差0・平均共通性0.5（よく当てはまる、含意相関が観測に一致）、共通性分解ステッパーが理科でλ=0.55・共通性0.30+独自性0.70=1、コンソールエラー0件。
- **設計判断**: «潜在因子が観測相関を生む» を観測相関と含意相関のヒートマップ並置で直接見せ、PCA（記述）との違いを共通性/独自性の分散分解で明確化。回転の不定性を導出で扱い «当てはまり不変で解釈だけ整える» 点を強調。frame は CommunalityStepper のみ使用で競合なし。次は H-5 その他の多変量解析へ。

### コンテンツ拡充 #53 — [H-5] その他の多変量解析

優先度 27/82。前提=主成分分析。MDS中心に数量化・正準相関・対応分析。

- [x] 計算層 `lib/stats/mds.ts`（distanceMatrix/classicalMDS(二重中心化・冪乗法+デフレーション)/kruskalStress/distortDistances、pca.Point2 再利用）+ Vitest（8）
- [x] 状態層 `lib/store/multivariate-other.ts`（controls {distortion}・固定6都市配置）
- [x] 描画層 `components/topics/multivariate-other/`（MdsLab=歪み→距離行列ヒートマップ・MDS復元地図・ストレスの強連動 / MdsBuildStepper=距離のみ→1次元→2次元復元のコマ送り / MvQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（multidimensional-scaling / quantification-theory / canonical-correlation / correspondence-analysis）相互リンク
- [x] MDX `content/topics/multivariate-other.mdx`（L0-L2 充実：距離から地図→距離行列の固有値分解で座標復元の導出（二重中心化）→数量化/正準相関/対応分析＋PCA/MDS/対応分析をつなぐ固有値分解の共通骨格の導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: その他の多変量解析トピック（2026-07-04）
- **変更概要**: 主成分・判別・クラスター・因子に続く «その他» の多変量手法をMDS中心に4層実装。MdsLab は距離の歪み distortion スライダー→与えられた距離行列ヒートマップ・MDSが距離だけから復元した地図（6都市）・ストレス（TermController）が同時連動、歪み0で地図を完全再現(ストレス0)、歪みを増やすと布置が崩れる。MdsBuildStepper は «距離のみ→1次元復元→2次元復元» と次元を増やしストレスが下がる過程をコマ送り。距離²と内積の関係から二重中心化 B=−½JD²J で座標が復元できる導出・PCA/MDS/対応分析をつなぐ«固有値分解の共通骨格»の導出を網羅。数量化理論Ⅰ〜Ⅳ類・正準相関・対応分析をL2で位置づけ。古典的MDSは冪乗法+デフレーションで上位固有対を計算。
- **検証結果**: Vitest **593 passed**（+12: mds 8 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0、未使用n除去）/ build成功。`pnpm start` + Playwright 実機確認: 歪み0 で ストレス0（距離完全再現）、歪み1.2 で ストレス0.072（歪みあり）、MDS復元ステッパー2次元でストレス0.000、コンソールエラー0件。
- **設計判断**: «座標が未知でも距離があれば地図が描ける» をMDS復元地図で直接体感させ、主成分分析との数学的近さ（固有値分解）をL2導出で明示して多変量解析群を «固有値分解の共通骨格» で締めた。回転・鏡映の自由度は距離を保つので表示上問題なし。frame は MdsBuildStepper のみ使用で競合なし。次は H-6 カーネル密度推定へ。

### コンテンツ拡充 #54 — [H-6] カーネル密度推定

優先度 28/82。前提=連続型確率分布。ヒストグラムの滑らか版・帯域幅のトレードオフ。

- [x] 計算層 `lib/stats/kde.ts`（kernel(4種)/kde/silvermanBandwidth/sampleSd/iqr/densityCurve/integratedSquaredError）+ Vitest（12）
- [x] 状態層 `lib/store/kernel-density-estimation.ts`（controls {bandwidth, kernel}・二峰性混合正規の真の密度＋固定データ）
- [x] 描画層 `components/topics/kernel-density-estimation/`（KdeLab=帯域幅・カーネル→個別の山・KDE曲線・真の密度・ISEの強連動 / BandwidthStepper=過小→最適→過大平滑をISE最小基準でコマ送り / KdeQuiz）+ frames.ts + Vitest（5）
- [x] 用語ノード4件（kernel-density-estimation / bandwidth / kernel-function / silverman-rule）相互リンク
- [x] MDX `content/topics/kernel-density-estimation.mdx`（L0-L2 充実：各点に山を置いて足す→帯域幅がバイアス–分散のトレードオフである導出→帯域幅選択/カーネル/多変量＋ヒストグラムが一様カーネルKDEである導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: カーネル密度推定トピック（2026-07-04）
- **変更概要**: ヒストグラムの滑らか版KDEを4層実装。KdeLab は帯域幅 h スライダー＋カーネル種別トグル（ガウス/エパネチニコフ/三角/一様）→各データ点の個別カーネル（薄紫の山40本）・KDE曲線（紫）・真の密度（緑破線）・ISE（TermController）・データのラグが同時連動、シルバーマン目安ボタンつき。h小でギザギザ・h大で二峰性が潰れる様子を可視化。BandwidthStepper は h を過小→最適→過大とコマ送りしregime色分け（赤/緑/橙）でバイアス–分散を見せる。帯域幅がバイアス(∝h²)–分散(∝1/nh)のトレードオフである導出・ヒストグラムが一様カーネルKDEである導出を網羅。真の密度は二峰性混合正規でISE評価。
- **検証結果**: Vitest **610 passed**（+17: kde 12 / frames 5、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`pnpm start` + Playwright 実機確認: h=0.88(シルバーマン)で ISE=0.037（過平滑）、h=0.36 で ISE=0.014（二峰性が出て改善・個別カーネル42パス）、帯域幅ステッパーが h=0.35 で ISE最小(緑)を特定（ラボの手動最適と一致）、コンソールエラー0件。
- **設計判断 / つまずき**: **統計的事実の反映** — シルバーマンは正規前提で二峰性データでは過平滑。frames の regime を「silverman=good」と決め打ちしたら ISE(0.2·silverman)<ISE(silverman) でテスト失敗→ «最適» を ISE の argmin で判定するよう修正（教育的にも «シルバーマンは万能でない» と示せて正しい）。lessons.md に «最適パラメータをテストで固定値に決め打ちしない» を追記。frame は BandwidthStepper のみ使用で競合なし。次は H-7 へ（H群最後）。

### コンテンツ拡充 #55 — [L-1] マルコフ連鎖

優先度 29/82（L群 確率過程の起点）。前提=事象と確率。遷移行列・定常分布・エルゴード性。

- [x] 計算層 `lib/stats/markov.ts`（step(πP)/evolve/stationaryDistribution(冪乗法)/isStochastic/totalVariationToStationary/samplePath）+ Vitest（12）
- [x] 状態層 `lib/store/markov-chains.ts`（controls {rainStick}・3状態天気連鎖）
- [x] 描画層 `components/topics/markov-chains/`（MarkovLab=雨の続きやすさ→遷移行列ヒートマップ・定常分布バーの強連動 / DistributionStepper=初期分布→定常分布への収束を棒＋定常目標線でコマ送り / MarkovQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（markov-chain / transition-matrix / stationary-distribution / mcmc）相互リンク
- [x] MDX `content/topics/markov-chains.mdx`（L0-L2 充実：マルコフ性→固有値分解で初期状態を忘れ定常分布に収束する導出→既約/非周期/詳細釣り合い/MCMC＋詳細釣り合いが定常分布を与える導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: マルコフ連鎖トピック（2026-07-04）
- **変更概要**: «記憶のない» 確率過程マルコフ連鎖を4層実装。MarkovLab は雨の続きやすさ P(雨→雨) スライダー→3×3遷移行列ヒートマップ・定常分布バー（晴/曇/雨）・π_雨（TermController）が同時連動、雨が続きやすいほど定常分布の雨が増える。DistributionStepper は初期分布(晴100%)から πP を反復し定常分布(破線)へ収束する過程を棒でコマ送り。固有値分解で初期状態依存の項(|λ|<1)が指数的に消え定常分布に収束する導出・詳細釣り合いπ_iP_ij=π_jP_jiが定常分布を与える導出(MCMC設計原理)を網羅。samplePathで長期滞在割合が定常分布に一致することも検証。
- **検証結果**: Vitest **626 passed**（+16: markov 12 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`pnpm start` + Playwright 実機確認: P(雨→雨)=0.6 で 定常π_雨=0.294、0.9 で 0.625（雨がちな気候）、分布推移ステッパーが t=14 で定常への距離0.011に収束、コンソールエラー0件。
- **設計判断 / つまずき**: «記憶のなさ→遷移行列だけで長期挙動が決まる» を定常分布バーの連動で体感、収束を固有値分解の導出で裏づけて MCMC（詳細釣り合い）へ橋渡し。mcmc用語の seeAlso/本文が未作成の monte-carlo(トピック#57)を指していたので除去（[[lessons: 用語リンクは実在slugのみ]]の再確認）。frame は DistributionStepper のみ使用で競合なし。**これでH群完了**、L群（確率過程）に前進。次は L-2 確率過程へ。

### コンテンツ拡充 #56 — [L-2] 確率過程

優先度 30/82。前提=マルコフ連鎖。ブラウン運動・分散∝t・ランダムウォーク・ポアソン過程。

- [x] 計算層 `lib/stats/stochastic.ts`（randomWalk/brownianMotion/poissonProcess/ensembleVariance/ensembleMean/brownianEnsemble）+ Vitest（9）
- [x] 状態層 `lib/store/stochastic-processes.ts`（controls {sigma, mu}・T=1のブラウン運動アンサンブル）
- [x] 描画層 `components/topics/stochastic-processes/`（BrownianLab=σ・μ→標本パス・±2σ√t拡散帯・平均ドリフト線・終端分散σ²Tの強連動 / ProcessGalleryStepper=ランダムウォーク→ブラウン運動→ポアソン過程のギャラリーコマ送り / StochasticQuiz）+ frames.ts + Vitest（4）
- [x] 用語ノード4件（stochastic-process / brownian-motion / random-walk / poisson-process）相互リンク
- [x] MDX `content/topics/stochastic-processes.mdx`（L0-L2 充実：時間で広がるランダムさ→独立増分の加算で分散∝tの導出→独立増分/マルコフ性/不変原理/SDE＋ランダムウォーク→ブラウン運動の不変原理の導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 確率過程トピック（2026-07-04）
- **変更概要**: «時間とともにランダムに変化する量» をブラウン運動中心に4層実装。BrownianLab は σ(ボラティリティ)・μ(ドリフト)スライダー→16本の標本パス・±2σ√t の拡散帯(放物線状に開く)・平均ドリフト線・終端分散σ²T（TermController）が同時連動、σを上げると帯が√tで広がる «拡散» を可視化。ProcessGalleryStepper はランダムウォーク(±1折れ線)→ブラウン運動(正規増分)→ポアソン過程(指数間隔の階段)を «増分の種類» つきでコマ送り。独立増分の分散加算で Var[B_t]=σ²t になる導出・ランダムウォーク→ブラウン運動の不変原理(CLTの過程版)の導出を網羅。ポアソン過程は指数間隔生成で N(t)〜Po(λt) を検証。
- **検証結果**: Vitest **639 passed**（+13: stochastic 9 / frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`pnpm start` + Playwright 実機確認: σ=1 で 終端分散=1、σ=2 で 4（σ²Tで拡散帯が広がる）、過程ギャラリーが3過程を循環表示（③ポアソン=指数間隔ジャンプ）、コンソールエラー0件。
- **設計判断 / つまずき**: «独立増分の積み重ね→分散∝t→√tで広がる拡散» を拡散帯の連動で体感させ、不変原理でランダムウォーク・CLTと接続、増分の種類で3過程を対比した。**MDXのバグ2件を修正** — L2でConcept閉じタグを誤って `</Derivation>` と書きJSXネスト崩れ→`</Concept>`に、用語リンクにトピックslug(central-limit-theorem)混入・topic MDXの<Term>が未作成用語を指す問題→平文/実在用語(standard-normal-distribution)に修正。frame は ProcessGalleryStepper のみ使用で競合なし。次は L-3 計算多用手法（ブートストラップ・モンテカルロ）へ。

### コンテンツ拡充 #57 — [L-3] 計算多用手法（ブートストラップ・モンテカルロ）

優先度 31/82。前提=マルコフ連鎖・推定量の性質。乱数で試して数える（モンテカルロ）・標本を引き直してばらつきを測る（ブートストラップ）。

- [x] 計算層 `lib/stats/monte-carlo.ts`（throwDarts/estimatePi/runningPiEstimate/monteCarloIntegrate/resample/bootstrapStatistics/bootstrapStandardError/percentileInterval/quantileSorted）+ Vitest（12）
- [x] 状態層 `lib/store/monte-carlo-methods.ts`（controls {levelIndex}・ダーツ数を対数的に 50→12800、π推定と収束曲線を派生）
- [x] 描画層 `components/topics/monte-carlo-methods/`（MonteCarloLab=ダーツ数→散布図(円内緑/外赤)・π̂=4k/nの強連動・収束 / BootstrapStepper=元標本→復元抽出→ヒストグラム構築→パーセンタイル信頼区間帯をコマ送り / MonteCarloQuiz）+ frames.ts + Vitest（5）
- [x] 用語ノード3件（monte-carlo-method / bootstrap / resampling）相互リンク（既存 law-of-large-numbers / standard-error / confidence-interval へ接続）
- [x] MDX `content/topics/monte-carlo-methods.mdx`（L0-L2 充実：乱数でπを数える→経験分布からの復元抽出が標準誤差を与える導出→1/√n収束/モンテカルロ積分/適用条件＋モンテカルロ誤差が次元に依らず1/√nの導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 計算多用手法トピック（2026-07-04）
- **変更概要**: «計算資源で押し切る» モンテカルロ法とブートストラップを4層実装。MonteCarloLab はダーツ数 n スライダー→[-1,1]²への散布図(円内緑/外赤)・π̂=4k/n（TermController で k・n・π̂ を差し込み）・|誤差| が同時連動、n を増やすと誤差が 1/√n で縮む。BootstrapStepper は元標本(n=8)→復元抽出を1つずつ見せ→600回まで積み上げてブートストラップ分布(ヒストグラム)を構築→パーセンタイル95%信頼区間を帯で提示するコマ送り。経験分布 F̂ を母集団の代わりにする→復元抽出の標準偏差が標準誤差になる導出・モンテカルロ誤差が次元に依らず1/√nで縮む導出を網羅。
- **検証結果**: Vitest **656 passed**（+17: monte-carlo 12 / frames 5、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`next start` + Playwright 実機確認: n=200 で π̂=3.2・誤差0.0584、n=12800 で π̂=3.1375・誤差0.0041（1/√n収束）、ブートストラップ最終フレームで 600再標本・SE=1.140・95%CI[5.50,9.75]（標本平均7.625を含む）、コンソールエラー0件。
- **設計判断 / つまずき**: モンテカルロ(乱数で面積/積分)とブートストラップ(標本の引き直し)を «乱数を大量に発生させて試す» 計算多用手法として1トピックに統合、L0=π推定・L1=ブートストラップと段階配置。前回同様に未作成トピックslug(mcmc-methods #86)へのリンクは張らず、既存 mcmc 用語で MCMC への接続を予告。BootstrapStepper の stats を useMemo でラップし exhaustive-deps 警告を解消。**これで L群(L1-L3)完了**、次は M群 時系列解析へ（M-1 時系列解析の基礎）。

### コンテンツ拡充 #58 — [M-1] 時系列解析の基礎

優先度 32/82（M群 時系列の起点）。前提=分布の特性値。トレンド・季節・不規則分解／移動平均／自己相関(ACF)／定常性／ホワイトノイズ。

- [x] 計算層 `lib/stats/time-series.ts`（generateSeries(3成分分解)/movingAverage/autocovariance/autocorrelation/acf/difference/acfConfidenceBound）+ Vitest（11）
- [x] 状態層 `lib/store/time-series-basics.ts`（controls {slope, amp, noiseSd, window}・分散の平滑化前後を派生）
- [x] 描画層 `components/topics/time-series-basics/`（TimeSeriesLab=傾き/振幅/ノイズ/窓→系列・移動平均線・分散・成分ハイライトの強連動 / AcfStepper=ラグkずらし重ね→コレログラム積み上げのコマ送り / TimeSeriesQuiz）+ frames.ts + Vitest（6）
- [x] 用語ノード6件（time-series / trend-seasonal-decomposition / autocorrelation / stationarity / white-noise / moving-average）相互リンク
- [x] MDX `content/topics/time-series-basics.mdx`（L0-L2 充実：3成分分解→季節周期でACFピークが立つ導出（cos振動）→定常性/階差/ホワイトノイズ＋階差でトレンドが消える導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 時系列解析の基礎トピック（2026-07-04）
- **変更概要**: «時間順に並んだデータの構造» を4層実装。TimeSeriesLab はトレンド傾き・季節振幅・ノイズ・移動平均窓の4スライダー→系列プロット・移動平均線・トレンド線・分散(平滑化前後)・数式の成分ハイライトが同時連動、窓を広げるとノイズが均され分散が下がる。AcfStepper はラグ k を0→24と増やし «系列をk期ずらして重ねる» 様子（破線）と、各ρ(k)をコレログラムに積み上げるコマ送り。季節周期(12,24)で信頼限界±1.96/√nを超える正のピークが立つ。季節波のcos振動でACFピークが立つ導出・階差 Δx_t でトレンド(a+bt)が定数bに消える導出を収録。
- **検証結果**: Vitest **673 passed**（+17: time-series 11 / frames 6、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`next start` + Playwright 実機確認: 分散が平滑化で30.92→26.88、ノイズ3・窓21で39.75→26.07、ACFステッパーが lag12 で ρ(12)=0.787（有意・信頼限界±0.200超）とラグずらし重ね表示、コンソールエラー0件。
- **設計判断 / つまずき**: «並び順に情報がある→自己相関» を軸に、L0=分解＋移動平均、L1=ACF＋コレログラム、L2=定常性＋階差＋ホワイトノイズと段階配置。ACFのコレログラムをコマ送りで «積み上げる» ことで «ラグごとに1本ずつ計算» の手順を可視化。用語リンクで階差・予測をトピックslug化しないよう平文に留めた（[[lessons: 用語リンクは実在slugのみ]]）。M群の起点完了、次は M-2 時系列モデル（ARIMA・状態空間）へ。

### コンテンツ拡充 #59 — [M-2] 時系列モデル（ARIMA・状態空間）

優先度 33/82。前提=時系列解析の基礎。AR/MA/ARMA/ARIMA・自己相関の指紋・和分による定常化・状態空間モデル。

- [x] 計算層 `lib/stats/arima.ts`（simulateAR1/simulateMA1/simulateRandomWalk/theoreticalAcfAR1/ar1Variance/fitAR1(Yule-Walker)/forecastAR1）+ Vitest（11）
- [x] 状態層 `lib/store/time-series-models.ts`（controls {phi, sigma}・AR(1)パス・理論/標本ACF・予測・分散を派生）
- [x] 描画層 `components/topics/time-series-models/`（TSModelLab=φ・σ→AR(1)パス・理論φ^k と標本ACF・予測減衰・分散の強連動 / ModelGalleryStepper=白色雑音→AR(1)→MA(1)→ランダムウォークのACF指紋ギャラリー / TSModelQuiz）+ frames.ts + Vitest（7）
- [x] 用語ノード4件（autoregressive-model / moving-average-model / arima-model / state-space-model）相互リンク（既存 autocorrelation/stationarity/white-noise へ接続）
- [x] MDX `content/topics/time-series-models.mdx`（L0-L2 充実：AR(1)漸化式→ρ(k)=φ^k の等比漸化式導出→ARIMA/和分/状態空間＋階差で非定常が定常になる導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 時系列モデルトピック（2026-07-04）
- **変更概要**: «過去の値・過去のショックから次を作る漸化式» として時系列モデルを4層実装。TSModelLab は AR係数 φ・ショック σ スライダー→AR(1)標本パス＋予測(φ^h減衰)・理論ACF(φ^k の線)と標本ACF(棒)の重ね・理論分散 σ²/(1−φ²)（TermController）が同時連動、φ を1に近づけると自己相関の減衰が緩やかになり分散が発散。ModelGalleryStepper は ①ホワイトノイズ→②AR(1)→③MA(1)→④ランダムウォーク を «標本パス＋ACFの指紋» で対比コマ送り（AR=だらだら減衰/MA=早く切れる/walk=減衰しない・非定常）。AR(1)の自己共分散が γ(k)=φγ(k-1) の等比漸化式→ρ(k)=φ^k になる導出・階差でランダムウォークがホワイトノイズに戻る（I=和分）導出を収録。
- **検証結果**: Vitest **691 passed**（+18: arima 11 / frames 7、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`next start` + Playwright 実機確認: φ=0.7 で分散1.96、φ=0.95 で 10.26（1/(1−φ²)で発散）、モデルギャラリーが4モデル巡回（④ランダムウォーク=非定常表示）、コンソールエラー0件。
- **設計判断 / つまずき**: «自己相関の指紋でモデルを見分ける» を軸に、L0=AR(1)、L1=AR/MA対比ギャラリー、L2=ARIMA/和分/状態空間と段階配置。**MDXバグを1件修正** — 演習の答の平文に数式片「x_t−x_{t-1}=e_t」を裸で書いたら `{t-1}` がJSX式と解釈され prerender 失敗（tsc/testは通るのにbuildだけ落ちる）→`$...$`で囲んで解決。[[lessons: MDX素の波括弧はJSX式]]を新規追記。次は M-3 時系列予測と評価へ。

### コンテンツ拡充 #60 — [M-3] 時系列予測と評価

優先度 34/82（M群 完結）。前提=時系列モデル。指数平滑化／素朴・平均・ドリフトのベースライン／RMSE・MAE・MAPE／訓練・検証分割（バックテスト）。

- [x] 計算層 `lib/stats/forecasting.ts`（exponentialSmoothing/smoothingWeights/forecastNaive/forecastMean/forecastDrift/forecastES/mae/rmse/mape/trainTestSplit）+ Vitest（14）
- [x] 状態層 `lib/store/time-series-forecasting.ts`（controls {alpha}・平滑化と1期先予測RMSE・重み減衰を派生）
- [x] 描画層 `components/topics/time-series-forecasting/`（ForecastLab=α→観測・平滑化線・重み減衰バー・RMSEの強連動 / ForecastEvalStepper=訓練/検証分割→素朴・平均・ドリフト・ESをRMSE積み上げ比較のコマ送り / ForecastQuiz）+ frames.ts + Vitest（6）
- [x] 用語ノード4件（exponential-smoothing / forecast-evaluation / backtesting / forecast-baseline）相互リンク
- [x] MDX `content/topics/time-series-forecasting.mdx`（L0-L2 充実：指数平滑化の重み減衰→RMSEが二乗ゆえ大外れに敏感な導出→評価指標/バックテスト/データリーク＋シャッフルCVが時系列で楽観的になる導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 時系列予測と評価トピック（2026-07-04）
- **変更概要**: «過去から先を当て、当たり具合を数値で測る» を4層実装。ForecastLab は平滑化係数 α スライダー→観測系列・平滑化線(＝1期先予測)・過去への重み α(1−α)^j の幾何級数減衰バー・1期先RMSE（TermController）が同時連動、α を上げると直近に速く反応。ForecastEvalStepper は訓練/検証を時間順分割し、素朴・平均・ドリフト・指数平滑化を検証区間へ1手法ずつぶつけてRMSEを積み上げ比較（最小を緑ハイライト）。RMSEが二乗ゆえ大外れに敏感（MAE≤RMSE）な導出・シャッフルCVが自己相関でデータリークし楽観的になる導出を収録。
- **検証結果**: Vitest **711 passed**（+20: forecasting 14 / frames 6、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`next start` + Playwright 実機確認: α=0.30 で(1−α)=0.7・RMSE=2.135・重み12本、評価ステッパーが4手法比較（素朴1.92・平均4.53・ドリフト2.49・ES1.87、最小=ES緑表示）、コンソールエラー0件。
- **設計判断 / つまずき**: «まずベースライン→高度モデルが上回るかで価値を測る» と «時間順分割でリーク防止» を軸に配置。ForecastEvalStepper のRMSE比較バーで手法の優劣を一目化。前回学んだMDXの裸波括弧・<数字を回避（数式は全て$...$内、$\{1,\dots,c\}$も数式内）。**これでM群（時系列 M1-M3）完了**、次は N群 分割表・因果推論へ（N-5 分割表の解析）。

### コンテンツ拡充 #61 — [N-5] 分割表の解析

優先度 35/82（N群 起点）。前提=適合度検定。分割表／期待度数／カイ二乗独立性検定／自由度(r−1)(c−1)／Cramér's V・オッズ比／フィッシャー正確確率検定。

- [x] 計算層 `lib/stats/contingency.ts`（rowSums/colSums/expectedTable/chiSquareStatistic/degreesOfFreedom/independencePValue/standardizedResiduals/cramersV/oddsRatio2x2、χ² CDFは goodness-of-fit を再利用）+ Vitest（14）
- [x] 状態層 `lib/store/contingency-tables.ts`（controls {a,b,c,d}・観測/期待/残差・χ²・p・V・OR を派生）
- [x] 描画層 `components/topics/contingency-tables/`（ContingencyLab=4セル→観測/期待表・標準化残差ヒートマップ・χ²/p/V/ORの強連動 / IndependenceStepper=観測→周辺和→期待→セル寄与→判定の5段階コマ送り / ContingencyQuiz）+ frames.ts + Vitest（7）
- [x] 用語ノード4件（contingency-table / expected-frequency / cramers-v / fishers-exact-test）相互リンク（既存 chi-square-test / statistical-independence / odds-ratio へ接続）
- [x] MDX `content/topics/contingency-tables.mdx`（L0-L2 充実：期待度数とのズレ→独立なら E=行和·列和/N の導出→自由度/連関の強さ/小標本＋自由度が(r−1)(c−1)になる制約数え上げの導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 分割表の解析トピック（2026-07-04）
- **変更概要**: «2つのカテゴリ変数の関連» を期待度数とのズレで測る手法を4層実装。ContingencyLab は2×2の4セルスライダー→観測/期待を並べた表・標準化残差の青赤ヒートマップ・χ²/p値/Cramér's V/オッズ比（TermController）が同時連動、対角を増やすと連関が強まる。IndependenceStepper は 3×2 表で «観測→周辺和→期待度数→セル寄与(O−E)²/E→判定» の5段階を、寄与の大きいセルを濃く塗ってコマ送り。独立なら E=行和·列和/N になる導出（周辺確率の積）・自由度が rc−(r+c−1)=(r−1)(c−1) になる制約数え上げの導出を収録。有意性(p)と強さ(V)を分けて評価する作法を強調。
- **検証結果**: Vitest **732 passed**（+21: contingency 14 / frames 7、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`next start` + Playwright 実機確認: [[40,20],[20,40]]で χ²=13.33・p=0.0003・V=0.333・OR=4、独立表[[40,40],[20,20]]で χ²=0・p=1・V=0、ステッパー判定フレームで χ²=20.00・df=2・p≈0・独立棄却、コンソールエラー0件。
- **設計判断 / つまずき**: χ² CDF を既存 goodness-of-fit から再利用し重複を避けた。既存用語(chi-square-test/statistical-independence/odds-ratio)へ接続し新規4語のみ追加。**lint 2件を修正** — 未使用の CELLS 定数を削除、JSXテキスト内 "Cramér's V" のアポストロフィが react/no-unescaped-entities で落ちる→「クラメールの V」に変更。次は N-1 因果推論の枠組みへ。

### コンテンツ拡充 #62 — [N-1] 因果推論の枠組み

優先度 36/82。前提=重回帰分析。潜在的結果（ルービン因果モデル）／反事実／因果推論の根本問題／平均処置効果 ATE・ATT／交絡と «相関≠因果»／無作為化・層別調整（交換可能性・正値性・SUTVA）。

- [x] 計算層 `lib/stats/causal.ts`（generateUnits=潜在結果 Y(0)=base+交絡·x+雑音, Y(1)=Y(0)+τ, 割り当ては randomized:P=0.5 / 非無作為:0.5+selection·(x−0.5) / observedOutcome / ate=E[Y(1)−Y(0)] / naiveDifference / confoundingBias / stratifiedAte / covariateBalance）+ Vitest（8）
- [x] 状態層 `lib/store/causal-inference-models.ts`（controls {tau, confounderEffect, selection, randomized}・trueAte/naive/bias/adjusted/balance を派生、N=600・mulberry32 固定）
- [x] 描画層 `components/topics/causal-inference-models/`（CausalLab=真の効果/交絡/偏りスライダー＋無作為化トグル→素朴比較 vs 真のATE vs 層別調整の3バー（緑破線=真値）・共変量バランス・素朴比較=ATE+交絡バイアスの強連動数式 / PotentialOutcomesStepper=6個体固定例で神の視点→根本問題→交絡→素朴比較のバイアス→層別調整の5段階コマ送り、観測できない反事実を淡色化 / CausalQuiz）+ frames.ts + Vitest（6）
- [x] 用語ノード5件（potential-outcomes / counterfactual / average-treatment-effect / confounding / randomization）相互リンク（既存 statistical-independence へ接続）
- [x] MDX `content/topics/causal-inference-models.mdx`（L0-L2 充実：相関≠因果→潜在結果と根本問題→素朴比較=ATT+選択バイアスの分解導出→識別の仮定（交換可能性/正値性/SUTVA）＋層別で交絡が消える標準化(g-公式)の導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 因果推論の枠組みトピック（2026-07-04）
- **変更概要**: «相関≠因果» を潜在的結果で厳密化する枠組みを4層実装。CausalLab は真の効果τ・交絡の強さ・割り当ての偏りスライダー＋無作為化(RCT)トグル→«素朴比較(赤)/真のATE(緑)/層別調整(青)» の3バーに真値の緑破線を重ね、共変量バランス（処置群/対照群の交絡平均）と «素朴比較=真のATE+交絡バイアス» の分解数式（TermController）が同時連動。PotentialOutcomesStepper は6個体の固定例で «神の視点(両潜在結果)→根本問題(片方が反事実で淡色化)→交絡(重症ほど治療)→素朴比較のバイアス→層別調整» を1コマ送り。素朴比較=ATT+選択バイアスの分解導出・交換可能性下で層別(標準化/g-公式)が交絡を断つ導出を収録。
- **検証結果**: Vitest **746 passed**（+14: causal 8 / frames 6、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`npm run dev` + Playwright 実機確認: 既定(交絡6・偏り0.8・非無作為)で naive=6.72・ATE=2.00・bias=4.72（上振れ）、無作為化トグルON で naive=2.16・bias=0.16（交絡消失）と強連動、コンソールエラー0件。
- **設計判断 / つまずき**: Lab は連続シミュレーション（交絡＝結果を悪化させ治療も受けやすい→素朴比較が上振れ）、Stepper は手作り6個体（severe=低ベースライン→過小評価）で符号が逆になるため、Lab コールアウトを bias の符号で «上振れ/下振れ» を動的表示に変更（固定文言の矛盾を回避）。**MDX 2件を修正** — 正値性の $0<P(...)<1$ の `<P` がJSXタグ開始と誤解される→`< ` にスペース挿入、L2 Concept のリスト直後に `</Concept>` が続くと list item に取り込まれ閉じタグ不整合→リスト後に段落を1つ挟んで解消。次は N-2 識別戦略（DID・IV・RDD）へ。

### コンテンツ拡充 #63 — [N-2] 識別戦略（DID・IV・RDD）

優先度 37/82。前提=因果推論の枠組み。差の差分法（平行トレンド）／操作変数法（関連性・除外制約・Wald 推定）／回帰不連続デザイン（閾値の局所無作為化・局所線形フィット）。

- [x] 計算層 `lib/stats/identification.ts`（DID: generateDidCells/didEstimate/didCounterfactual、IV: generateIvUnits/ivWaldEstimate/ivNaiveEstimate、RDD: generateRddPoints/rddEstimate（局所線形は olsFit 再利用））+ Vitest（8）
- [x] 状態層 `lib/store/causal-identification.ts`（DID controls {trueEffect, commonTrend, parallelViolation}・cells/did/counterfactual/bias を派生）
- [x] 描画層 `components/topics/causal-identification/`（DidLab=2期×2群の折れ線・反事実の破線・DIDギャップ・強連動数式 / RddStepper=散布→左フィット→右フィット→ジャンプの4段階コマ送りSVG / IdentificationQuiz=3手法横断4問）+ frames.ts（RDD）+ Vitest（4）
- [x] 用語ノード5件（difference-in-differences / parallel-trends / instrumental-variable / exclusion-restriction / regression-discontinuity）相互リンク（既存 confounding / randomization / average-treatment-effect へ接続）
- [x] MDX `content/topics/causal-identification.mdx`（L0-L2 充実：準実験の必要性→DID構成/RDDジャンプ→3戦略の識別条件と射程＋DIDで固定交絡が消える固定効果の導出/IV Wald が未観測交絡を迂回する導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: 識別戦略（DID・IV・RDD）トピック（2026-07-04）
- **変更概要**: 無作為化できない観察データで因果効果を «識別» する3準実験デザインを4層実装。DidLab は真の効果・共通トレンド・平行トレンドの破れスライダー→処置群(赤)/対照群(青)/反事実(灰破線)の2期折れ線・DIDギャップの縦線・«DID=(処置群の変化)−(対照群の変化)» 分解数式が同時連動、破れを入れるとそのままバイアスに。RddStepper は固定60点で «散布→閾値の左を線形フィット→右を線形フィット→閾値のジャンプ» をSVGコマ送り、閾値ぎりぎりの局所効果を可視化。IV は計算層(Wald 推定)＋MDX導出で扱い、3手法横断のクイズ。DIDで固定交絡が消える固定効果分解・IV Wald が未観測交絡を迂回する導出を収録。
- **検証結果**: Vitest **758 passed**（+12: identification 8 / RDD frames 4、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`npm run dev` + Playwright 実機確認: 既定で DID=3（真値一致, ta=27/tb=20/ca=14/cb=10）、破れ+2 で DID=5・ta=29（バイアス2が乗る）と強連動、RDDステッパー最終フレームで «ジャンプ 3.93»（真値+4を復元）・左右フィット＋ジャンプ線描画、コンソールエラー0件。
- **設計判断 / つまずき**: 3手法のうち視覚的な DID・RDD を Lab/Stepper に、IV は計算層＋MDX 導出に配分（前トピック同様 1 Lab + 1 Stepper のカデンツを維持しつつ3手法を網羅）。RDD の局所線形フィットは既存 regression.ts の olsFit を cutoff シフトして再利用し重複回避。MDX は数式を全て $...$ 内に閉じ（$Z\perp U$ 等）、L2 Concept のリスト後に段落を挟んで閉じタグ不整合を回避（前回教訓を適用）。**N群 因果推論の中核（N-1/N-2）完了**、次は N-3 A/Bテスト実務へ。

### コンテンツ拡充 #64 — [N-3] A/Bテスト実務

優先度 38/82。前提=仮説検定の基礎・因果推論の枠組み。2標本比率の検定／検出力分析（α・1−β・MDE・n の綱引き）／必要標本サイズ n∝1/δ²／覗き見問題（peeking）／SRM・新奇性効果・実用的有意。

- [x] 計算層 `lib/stats/ab-test.ts`（twoProportionTest=プールz検定/両側p、diffConfidenceInterval、requiredSampleSize、power、peekingFalsePositiveRate=A/Aシミュ）+ Vitest（7）（normal.ts の standardNormalCdf/zQuantile 再利用）
- [x] 状態層 `lib/store/ab-testing.ts`（controls {baseline, mde, alpha, targetPower, n}・p1/relativeLift/requiredN/achievedPower/sufficient/z を派生）
- [x] 描画層 `components/topics/ab-testing/`（AbTestLab=必要n vs 実際nバー・検出力ゲージ（目標破線）・n∝1/δ²数式の強連動 / PeekingStepper=A/A実験でチェック1→2→5→10→20回と過誤バーが名目5%を超えて伸びるコマ送り / AbTestQuiz=MDE/覗き見/検出力/SRM 4問）+ frames.ts（peeking）+ Vitest（5）
- [x] 用語ノード4件（minimum-detectable-effect / sample-size-determination / peeking-problem / sample-ratio-mismatch）相互リンク（既存 power / type-i-error / multiple-comparison / significance-level / randomization へ接続）
- [x] MDX `content/topics/ab-testing.mdx`（L0-L2 充実：2案比較→比率のz検定/検出力/覗き見→検出力分析4量と落とし穴＋n∝1/δ²の導出/覗き見が和集合で過誤を膨らませる導出、L3-L6 planned）
- [x] `/topics` 一覧へ反映（status: published）

#### レビュー: A/Bテスト実務トピック（2026-07-04）
- **変更概要**: オンライン実験の «設計と運用で過誤を制御する» 実務を4層実装。AbTestLab は baseline・MDE・α・目標検出力・実際n スライダー→必要標本サイズ(1群)と実際nの充足バー・検出力ゲージ（目標破線）・«n=(z_{α/2}√2p̄q̄+z_β√…)²/δ²» 数式が同時連動、MDEを小さくすると必要nが急増、nが足りないと検出力が落ちる。PeekingStepper は真に差がないA/A実験でチェック回数1→2→5→10→20回と増やすと «一度でも有意» の実効過誤が名目5%線を超えて伸びる様子をコマ送り。n∝1/δ²の導出・覗き見が事象の和集合で過誤を膨らませる導出を収録。
- **検証結果**: Vitest **770 passed**（+12: ab-test 7 / peeking frames 5、registry リンク切れゼロ）。tsc / lint（警告0）/ build成功。`npm run dev` + Playwright 実機確認: 既定(p0=10%,MDE=2%,α=.05,power=.8)で必要n=3,841・n=3000での検出力69.7%（未達）、n=6000で検出力93.8%と強連動、覗き見ステッパーで1回=5.2%→20回=25.0%と過誤膨張、コンソールエラー0件。
- **設計判断 / つまずき**: 既存 normal.ts（standardNormalCdf/zQuantile）・既存用語（power/type-i-error/multiple-comparison）を再利用し重複回避。必要n/検出力の整合性（必要nで計算した検出力≈目標）をテストで担保。覗き見シミュは決定的シード(mulberry32)で単調性をテスト。MDX は数式（\bigcup・|z|>z_{α/2}等）を全て $...$/$$...$$ 内に閉じ、L2 Concept のリスト後に段落を挟んで閉じタグ不整合を回避（既存教訓を適用）。次は N-4 グラフィカルモデリングへ。
