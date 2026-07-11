# 海亀兄弟 — 宮古島ウミガメツアー予約サイト

宮古島でウミガメと泳ぐシュノーケルツアー「海亀兄弟」の公式サイト。
ツアー紹介・予約・ブログ（観光情報）・英語版を備えた Next.js アプリです。

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://www.umigamekyoudaimiyakojima.com)

- 本番サイト: **https://www.umigamekyoudaimiyakojima.com**
- リポジトリ: https://github.com/genkidama2439-collab/v0-website

## 技術スタック

| 区分 | 採用技術 |
|---|---|
| フレームワーク | Next.js 14（App Router）/ React 18 |
| 言語 | TypeScript |
| スタイル | Tailwind CSS v4 / framer-motion |
| 画像 | next/image（Vercel Blob ストレージ） |
| 予約連携 | Google Apps Script（予約シート）+ LINE Bot SDK / LIFF |
| 計測 | Vercel Analytics（予約・LINE CTA のカスタムイベント） |

## ローカル開発

```bash
npm install
npm run dev     # http://localhost:3000
```

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | ビルド済みアプリの起動 |
| `npm run lint` | Lint 実行 |

### 環境変数

予約・LINE 連携には以下の環境変数が必要です（Vercel のプロジェクト設定で管理）。

| 変数名 | 用途 |
|---|---|
| `GAS_BOOKING_URL` | 予約データの送信先（Google Apps Script Web アプリ URL） |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE 公式アカウントからの通知送信 |
| `LINE_NOTIFY_SECRET` | `/api/line/notify` 認証用シークレット |
| `NEXT_PUBLIC_LIFF_ID` | LINE ログイン（LIFF）連携 |
| `LINE_LOGIN_CHANNEL_ID` | 予約APIでLIFF ID tokenを検証するLINE Login Channel ID（サーバー専用） |

## デプロイ

`main` ブランチへ push すると **Vercel が本番へ自動デプロイ**します。
プレビューは PR / 非 main ブランチの push で自動生成されます。

## ディレクトリ構成

```
app/            ルーティング（App Router）
  page.tsx        トップページ（縦長 LP）
  plans/          プラン一覧・詳細（/plans/[id]）
  blog/           ブログ（観光情報・/blog/[slug]）
  book/           予約フォーム（noindex）
  en/             英語版サイト
  api/            予約 / クーポン / LINE 通知のサーバー処理
  miyakojima-sea-turtle/  SEO ピラーページ
  sitemap.ts / robots.ts  SEO 設定
components/      UI コンポーネント（home/ にトップ各セクション）
lib/             データ・ロジック（プラン・ブログ・料金・予約・SEO 等）
  data.ts         プラン / ブログ / スタッフのマスターデータ
public/          画像など静的アセット
middleware.ts    旧 URL の 308 リダイレクト（リンク評価の集約）
```

## 主な機能

- ツアープラン紹介（シュノーケル・ナイト・SUP・昼夜セットなど）
- Web 予約フォーム（料金・クーポンはサーバー側で再計算、IP レートリミット付き）
- 予約内容を Google スプレッドシートへ連携し、LINE で通知
- 観光情報ブログ（SEO 流入の受け皿）
- 日本語 / 英語の二言語対応（hreflang 相互リンク）
