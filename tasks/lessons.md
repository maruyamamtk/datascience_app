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
