# 状態管理基盤 — トピック単位ストア + 3層疎結合（Issue #3）

関連: [walking-skeleton.md](./walking-skeleton.md) §2 / [CLAUDE.md](../../CLAUDE.md) §2

操作値・派生値の **single source of truth** を確立し、全可視化で使い回す 3 層疎結合の規約を定める。

---

## 1. 3層の役割

```
[Control層]  操作UI（スライダー/ボタン/ドラッグ）→ store の action を呼ぶだけ
     ▼
[Store]      Zustand トピックストア = 操作値(controls) + 派生値(derived) + フレーム状態(frame)
     │ subscribe（selector で購読）
     ├──────────────┬───────────────┐
     ▼              ▼               ▼
[Compute層]    [Render:Graph]   [Render:Math]
 純関数 derive    SVG/D3 描画     KaTeX + 項パッチ
 (lib/stats)
```

- **Control 層**: action（`setControl` 等）を呼ぶだけ。計算も描画も持たない。
- **Compute 層**: `lib/stats/*` の純関数。`derive(controls) => derived`。副作用なし・Vitest 対象。
- **Store 層**: `controls` だけが真実。`derived` は `setControl`/`patchControls` の中で `derive` により再計算され、直接書き換えない。
- **Render 層**: Graph / Math / 数値表示は同じストアを selector で購読。1 操作変更が全描画へ一貫反映される。

## 2. ファイル

| ファイル | 層 | 役割 |
| --- | --- | --- |
| `lib/stats/clt.ts` | Compute | `CltControls`/`CltDerived` 型・`deriveClt`・`standardError`（純関数） |
| `lib/store/topicStore.ts` | Store | `createTopicStore` ファクトリ（トピック共通の雛形） |
| `lib/store/clt.ts` | Store | `useCltStore`（CLT 具象ストア） |
| `app/poc/store/StorePoc.tsx` | Render+Control | 配線パターンの実証（Graph+Math+数値が同一ストア購読） |

## 3. 新トピックの追加手順

1. **計算層**: `lib/stats/<topic>.ts` に `XxxControls`/`XxxDerived` 型と純関数 `deriveXxx(controls)` を書く（テストも）。
2. **ストア**: `lib/store/<topic>.ts` で `createTopicStore({ initialControls, derive: deriveXxx, initialFrameCount })`。
3. **描画**: 各 Render コンポーネントは `useXxxStore((s) => s.controls.xxx)` のように **selector で必要な値だけ購読**する。
4. 操作 UI は `setControl("key", value)` を呼ぶだけにする。

## 4. ストア API（`TopicState`）

- 状態: `controls`（操作値）/ `derived`（派生値）/ `frame`（`{ count, index, playing }`）。
- 操作値: `setControl(key, value)` / `patchControls(patch)` — どちらも `derived` を再計算する。
- フレーム（コマ送り / StepPlayer 用）: `setFrameCount` / `goToFrame` / `nextFrame` / `prevFrame` / `setPlaying`（範囲は自動クランプ）。
- `reset()` — 操作値・派生値・フレームを初期状態へ戻す。

## 5. テスト指針

- **計算層**は純関数なので入出力を直接アサート（`lib/stats/*.test.ts`）。
- **ストア**は React 不要。`store.getState().setControl(...)` を呼び `store.getState().derived` を検証する（`lib/store/*.test.ts`）。共有シングルトン（`useCltStore`）は `afterEach` で `reset()`。
- Render 層の購読挙動はブラウザ実機（`/poc/store`）で確認する。

## 6. 受け入れ条件の対応

- 「1 つの状態変更が Graph と Math の両方へ一貫反映」→ 派生値の再計算を action に一元化 + 同一ストア購読（`/poc/store` で実証）。
- 「Compute 層が Vitest で単体テストできる」→ `deriveClt`/`standardError` を純関数として分離しテスト済み。
