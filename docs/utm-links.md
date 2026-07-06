# 流入元計測用リンク一覧（UTMリンク）

お客さんが「どのリンクを経由で予約したか」を判別するための、貼り先ごとの専用URLです。
**各媒体にリンクを貼るときは、必ず下の対応するURLをそのまま使ってください。**
（`?utm_source=...` が付いているだけで、開くページは同じです）

## 使い方

| 貼る場所 | 使うURL |
|---|---|
| Instagram プロフィール | `https://www.umigamekyoudaimiyakojima.com/?utm_source=instagram&utm_medium=profile` |
| Instagram ストーリー/投稿のリンク | `https://www.umigamekyoudaimiyakojima.com/?utm_source=instagram&utm_medium=story` |
| LINE公式（リッチメニュー・配信） | `https://www.umigamekyoudaimiyakojima.com/?utm_source=line&utm_medium=official` |
| Googleビジネスプロフィール（マップ） | `https://www.umigamekyoudaimiyakojima.com/?utm_source=gbp&utm_medium=profile` |
| チラシ・名刺のQRコード | `https://www.umigamekyoudaimiyakojima.com/?utm_source=flyer&utm_medium=qr` |
| YouTube 概要欄 | `https://www.umigamekyoudaimiyakojima.com/?utm_source=youtube&utm_medium=description` |
| 提携サイト・紹介ブログ | `https://www.umigamekyoudaimiyakojima.com/?utm_source=partner&utm_medium=referral&utm_campaign=相手の名前をローマ字で` |

- トップページ以外に飛ばしたい場合も同じ要領（例: `https://www.umigamekyoudaimiyakojima.com/plans/S1?utm_source=instagram&utm_medium=story`）
- 新しい貼り先を増やすときは `utm_source=媒体名&utm_medium=場所`（**ローマ字・英数字のみ**。日本語は記録されません）
- UTMが付いていない流入も、GoogleやInstagramから来た場合は「参照元ドメイン」で自動判別されます。
  ただしLINEやInstagramのアプリ内ブラウザは参照元を渡さないことが多いため、**自分で貼るリンクには必ずUTMを付ける**のが確実です。

## 結果の見方

1. **予約1件ごとの流入元**：仮予約通知メール／Googleカレンダーの「特別なご要望」欄の末尾に
   `[流入元] instagram / profile（着地: /）` のように載ります。
   - `[流入元] 参照元: www.google.com` → Google検索から
   - `[流入元] 不明（直接アクセス・ブックマーク等）` → URL直打ち・ブックマーク・参照元を渡さないアプリ等
2. **集計（どの流入元から何件予約が入ったか）**：Vercelダッシュボード → Analytics → Events →
   `booking_submitted` の `source` プロパティで内訳が見られます（例: `instagram/profile`, `ref:www.google.com`, `direct`）。
3. **訪問数ベースの集計**：Vercel Analytics のページビューでも UTM（utm_source 等）でフィルタできます。

## 仕組みメモ（技術）

- 着地時に `lib/attribution.ts` が UTM/参照元を localStorage に保存（90日有効・ラスト・ノンダイレクト方式）
- 予約送信時にフォーム（ja/en 共通）が `attribution` を `/api/booking` に添付
- API が備考欄末尾に `[流入元]` ブロックを追記（GAS側の変更は不要）
- お客様向けのLINE通知には載りません（管理者メール・カレンダーのみ）
