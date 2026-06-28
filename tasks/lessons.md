# Lessons（実装で得た教訓）

同じミスを繰り返さないための自分用ルール集。プロジェクト開始時に復習する。

## 統計の数値（テスト期待値の取り違え注意）

- **一標本 z 検定で検出力 0.8 を得る n は ≈32**（δ=z_{1−α/2}+z_{0.8}≈1.96+0.84=2.80、δ=d√n より d=0.5 で n≈31.4）。
  教科書でよく見る **n≈64 は二標本（各群）の値**。一標本と混同してテスト期待値を誤らない。
  - 出典: Issue #22 仮説検定トピック実装時の self-correction。

## SVG の点ドラッグ（回帰ラボ等のインタラクション）

- ドラッグは pointer events で実装する: 各要素の `onPointerDown` で `dragRef.current=index` と
  `setPointerCapture` を行い、`<svg>` 側の `onPointerMove`/`onPointerUp`/`onPointerLeave` で更新・終了。
  クライアント座標→データ座標の逆変換は `svg.getBoundingClientRect()` で viewBox スケールを補正する。
  SVG には `touch-none select-none` を付け、スマホのスクロール/選択と競合させない。
- React の `<input type=range>` を**プログラムから off-step な値**にセットすると、つまみ表示は最寄り
  step にスナップする（store 値・計算結果は正確）。表示ラベルは store 値を出せばズレない。実害は出にくいが
  「合わせる」系ボタンの見た目を気にするなら step に丸めて渡す。
- Playwright で React の状態更新を読むときは、クリック/イベント発火と**同じ evaluate 内で同期的に読むと
  再レンダー前の古い値**が返る。別の tool 呼び出しに分けて読む。

## 数式の強連動（TermController）

- 同一ページに同じ数式コンポーネント（同じ `term-*` id）を複数配置しても問題ない。
  `TermController.getTermElement` は `this.root.querySelector`（描画コンテナ限定）で id を解決するため、
  `document.getElementById` のような全体衝突は起きない。Level をまたいで同じラボを再掲してよい。

## 用語(terms)の seeAlso・本文リンクは «用語slug» のみ。トピックslugを混ぜると registry test が落ちる

- `content/terms/*.mdx` の seeAlso と本文 `[..](slug)` リンクは **他の用語(term)** を指す前提で registry test が検証する。
  `hypothesis-testing`・`sampling-distributions` のような **トピック(topic)slug** を書くと «リンク切れ» 判定で fail。
  - 対策: 検定の話なら `significance-level`/`null-hypothesis`/`p-value`、分布なら `f-distribution` 等の **用語slug** を使う。
    迷ったら `ls content/terms/` で実在を確認してから書く。トピックへの導線は «トピックMDX» 側の `/topics/...` で張る。
  - 出典: #47 分散分析。multiple-comparison/experimental-design が `hypothesis-testing`(topic) を指して registry fail→`significance-level` に修正。

## F 分布・t 分布の CDF は数値積分よりも正則化不完全ベータ関数が堅牢

- F 分布の上側確率を fPdf のシンプソン積分 [0,x] で出すと、**x が大きい**（F が大きい well-separated ANOVA 等）と
  密度のピーク（小さい x 付近）を粗い刻みで取りこぼし、CDF が大きく誤る（F=1000 で p≈0.32 など）。
  - 対策: **F CDF = I_z(d1/2, d2/2)（z=d1·x/(d1·x+d2)）** の閉形式を使う。`regularizedIncompleteBeta`（Lentz 連分数）を
    `lib/stats/anova.ts` に実装済み。t 分布・ベータ分布の CDF にも流用可（再利用候補）。
  - 出典: #47 分散分析 fUpperTail の self-correction。

## MDX 本文で「`<` の直後に数字」を書くと JSX タグ開始と誤認されてビルドが落ちる

- MDX は `<` を JSX 要素の開始と解釈する。`<1`・`<10` のように **不等号のつもりの `<` の直後が文字（数字含む）** だと
  「Unexpected character `1` before name」でビルド失敗（テストは通るのに `pnpm build` だけ落ちる）。
  - 対策: 本文の不等号は «1 より大きい/小さい» と言葉にするか、`$...$` の数式内（`$x<1$`）に入れる。KaTeX 内なら安全。
  - `>` 単独は通ることが多いが `<` は要注意。出典: #45 質的回帰 odds-ratio.mdx の「<1 で起こりにくい」で build 失敗→言葉に修正。

## カイ二乗分布のCDFを数値積分するとき df=1 の特異点に注意

- カイ二乗分布 χ²_df は `df<2`（形状 k=df/2<1）で密度が x=0 で **発散** する（積分は収束する=可積分だが、
  端点 x=0 の点値が Infinity）。シンプソン則など端点を評価する数値積分は df=1 で Infinity を拾い結果が壊れる。
  - 対策: **df=1 は閉形式** `P(χ²≤x)=2Φ(√x)−1`（χ²₁=Z² より）を使う。df≥2 は端点が有限なので通常の数値積分でよい。
  - 同様に t 分布の CDF は対称性 F(−t)=1−F(t) で t≥0 側だけ積分すれば安定（特異点なし）。
  - 出典: #41 適合度検定 実装時、chiSquareCdf(3.841,1) が 1 を返した self-correction。

## 勾配上昇/降下の学習率は安定領域に取る

- 対数尤度の勾配上昇法をコマ送りで見せるとき、学習率 η が大きすぎると頂上を «行き過ぎて» 振動・発散し、
  単調増加にならない。指数分布の例（更新 λ←λ+η·λ²·score）では安定領域が **η<2/n**（n=標本数）。
  これを超えると最終 λ が MLE から大きく外れる。可視化・テストとも η を安定域（例 n=8 で η=0.2）に取る。
  テストは «厳密な単調増加» でなく «出発点より上がり、最終的に頂上付近» で検証する方が頑健。
  - 出典: #36 推定法 実装時、η=0.5（>2/8=0.25）でテストが落ちた self-correction。

## 可視化の教育的正しさ

- **検出力ラボの効果量は符号付きにする**。効果量を非負だけにすると「左片側検定」を選んだとき
  H1 が右に出て棄却域は左に来て検出力≈0 になり、学習者には「バグ」に見える。
  効果量の符号＝効果の向き（右片側=正・左片側=負）とすれば全対立仮説で意味のある検出力が示せる。
  - 出典: Issue #22 PR #25 レビューでのマージ前修正。

## 既存トピックの型を踏襲する（4層疎結合）

- 新トピックは「計算層 lib/stats/*.ts（純関数＋Vitest）→ 状態層 lib/store/*.ts（createTopicStore）→
  描画層 components/topics/*/（操作・グラフ・数式）→ MDX」の順で、最も近い既存トピックを精読してから着手する。
  正規分布(#20)・信頼区間(#24)・仮説検定(#22) は同型。frames.ts はコマ送りフレームの純関数ビルダー。
- 用語ノードの seeAlso と本文 markdown リンクは `lib/content/registry.test.ts` で解決検証されるので、
  新規 `<Term id>` 参照・新規用語の seeAlso は必ず実在 slug にする（リンク切れゼロが CI 相当の保証）。
  - **将来トピックの用語へ先回りリンクしない**: 例えば C-2 ベータ分布で `seeAlso: bayesian-basics`（#59 ベイズで作る予定）を
    入れると registry.test.ts が落ちる。前方参照は «本文中の通常テキスト» に留め、seeAlso/Term/markdown リンクは
    «今あるトピックで作る用語» だけにする。トピック間リンク（`/topics/xxx`）はルートなので未作成でもテストは通るが、
    実在を確認してから貼る。出典: #32 連続分布 実装時の registry テスト落ち。
