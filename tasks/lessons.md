# Lessons（実装で得た教訓）

同じミスを繰り返さないための自分用ルール集。プロジェクト開始時に復習する。

## 「最適パラメータ」をテストで固定値に決め打ちしない（統計的に反例がある）

- シルバーマンの帯域幅は «正規分布前提» の目安。**二峰性データでは過平滑**になり、ISE 最小の h はシルバーマンより小さい。
  frames の regime を「silverman を good」と決め打ちしたら実データで ISE(0.2·silverman) < ISE(silverman) となりテスト失敗。
  - 対策: «最適» は固定式でなく **実際に評価した指標の argmin** で決める（ISE を全候補で計算し最小を good に）。
    教育的にも «シルバーマンは万能でない» と示せて正しい。同様に «エルボー»«最適 k»«最適次元» も指標の実測で判定する。
  - 出典: #54 カーネル密度推定 frames.test の self-correction。

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

## JSX テキストに «素のアポストロフィ `'`» を書くと lint（react/no-unescaped-entities）が落ちる

- コンポーネントの JSX テキスト内（属性値やテンプレートリテラルでなく «地の文»）に `'` を書くと
  `react/no-unescaped-entities` エラーで lint が落ちる。とくに「Cramér's V」「Student's t」など英語所有格を
  ボタン/リンクの表示テキストに直書きしたとき。
  - 対策: 表示テキストは «クラメールの V» のように和名にするか、`{"Cramér's V"}` と文字列式で囲む、または `&apos;` に置換する。
    JSX 属性値（`label="..."`）やテンプレートリテラル（`` label={`...'...`} ``）の中なら素の `'` でも安全。
    出典: #61 分割表 ContingencyQuiz のリンク文言「Cramér's V の変化」で lint 失敗→和名に修正。

## MDX 本文で「素の波括弧 `{...}`」を書くと JSX 式と解釈されビルドが落ちる

- MDX は `{ }` を JSX 式の埋め込みと解釈する。数式のつもりで `$...$` の外に `x_{t-1}` や `{t+h}` と書くと、
  `{t-1}` が式 `t-1` として評価され「ReferenceError: t is not defined」で **prerender 失敗**（tsc/test/compile は通り `next build` の
  静的生成だけ落ちる）。とくに演習の «答» の平文中に数式片を裸で書いたときに起きやすい。
  - 対策: 数式片は必ず `$...$`（インライン）か `$$...$$`（ディスプレイ）の中に入れる。地の文で下付きを書きたいだけなら
    `x_(t-1)` のように波括弧を使わない表記にする。出典: #59 時系列モデル L2 演習の「x_t−x_{t-1}=e_t」を裸で書き build 失敗→`$...$` で囲んで修正。

## MDX の `<Level>`/`<Concept>` を「箇条書き（リスト）の直後」にインデント付きで閉じるとビルドが落ちる

- MDX（remark）は、リスト項目の直後に来る **2スペース字下げした閉じタグ** `  </Concept>` を «リスト項目の継続（lazy continuation）» と解釈してしまい、
  「Expected the closing tag `</Concept>` …」で **next build のみ失敗**（tsc/lint/test は通る）。Concept/Interact 本文の最後の要素が箇条書きのときに起きる。
  - 対策: 箇条書きの後に **締めの1文（段落）を1つ挟んでから閉じタグを書く**（`リスト → 空行 → 段落 → 空行 → 閉じタグ` の構造に統一する）。
    段落と閉じタグの間は必ず空行。出典: #70 微分積分 L1 Concept をリスト項目直後に `  </Concept>` で閉じて build 失敗→締めの1文を追加して修正。
    既存の効いている Level では末尾が «下のステッパーは…» 等の段落になっている——この形に合わせるのが安全。

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

## トピック実装フロー：コミット前に必ず作業ブランチを切る（出典 #64）
- **症状**: 前トピックのマージ後 `git checkout main` した状態のまま、新トピックの作業を進めて `git commit` してしまい、
  main に直接コミットが乗った（push は `git push -u origin feat/...` で refspec 不一致エラーになって発覚）。
- **原因**: 各トピックの起点で `git checkout -b feat/NN-slug` を打つ手順を、実装に集中して飛ばした。
- **対策**:
  1. 各トピック着手時、**最初のファイル作成より前に** `git checkout -b feat/NN-slug` を実行する（計算層を書き始める前）。
  2. 万一 main に commit してしまったら、`git branch feat/NN-slug`（現在のコミットを退避）→ `git reset --hard origin/main`
     （main を巻き戻す）→ `git checkout feat/NN-slug` で復旧できる。履歴は失われない。
  3. コミット直前に `git branch --show-current` が main でないことを確認する癖をつける。

## SVG座標は丸める：Box-Muller等のtranscendentalがSSR/CSRで1ULP違いハイドレーション不一致（出典 #67）
- **症状**: 固定シードのはずの散布図Labで «hydration mismatch» コンソールエラー。差分は cx="103.04620519673969"（server）vs cx={103.04620519673966}（client）——最終桁だけ違う。
- **原因**: mulberry32（整数演算）はビット一致するが、gauss() の Math.log/Math.cos/Math.sqrt（超越関数）は Node と ブラウザの V8 で最終ビット（1ULP）が異なりうる。未丸めの float を SVG 属性（cx/cy）に直接入れると server/client で文字列表現がズレて React が不一致検出。
- **対策**: SVG に渡す座標は必ず丸める（例 `Math.round(v*100)/100`）。テキスト表示は formatNumber(…,桁) で既に丸まっているので安全。**シード付きデータをSVG散布図でSSRする描画層は、座標スケール関数 sx/sy の出力を丸めておく**（HTMLサイズ削減にもなる）。多数点（数百〜千）を描くLabで顕在化しやすい。

## 実測float誤差をSSRで描くと座標丸めでは不足：クライアント限定描画にする（出典 #72）
- **症状**: 数値微分の «誤差カーブ» polyline で hydration mismatch。SVG座標は既に round2 済みなのに不一致が残った（#67の «座標を丸める» 対策では消えない）。
- **原因**: #67 は座標の最終1ULPズレだったが、今回は **プロットする値そのもの**が Math.sin/Math.log10 の実測誤差で、丸め誤差優勢な小さい h の領域では Node と ブラウザの V8 で超越関数の結果が桁レベル（有効数字2〜3桁目）で食い違う。誤差の «ノイズ» を可視化する図では、値が本質的にエンジン依存なので座標を2桁丸めても吸収しきれない。
- **対策**: «実測の浮動小数点ノイズ» を描く要素は SSR せず、`const [mounted,setMounted]=useState(false); useEffect(()=>setMounted(true),[])` で **クライアントマウント後のみ描画**（`{mounted ? <polyline…/> : null}`）。サーバHTMLに当該要素を出さなければ React は不一致検出しない。判断基準: 描く値が決定論的な数式評価なら round2 で十分（#67）、Math.sin/log/randや «誤差そのもの» を測る値なら mounted ゲート。

## MDX太字が閉じ`**`の右フランキング規則で消える：`)**は` はstrongにならずリテラル表示（出典 #73）
- **症状**: MDX本文の `**[2 進数](binary-number)**は 0 と 1…` で太字にならず、`**` がそのまま2つ画面表示される。tsc/lint/next build は全て通り、Playwright の目視（DOMに `<strong>` が無く innerText に `**` が残る）でのみ発覚。同じ書き方でも `**…**：`（全角コロン前）や `**…**。`（句点前）は正しく太字になるので気づきにくい。
- **原因**: CommonMark の emphasis 規則。閉じ `**` は「right-flanking delimiter run」でないと閉じられない。`)**は` は閉じ `**` が **句読点 `)` の直後 かつ 直後が文字（仮名 `は`）** という配置で、right-flanking の条件（直前が非空白 かつ（直前が非句読点 または 直後が句読点/空白））を満たさず、開き `**` ともども装飾されずリテラルになる。`**…（…）**:` が効くのは閉じ `**` の直後が `:`（句読点）だから。
- **対策**: リンクや括弧で終わる語をそのまま太字にして直後に仮名を続けない。閉じ `**` の直後が **句読点（。、：）または空白** になるよう太字範囲を調整する（例: `**[2 進数](binary-number)は 0 と 1 だけで数を表す**。` と句点前で閉じる）。判断の目安: `)**` や `】**` の直後が仮名・英字なら要注意。**MDXの装飾崩れは build を通り抜けるので、トピック実装時は Playwright で `<strong>` の有無と innerText に `**` が残っていないかを必ず確認する**。

## 擬似乱数データは «整数演算だけの決定的LCG» で生成し hydration mismatch を根本回避（出典 #74）
- **背景**: 機械学習の枠組みトピックで «ノイズ入り訓練データ» を Lab/ステッパー双方で使う必要があった。#67 の round2（座標丸め）や #71 の mounted ゲート（クライアント限定描画）は «描画» 側の対策だが、そもそも SSR とブラウザで **生成するデータ自体が一致** すれば mounted ゲートで対話性を犠牲にせずに済む。
- **対策**: モジュール定数として持つ擬似乱数データは、`Math.random`/`Math.sin` 由来の非決定を避け、**整数演算だけの線形合同法（LCG, `Math.imul` と `>>> 0`）** で生成する。ガウスノイズが要るときは超越関数を使う Box–Muller ではなく «一様乱数3個の和−1.5»（Irwin–Hall 近似）で作れば全て整数/四則演算に閉じ、Node(SSR) と V8ブラウザで **ビット一致**。ブートストラップ再標本も整数添字（`floor(rng()*n)`）なので同じく決定的。結果、round2 は保険として残しつつ mounted ゲート不要でハイドレーション不一致ゼロ。
- **判断の目安**: 描く «値» が Math.sin/log の実測誤差そのものなら mounted ゲート（#71）。単に «再現可能な乱数データが欲しい» だけなら LCG で生成側を決定化するのが上策（対話性を保てる）。`Math.sin` を «真の関数» の値として使う場合でも、それが線形ソルバ等の四則演算を経て最終的に round2 される座標に落ちるだけなら差は吸収される（#67 の判断基準どおり）。

## Lasso座標降下法の軟閾値は «λ» ではなく «λ/2»：Ridgeと同じλ表記で罰則を揃えるなら二乗誤差項の係数2を打ち消す必要がある（出典 #75）
- **症状**: 実装中（テスト前のレビュー段階）に気づいた——`min ‖y−Xβ‖²+λΣ|β_j|` を座標降下法で解くコードで `softThreshold(rho, lambda)` としていたが、これは実は `‖y−Xβ‖²+2λΣ|β|` を解いていることになり、Lab上部に表示する共通の数式 `min‖y−Xβ‖²+λP(β)`（RidgeとLassoで同じλ記号）と実装が食い違っていた。
- **原因**: 二乗誤差項 `Σ(r−xβ)²` を β で微分すると係数2が出るが、L1罰則 `λ|β|` の劣微分にはその2が出ない。停留条件は `2z·β−2ρ+λ·sign(β)=0` となり、解は `β=S(ρ,λ/2)/z`。Ridge（`λΣβ²`）は罰則側にも微分で係数2が出るので `(XᵀX+λI)β=Xᵀy` の形で係数2が両辺相殺し「λがそのまま効く」——この非対称性（二乗罰則と絶対値罰則で微分の次数が違う）を見落として「同じλ記号だから同じ閾値でよい」と誤って実装した。
- **対策**: 罰則の種類が混在するコード（Ridge/Lasso切り替えLabなど）では、**それぞれの最適性条件を係数まで含めて手計算し直す**。「同じ記号のλを使う」ことと「同じ強さの罰則になる」ことは別——二乗項（微分で係数2）と絶対値項（微分で係数1、劣微分）が混在する式は特に要注意。単体テストは「λを上げると係数が縮む/0になる」という定性的な向きしか検証できず、この手の «定数倍だけズレたバグ» は見逃しやすい。数式をLab/MDXに直接表示するトピックでは、**表示する数式と実装が本当に同じ最適化問題を解いているかを導出レベルで突き合わせる**（CLAUDE.md「数式を誤魔化さない」の実装版）。

## 高次多項式どうしを正則化パスのステッパーに使うと、多重共線性で係数が0↔非0を往復し物語が濁る（出典 #75）
- **症状**: Lassoの正則化パス（λを増やして係数がちょうど0になる様子を見せるステッパー）を、Labと同じ次数9多項式の設定（x¹…x⁹）で作ったところ、16フレーム中4回「一度0になった係数が別の係数との組み替わりで0から動き出す（revive）」が発生し、「λを増やすと係数が減っていく」という単純接なストーリーが崩れた。
- **原因**: 高次多項式の項（x¹, x², …, x⁹）は x∈[0,1] 上で互いに強く相関する（多重共線性）。Lassoは相関の強い変数群の中で «どれか1つ» を残す傾向があり、λが変わると «どれが残るか» の組み合わせが入れ替わることがある——数学的には正しい挙動だが、初学者向けのコマ送りでは «ノイズ» に見える。
- **対策**: パスをクリーンに見せたいステッパーでは、Labとは別に **無相関に近い合成データ**（例: 8個の独立変数のうち3個だけ真の係数が非0）を自前のLCGで作る。多重共線性由来の «入れ替わり» はLab側（多項式）でこそ本題（リッジがそれを安定化する）なので、ステッパー側は変数選択という別の本質だけを見せる——**同じ計算層でも、見せたい概念に応じてステッパー専用の合成データを設計してよい**（frames.ts が自分のデータを持つことは学習の枠組みトピック#74のBiasVarianceStepperと同じパターン、データの «性質»（無相関か強相関か）まで意図的に選ぶのが今回の学び）。

## 1トピックに複数の StepPlayer（コマ送り）を置くときは `createTopicStore` を stepper ごとに分ける（出典 #76）
- **背景**: 決定木・アンサンブルトピックは Level1「分岐探索」と Level3「AdaBoost」の2つのコマ送りステッパーを同じページに同時マウントする必要があった。既存トピック（learning-framework, regularization-sparse）はいずれも1トピックにつきステッパーが1つだけで、メインの Lab 用ストア（`controls`/`derived`）が持つ `frame` スロットをそのままステッパーにも共用していた。
- **症状（設計時に気づいた潜在バグ）**: 2つのステッパーが同じストアの `frame`（`index`/`count`/`playing`）を共有すると、両方の `useEffect(() => setFrameCount(frames.length), …)` が同じ `count` を奪い合い、片方の StepPlayer を操作すると **もう片方の再生位置も動いてしまう**（同一の `index` を参照するため）。
- **対策**: メインの Lab 用ストアとは別に、ステッパーごとに `createTopicStore<Record<string, never>, Record<string, never>>({ initialControls: {}, derive: () => ({}) })` で «空 controls・空 derived・独自の `frame` だけを持つストア» を追加で生成する。フレーム «中身»（候補・ラウンドの中身）はステッパーの `frames.ts`/`boosting-frames.ts` が `useMemo` で作る純関数のままで、ストアは `frame`（位置と再生状態）の single source of truth を steppers の数だけ分離するだけでよい。Playwright で「2つの `StepPlayer` の `1コマ後へ` ボタンをそれぞれ押しても、もう一方のカウンタが動かない」ことを確認して設計の妥当性を検証した。
- **判断の目安**: 1トピックにステッパーが1つだけなら、既存パターン通りメインストアの `frame` を共用してよい（ステッパー用に別ストアを作るのはオーバーエンジニアリング）。**2つ目のステッパーを追加する時点で、必ずステッパー専用の空ストアに切り替える**。

## nested worktree では `.eslintrc.json` に `root: true` が無いと `pnpm lint` が親チェックアウトの設定まで誤って合流させる（出典 #77）
- **症状**: `.claude/worktrees/<agent-id>/` のように**リポジトリ本体のディレクトリツリーの内側**に worktree が作られていると、`pnpm lint`（内部で `next lint` を実行）が
  `Plugin "@next/next" was conflicted between ".eslintrc.json » …" と "../../../.eslintrc.json » …"` で失敗する。`next build` 内でも同じ警告が出るが、こちらはビルド自体は最後まで成功する（静的生成は止まらない）。
- **原因**: ルートの `.eslintrc.json` に **`"root": true` が設定されていなかった**ため、ESLint の legacy config は既定の挙動どおり**親ディレクトリを遡って追加の `.eslintrc.*` を探しにいく**。worktree がリポジトリ本体の内側（`.claude/worktrees/...`）にあると、3階層上でリポジトリ本体（別の worktree）の `.eslintrc.json`/`node_modules` を見つけてしまい、同じ `@next/eslint-plugin-next` を2つの設定チェーン経由で解決してしまい「conflicted」エラーになる。worktree がリポジトリ本体の外（兄弟ディレクトリ）にあれば起きない。
- **対策（根本修正）**: リポジトリ直下の `.eslintrc.json` に `"root": true` を追加する——ESLint に「このディレクトリで config 探索を打ち切る」と明示し、親ディレクトリへの誤ったカスケードを止める。ほぼ全てのプロジェクトで本来設定すべき項目で、通常の（nestedでない）チェックアウトでは挙動を一切変えない安全な1行修正。修正後は `pnpm lint` が通常どおりグリーンになることを確認した。
- **判断の目安**: `pnpm lint` が「Plugin conflicted」で落ちたら、まず `.eslintrc.json`（または `eslint.config.*`）に `root: true` 相当の設定があるか確認する。無ければ追加して直す（根本原因の修正であり、worktree 配置を諦めて代替コマンドで済ませる必要はない）。すでに `root: true` があるのに起きる場合や、そもそも `.eslintrc.json` を編集する権限がない場合に限り、同じ設定を使う `npx eslint .`（Next の `next lint` ラッパーを介さない素の ESLint CLI、ワークスペースルート探索をしない）で代替確認してよい。

## worktree 環境では、指示された `feat/NN-slug` ブランチ名が別 worktree で使用中のことがある（出典 #77）
- **症状**: `git checkout -b feat/77-naive-bayes-knn` が `fatal: a branch named 'feat/77-naive-bayes-knn' already exists` で失敗。`git worktree list` で確認すると、リポジトリ本体の worktree（別セッション用）がそのブランチ名を**コミットなしでチェックアウトしただけ**の状態で掴んでいた。
- **原因**: 複数の agent セッションが同じリポジトリに対して並行して起動されており、それぞれ独立した worktree を持つ。ブランチ名は `.git` 全体で共有されるため、片方が名前を予約すると同じ名前を他方の worktree でチェックアウトできない（git の制約）。
- **対策**: 自分の worktree の外（`cd` して他の worktree のパスを操作すること）は権限で拒否される（Write/Edit ツールも "isolated in the worktree" エラーになる）ため、**衝突したブランチ名を奪い返そうとせず、末尾に連番などを付けた別名（例: `feat/77-naive-bayes-knn-2`）で作業を続行する**。PR 本文に `Closes #77` を含めれば issue のクローズには支障ない。
- **判断の目安**: `git checkout -b` がブランチ名衝突で失敗したら、まず `git worktree list` で衝突相手が「自分の worktree ではない」ことを確認し、他 worktree のブランチ解放を試みずに別名へフォールバックする（他worktreeへの書き込み・checkout変更は権限的にできない前提で動く）。

## MDX太字は「閉じ`**`の直後が仮名」だけでなく「開き`**`が仮名の直後かつリンク`[`の直前」でも崩れる：CommonMarkの左右フランキング規則を機械的にスキャンする（出典 #78）
- **症状**: #73で見つけた「閉じ`**`の直後が仮名だと崩れる」パターンとは別に、「を表す**[行動価値関数](value-function)**」のように **開き`**`が地の文の仮名（す）に直接続き、かつ直後が`[`（リンクの開始）** という配置で、太字全体（開き・閉じとも）がリテラル表示になる例を発見した。tsc/lint/test/`next build`は全て通過し、Playwrightで`<strong>`タグの有無とinnerTextの`**`残存を目視確認して初めて気づいた——用語ファイル（`content/terms/*.mdx`）でも同じ崩れ方をする（トピックMDXだけでなく用語ページのMarkdownレンダラでも同じCommonMark規則が働く）。
- **原因**: CommonMarkのemphasis規則は開き側にも「left-flanking」の条件がある——「直後が非空白」かつ「直後が非句読点、または（直前が空白/句読点）」。`す**[行動価値関数]`は直後が`[`（句読点扱い）で、直前が「す」（非空白・非句読点）のため両条件とも満たさず、開き delimiter として機能しない。結果として対応する閉じ`**`も（開きが無いので）ペアにならずリテラル表示になる。#73の教訓は閉じ側だけを見ていたため、この開き側の破れを見逃していた。
- **対策**: 太字にする語句の**開始直前・終了直後の両方**を確認し、地の文の仮名・漢字に直接接する場合は半角スペースを1つ挟む（`を表す **[行動価値関数](value-function)** $Q(s,a)$` のように）。目視だけでは見落としやすいため、以下のようなCommonMarkの左右フランキング規則をそのまま実装した使い捨てNode.jsスクリプトで全対象ファイルを機械的にスキャンすると漏れなく検出できる（このセッションでは9+21箇所を発見・修正した）。
  ```js
  const isSpace = c => c === undefined || /\s/.test(c);
  const isPunct = c => c !== undefined && /[!-\/:-@\[-`{-~、。「」『』・（）—―〜«»'']/.test(c);
  const leftFlanking = (prev, next) => !isSpace(next) && (!isPunct(next) || isSpace(prev) || isPunct(prev));
  const rightFlanking = (prev, next) => !isSpace(prev) && (!isPunct(prev) || isSpace(next) || isPunct(next));
  // "**" の出現位置を2つずつ(開き,閉じ)とみなし、開きは leftFlanking、閉じは rightFlanking を満たすか判定
  ```
- **判断の目安**: MDX/Markdownの太字を含む新規コンテンツは、Playwrightで`<strong>`要素の有無を確認するだけでなく、上記のようなスキャナで機械的に全ファイルを検査してから「太字崩れ0件」と報告する。目視は疲れると見落とすが、フランキング規則の実装は見落とさない。

## 1コンポーネントに複数の`<MathFormula>`を置くときは、それぞれに専用の`ref`を張る——1つの`ref`を使い回すと2つ目以降の項が更新されない（出典 #78）
- **症状**: QUpdateStepper.tsx が同一コンポーネント内に2つの独立したKaTeX数式（`<MathFormula tex={FORMULA}>`と`<MathFormula tex={FORMULA2}>`）を描画し、useEffect内で`m.setValue("sqsa2", ...)`のように2つ目の式にしか存在しない項idを更新しようとしていたが、`ref`は最初の`<MathFormula>`にしか張っていなかった。tsc/lint/test/buildは全て通過し、Playwrightでステッパーを実際に1コマ進めて2つ目の数式の表示値（プレースホルダ"?"のまま変わらない）を目視確認して初めて気づいた——コードレビュー（4並列サブエージェント）でも3エージェント全てが独立にこのバグを検出した。
- **原因**: `MathFormulaHandle`（`TermController`）の`setValue`/`setHighlight`は`this.root.querySelector`でDOM探索範囲を**そのrefが指すコンポーネント自身のコンテナに限定**する（term-controller.ts）。1つ目の`<MathFormula>`の`ref`で2つ目の`<MathFormula>`の項id（DOM上は別のKaTeXサブツリーに存在）を探しても見つからず、`setValue`は`false`を返して静かに失敗する（例外もconsole警告も出ない）——lessons.md「同一ページに同じ`term-*` idを複数配置しても問題ない」（#31の教訓）は「同じ内容のコンポーネントを複数箇所に再掲する」場合の話であり、「1つのコンポーネント内で複数の異なる`<MathFormula>`をそれぞれ動的更新したい」場合はrefの数を式の数だけ用意する必要がある——似て非なるケースなので混同しないこと。
- **対策**: 1つのコンポーネントが複数の`<MathFormula>`（複数行に分けた数式、TD目標行と更新後Q行など）を動的更新する必要がある場合、`useRef<MathFormulaHandle>(null)`を式の数だけ用意し（`mathRef`, `mathRef2`, ...）、各`<MathFormula ref={mathRefN} tex={...}>`に対応するrefを個別に渡し、useEffect内でも対応するrefのハンドルだけにその式の項idを更新する。また、同一ページ内の別コンポーネント（例: 同じトピックのLevel0とLevel1）がそれぞれ独自の`term()`項idを定義している場合、`qsa`/`r`のような短い一般的な名前は衝突しやすいため、コンポーネント固有の接頭辞（例: ステッパー側は`s`を前置）で名前空間を分離し、DOM idの重複（無効なHTML、将来のquerySelector誤爆のリスク）も避ける。
- **判断の目安**: 「1コンポーネントに`<MathFormula>`が2つ以上ある」実装をレビューするときは、`ref`の数と`<MathFormula>`の数が一致しているか、useEffect内の`setValue`呼び出しがどのrefのハンドルに対して行われているかを必ず確認する。動作確認は「初期表示に'?'が残っていないか」だけでなく「ステッパーやスライダーを実際に動かして、全ての式が更新されるか」までPlaywrightで確認する。

## トピックMDX本文の裸の相対リンク`[text](term-slug)`は`/topics/`配下で誤った経路に解決され404になる——用語参照は必ず`<Term id>`を使う（出典 #79）

- **症状**: 直近マージ済みの複数トピック（`reinforcement-learning.mdx`・`learning-framework.mdx`等）が、本文中の用語参照に`<Term id="slug">`コンポーネントではなく裸のMarkdownリンク`[方策](policy)`（相対パス、`term`のslugを指す）を多用していた。`lib/content/registry.test.ts`は`<Term id>`参照とtermファイル内のリンクしか検証しないため、topic mdx内の裸リンクはCIをすり抜けて残っていた。実際に`/topics/policy`へcurlすると**404**（`app/topics/[slug]/page.tsx`は`listTopicSlugs()`に含まれるslugしか許可しないため、termのslugでは`notFound()`になる）。
- **原因**: `mdx-components.tsx`の`a`は素の`<a>`タグで、Next.jsのクライアントサイドルーティングを介さない。ブラウザは相対href（先頭`/`なし）を**現在のURLのディレクトリ**基準で解決するため、`/topics/reinforcement-learning`ページ内の相対リンク`policy`は`/topics/policy`（誤り、本来行きたいのは`/terms/policy`）に解決される。トピック同士のリンク（`[マルコフ連鎖](/topics/markov-chains)`のように先頭`/`を付けた絶対パス）は正しく動くため、"動いているリンクと動いていないリンクが同じファイルに混在する"という見た目上気づきにくい形でバグ化していた。
- **対策**: トピックMDX本文で用語（term）を参照するときは、テンプレート（`content/topics/_template.mdx`）どおり**必ず`<Term id="slug">表示テキスト</Term>`を使う**——`registry.test.ts`でリンク切れが検証されるだけでなく、ポップオーバー表示・`/terms/slug`への正しい遷移も保証される。トピック間のリンクは`[text](/topics/other-slug)`のように**先頭`/`付きの絶対パス**にする（`/topics/`配下で書く相対パスは事故のもと）。本トピック（#79 imbalanced-anomaly）実装時にこの区別を発見し、新規トピックでは全用語参照を`<Term id>`に統一した（既存トピックの誤った裸リンクは本Issueのスコープ外のため今回は修正していない——将来リンク切れ監査の別issueで一括修正するのが望ましい）。
- **判断の目安**: 新規トピックMDXを書く/レビューするときは、`content/topics/*.mdx`内の`](slug)`形式のリンクを機械的に洗い出し、①`/topics/`で始まる絶対パスか、②`<Term id="slug">`か のどちらかになっているかを確認する。どちらでもない裸の相対slugリンクが1件でもあれば、`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/topics/<slug>`で実際に404になることを確認してから修正する。

## `<MathFormula>`をcontrols（例: 手法トグル）で条件付きマウント/アンマウント切り替えすると、切替直後の1回だけ数式が更新されない（出典 #79）

- **症状**: AnomalyLab（LOF/Isolation Forest/MSPCを切り替える異常検知ラボ）で、3手法それぞれに`{method==="lof" ? <MathFormula ref={lofRef} .../> : null}`のように**条件付きで別々の`<MathFormula>`インスタンスをマウント**し、親のuseEffectで対応するrefの`setValue`を呼んでいた。手法を切り替えた**直後の1回だけ**、新しくマウントされた数式の項が"?"のまま更新されず、StepPlayerを1コマ動かす等**別の状態変化を伴う再レンダー**が起きると初めて正しい値に更新された。tsc/lint/test/buildは全て通過し、Playwrightで「ボタンをクリック→別のevaluate呼び出しで実際のDOM値を読む」という手順（同一evaluate内での同期読み取りではない、#31の教訓を踏まえた手順）で初めて発見した。
- **原因**: 条件分岐で「別の`<MathFormula>`インスタンスへ切り替える」ことは、旧インスタンスのアンマウント＋新インスタンスの新規マウントを意味する。新規マウントされた`<MathFormula>`自身の内部`useEffect`（`katex.render`を呼び`controllerRef.current`をセットする処理）と、親コンポーネントの`useEffect`（`ref.current.setValue(...)`を呼ぶ処理）は理論上「子→親」の順で同一コミット内に実行されるはずだが、実機検証では初回マウント直後の1回に限り親側の`setValue`が効かない現象が再現した（`if (!m) return`で静かに早期returnするため例外にもならず、console警告も出ない）。QUpdateStepper等の既存パターン（#78の教訓）は「1コンポーネントに複数の`<MathFormula>`を**常時マウントしたまま**、項の値だけ`setValue`で差し替える」設計だったため、この「conditionalなマウント/アンマウントの切り替え」特有の競合はこれまで顕在化していなかった。
- **対策**: 表示する数式の**構造**（分数/べき乗/和など）が操作（method切替等）によって変わる場合でも、`<MathFormula>`インスタンス自体は**常時1つだけ**マウントしたままにし、`tex`プロパティの**文字列**だけを`useMemo`/オブジェクトルックアップ（例: `METHOD_FORMULA[method]`）で切り替える。`tex`が変わればMathFormula自身の`useEffect`が`[tex, display]`依存で再描画するため、ref自体の再アタッチが発生せず、後続の`setValue`が確実に対象要素を見つけられる。refも1つ（`mathRef`）に集約でき、コードもシンプルになる。
- **判断の目安**: 「操作（トグル/セレクト等）に応じて表示する数式の**内容**が変わる」実装は、まず「`<MathFormula>`を条件付きでマウント切替する設計」になっていないか確認する。なっていれば「常時マウント+tex切替」に置き換えられないか検討する。動作確認では、初期表示だけでなく「切り替えた**直後**（他の操作を挟まない）」に正しい値が出るかを、クリック→（同一evaluateではなく）別呼び出しでのDOM読み取り、という手順でPlaywright実機確認する。

## 新規`StepPlayer`に`useFramePlayer`の呼び出しを付け忘れると「▶ 再生」ボタンがラベルを切り替えるだけで何も進まない（出典 #80）

- **症状**: KpiDecompositionStepper（KPI乗法分解を1コマずつ見せるステッパー）で、`StepPlayer`に`playing`/`onTogglePlay`をストアの`frame.playing`/`setPlaying`に配線したが、`useFramePlayer`フックの呼び出しを丸ごと書き忘れた。tsc/lint/test/buildは全て通過し（`playing`state自体は正しく更新されるため型的にもテスト的にも矛盾がない）、Playwrightで実際に「▶ 再生」ボタンを押し2秒待ってから別呼び出しでフレームindexを読む、という手順で初めて「ボタンのラベルは"⏸ 一時停止"に変わるのにフレームが1コマも進まない」ことを発見した——4並列のセルフレビューサブエージェントのうち1つ（正しさ観点）が、他のステッパー（例: KnnStepper）の実装と横並びで比較して指摘した。
- **原因**: `components/viz/StepPlayer.tsx`はコメントに明記されている通り「controlled component: 状態を持たず自動再生のタイマーはuseFramePlayer側の責務」という設計。`useFramePlayer({ playing, index, count, onAdvance, onStop, intervalMs })`を**呼び出し側が明示的に配線しない限り**、`playing=true`にしてもタイマーで`nextFrame()`を呼ぶ主体が存在しない。既存ステッパー（AdasynWeightStepper・KnnStepper・QUpdateStepper等）は全てこの呼び出しを含んでいたため、コピー元にする既存ファイルをよく見ずに`StepPlayer`のprops配線だけを見て「動くはず」と判断すると見落としやすい。
- **対策**: 新規ステッパーを実装したら、`StepPlayer`をJSXに置くコードの近くに必ず`useFramePlayer({ playing, index, count, onAdvance: nextFrame, onStop: () => setPlaying(false), intervalMs: ... })`があるかを確認する。動作確認は「▶ 再生ボタンを押す→数秒待つ→（同一evaluateではなく）別呼び出しでstep-counterのDOM値を読み、実際にindexが進んでいるか」までPlaywrightで確認する（ボタンのラベルが"⏸ 一時停止"に変わるだけでは「動いている」ことの証明にならない）。
- **判断の目安**: 新規`<StepPlayer>`を追加するコードレビューでは、同じファイル内に`useFramePlayer`の呼び出しが存在するかを機械的にgrepで確認する。1つでも欠けていれば自動再生が壊れている可能性が高い。

## `document.documentElement.scrollWidth`がモバイル幅を超えページ全体が横スクロール可能になる、サイト全体の既存の軽微な問題（出典 #84）

- **症状**: model-selection-criteriaトピック（Playwrightでモバイル幅390pxを検証中）で、スクリーンショット上は表・グラフ・数式とも視覚的に崩れていないのに、`document.documentElement.scrollWidth`が503px(viewport 390pxを超過)になり、`window.scrollTo(200,0)`で実際に113pxだけ横スクロールできてしまうことを発見した。同じ手法で既存の`multiclass-metrics`トピックを調べたところ、そちらはscrollWidthが1049px（差659px）とさらに悪化しており、サイト全体に既存する問題と判明した。
- **原因**: KaTeXは視覚的に表示するHTML(`.katex-html`)とは別に、スクリーンリーダー用の`.katex-mathml`（`position:absolute`＋`clip`で視覚的に隠す）を同時にレンダリングする。この隠し要素は`position:absolute`で通常のレイアウトからは外れるが、祖先要素が`position:relative`でなく幅が固定されていない場合、絶対配置要素の自然幅がなお祖先の`scrollWidth`計算に寄与し、視覚的には何も崩れていないのに「ページ全体が横スクロール可能」という状態になりうる（ブラウザのレイアウト仕様上よく知られた挙動）。数式が長いほど`.katex-mathml`の自然幅も長くなるため、影響量は数式の複雑さに比例する。
- **対策（今回の判断）**: 視覚的な崩れが無く、値の読み取り・操作にも支障が無いこと、既存トピックにも同程度以上の症状が既にあることを確認したうえで、**Issue単位のスコープ外（サイト全体のKaTeX/CSSに関わる横断的な問題）と判断し、個別トピックでは対処しなかった**。もし今後この問題を根本修正する場合は、KaTeXの`.katex-mathml`に対して`width:1px;overflow:hidden`等の追加クランプをグローバルCSSに当てる、または`MathFormula`のコンテナに`overflow-x:hidden`を明示するといった対応が候補になる（ただし数式自体がコンテナよりはみ出す場合に数式が見えなくなるリスクがあるため、既存の`overflow-x-auto`ラッパーとの兼ね合いを含め別Issueとして検証すべき）。
- **判断の目安**: 新規トピックのモバイル確認では、スクリーンショットの目視だけでなく`document.documentElement.scrollWidth`と`window.innerWidth`の比較、`window.scrollTo`で実際に横スクロールするかも確認する。ただし差分が既存トピック（特に数式を多用するページ）と同程度以下で、視覚的な崩れ・要素の欠落が無いことを確認できれば、サイト横断のKaTeX起因の問題として個別トピックの実装ではなく別Issueへ切り出してよい（今回のようにその場で無理に修正しようとしない）。

## 決定境界などの数値グリッドサーチは「真の根がちょうど格子点に一致する」とMath.sign(0)で重複検出する（出典 #85）

- **症状**: ベイズ統計の基礎トピックで、2クラス（等分散・事前確率0.5）の決定境界を`findDecisionBoundaries`（[xMin,xMax]をstep等分割し、隣接2点で`posterior-0.5`の符号が変わったら線形補間で根を求める）で求めるテストが、`boundaries`の長さが1であるべきところ2を返して失敗した。原因を追うと、真の交点（x=5.5）が`(xMax-xMin)/steps`の割り切れる位置にちょうど一致し、その格子点で`diff=0`になっていた。
- **原因**: `Math.sign(0)===0`であり、直前の点の符号（例: `-1`）とも直後の点の符号（例: `+1`）とも異なると判定されるため、「`diff=0`の点」の前後で**2回連続して**「符号が変わった」と誤検出し、同じ根をほぼ同一のx値で2件登録してしまう。教育目的で選ぶ小さな具体例（クラス平均3と8の中点=5.5、xMin=-4等）ほど、意図せずグリッドの割り切れる値と一致しやすい。
- **対策**: 検出した根が直前に記録した根と近すぎる（グリッド間隔の半分未満）場合は重複として無視するガードを追加する（`lib/stats/bayesian-basics.ts`の`findDecisionBoundaries`）。あるいはグリッド間隔・範囲を根がちょうど格子点に乗らない値にずらす対症療法もあるが、入力（xMin/xMax/steps）が変わるたびに再発するため、重複除去を関数内に持たせる方が頑健。
- **判断の目安**: 数値グリッドサーチで「符号が変わった点」を根として拾う実装（決定境界・臨界値探索など）をテストするときは、値が偶然きれいに割り切れる具体例（中点・整数境界など）を意図的に使ってこの手のちょうど0ケースを顕在化させ、`Math.sign`の0の扱いに起因する重複検出がないかを確認する。

## 離散事象の確率と連続パラメータの分布は別の用語ノードにする——「事前確率」「事前分布」を安易に同一視しない（出典 #85）

- **背景**: probability-basics（B-1）で「事前確率」「事後確率」（`prior-probability`/`posterior-probability`、離散事象の確率 $P(D)$）が既に用語ノード化されていた。bayesian-basics（K-1）では、ベータ分布のようにパラメータθ**全体**に対する確率密度を「事前分布」「事後分布」として新規に扱う必要があったが、日本語表記が同じ「事前分布」であるため、既存2用語のaliasesに「事前分布」「事後分布」がそのまま含まれており、そのまま放置すると2つの別概念が同じ日本語表記で曖昧に混在してしまう。
- **対策**: 既存の`prior-probability.mdx`/`posterior-probability.mdx`から重複するalias（「事前分布」「事後分布」）を削除し、新設した`prior-distribution.mdx`/`posterior-distribution.mdx`側にその表記を持たせた。さらに双方の本文に「対象が1つの事象・仮説の確率から、パラメータ空間全体の分布へ一般化されたもの」という橋渡しの一文と相互seeAlsoを追加し、読者が「同じ言葉に見えるが別の対象を指している」ことを誤魔化さずに追えるようにした。
- **判断の目安**: 新規トピックで用語を追加するとき、既存用語のtitle・aliasesと似た日本語表記が出てきたら、まず`grep`で既存用語の定義を確認する。対象（事象/仮説の確率 vs パラメータ・分布全体）が異なるなら別ノードとして新設し、重複するaliasは既存側から外して新設側に寄せ、本文で両者の関係（一般化・特殊化の関係）を明示する。
