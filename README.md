# データサイエンス学習アプリ

操作→グラフ→数式を強連動させ、アルゴリズム図鑑スタイルのコマ送りで統計の概念を体感する学習アプリ。
方針は [SPEC.md](./SPEC.md) / [CLAUDE.md](./CLAUDE.md)、設計は [docs/design/](./docs/design/) を参照。

## 必要環境

| ツール | バージョン | 備考 |
| --- | --- | --- |
| Node.js | **20 以上** | `package.json` の `engines` |
| pnpm | **11.8.0** | `corepack enable` で有効化推奨 |

```bash
# Node 20+ が入っている前提で pnpm を有効化
corepack enable
corepack prepare pnpm@11.8.0 --activate
```

## セットアップ

```bash
pnpm install
```

> ネイティブ依存（esbuild / sharp / unrs-resolver）のビルドは `pnpm-workspace.yaml` の
> `allowBuilds` で許可済み。許可されていないビルド警告が出た場合はここに追記する。

## 起動方法

### 開発サーバ（ホットリロード）

```bash
pnpm dev
```

→ http://localhost:3000 を開く。
別ポートで起動するには `pnpm dev -- -p 3210` のようにポートを指定する。

### 本番ビルド & 起動

```bash
pnpm build   # 静的生成（SSG）を含むビルド
pnpm start   # ビルド結果を本番モードで配信（既定 http://localhost:3000）
```

PWA の Service Worker は **本番モードでのみ登録**される。オフライン閲覧やホーム画面追加を
確認するときは `pnpm build && pnpm start` を使う（`pnpm dev` では SW は登録解除される）。

主なルート:

- `/topics/central-limit-theorem` … 中心極限定理トピック（操作→グラフ→数式の強連動）
- `/terms` … 用語集 / `/terms/[slug]` … 用語ノード
- `/offline` … オフライン時のフォールバック

> 60fps の計測オーバーレイは URL に `?fps` を付けると表示される（例: `/topics/central-limit-theorem?fps`）。

## 開発でよく使うコマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 開発サーバ起動 |
| `pnpm build` / `pnpm start` | 本番ビルド / 本番起動 |
| `pnpm test` | Vitest 実行（計算層は node、DOM テストは jsdom） |
| `pnpm test:watch` | テストのウォッチ実行 |
| `pnpm lint` | ESLint |
| `pnpm format` / `pnpm format:check` | Prettier 整形 / チェック |
| `pnpm new:topic <slug> "<title>"` | Level 制テンプレートから新トピック雛形を生成 |

## トラブルシュート

- **`document is not defined` でテストが落ちる**: コンポーネントの DOM テストはファイル先頭に
  `// @vitest-environment jsdom` を付ける（計算層 `lib/**` は node のままでよい）。
- **ポートが使用中**: `pnpm dev -- -p <port>` で別ポートを指定する。
- **Service Worker が更新されない**: 開発時はブラウザの DevTools → Application → Service Workers から
  unregister するか、本番では `public/sw.js` の `VERSION` を上げると旧キャッシュが破棄される。
