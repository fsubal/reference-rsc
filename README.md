# Reference RSC prototype

表示は React Server Components、更新は明示的な HTTP API。プロジェクトの議論をもとにした Node.js 用プロトタイプです。[設計書](./DESIGN.md)に採用理由、責務、未実装の範囲をまとめています。

## 起動

Node.js 24 を推奨。初回だけ依存をインストールします。

```sh
npm ci
npm run dev
```

表示されたローカル URL を開きます。Overview / Design 間を移動しても、下部のカウンターを保持します。Notes demo ではフォームから JSON API を呼び、`refresh()` で RSC の一覧を更新します。メモはプロセスのメモリ上にのみ存在します。

本番ビルドのローカル確認:

```sh
npm run build
npm start
```

URL は `http://127.0.0.1:4173`。SPA 遷移は Navigation API を使用します。非対応ブラウザでは通常のページ遷移になります。

## 静的生成

```sh
npm run generate
npm run preview:static
```

`http://127.0.0.1:4174`。`static/` に `/` と `/about` の HTML・Flight・ブラウザ資産を生成します。実行時に RSC サーバーは不要です。Notes demo は動的サーバーの機能なので静的出力には含みません。静的ホストでは `.rsc` を `text/x-component` として配信してください。

## 確認

```sh
npm run typecheck
npm test
npm run generate
npm run test:e2e
```

E2E はインストール済みの Google Chrome を使用します。別環境では `playwright.config.ts` の channel を変更してください。Playwright がテスト用サーバーを起動・終了します。

2026-10-12 の検証結果: 型チェック、3 環境の本番ビルド、SSG 生成、単体 11 件・Chrome E2E 11 件が成功。E2E は JavaScript 無効時の SSR、追加 Flight 取得なしの Hydration、通常リンク・履歴遷移、Client state の保持、API 更新と refresh、並行リクエストの context 分離、連続遷移の競合、405 / 404 / redirect、Pure SSG、Navigation API 非対応、通信失敗からの復帰を確認します。

## コードの入口

| ファイル                    | 役割                                         |
| --------------------------- | -------------------------------------------- |
| `src/entry.rsc.tsx`         | Hono のページ登録、API 委譲、SSG             |
| `src/framework/render.tsx`  | Hono adapter と HTML / Flight の切り替え     |
| `src/entry.ssr.tsx`         | SSR と Hydration 用 Flight 埋め込み          |
| `src/framework/browser.tsx` | Navigation API、キャンセル、React commit     |
| `src/framework/client.tsx`  | `refresh()` と `useLocation()`               |
| `src/framework/context.ts`  | Server Components 用の request-local context |
| `src/framework/guard.ts`    | `use server` 禁止のビルド検査                |
| `src/app/pages.tsx`         | サンプルの Server Components                 |
| `src/app/components.tsx`    | カウンターと API 更新フォーム                |
| `src/app/api.ts`            | 明示的な更新 API と一時ストレージ            |

`sources/` の同期資料には手を加えていません。ここは新規のローカル実装です。
