# 流入元計測用リンク一覧（UTMリンク）

お客さんが「どのリンクを経由で予約したか」を判別するための、貼り先ごとの専用URLです。
**各媒体にリンクを貼るときは、必ず下の対応するURLをそのまま使ってください。**
（`?utm_source=...` が付いているだけで、開くページは同じです）

## 使い方

LINE公式からサイトへ案内する場合も、掲載場所に合うリンクを使います。
アプリ内ブラウザが参照元を渡さず、以前の取得済み情報もない場合は、UTMなしでは媒体を判別できません。

| 貼る場所 | 使うURL |
|---|---|
| **LINE公式：リッチメニュー** | `https://www.umigamekyoudaimiyakojima.com/?utm_source=line&utm_medium=richmenu` |
| **LINE公式：あいさつメッセージ**（友だち追加直後） | `https://www.umigamekyoudaimiyakojima.com/?utm_source=line&utm_medium=greeting` |
| **LINE公式：一斉配信** | `https://www.umigamekyoudaimiyakojima.com/?utm_source=line&utm_medium=broadcast` |
| **LINE公式：1対1チャットで案内するとき** | `https://www.umigamekyoudaimiyakojima.com/?utm_source=line&utm_medium=chat` |
| Googleビジネスプロフィール（マップ） | `https://www.umigamekyoudaimiyakojima.com/?utm_source=gbp&utm_medium=profile` |
| YouTube 概要欄 | `https://www.umigamekyoudaimiyakojima.com/?utm_source=youtube&utm_medium=description` |
| Instagram プロフィール（直接サイトに飛ばす場合） | `https://www.umigamekyoudaimiyakojima.com/?utm_source=instagram&utm_medium=profile` |
| Instagram ストーリー/投稿のリンク | `https://www.umigamekyoudaimiyakojima.com/?utm_source=instagram&utm_medium=story` |
| Threads 投稿のリンク | `https://www.umigamekyoudaimiyakojima.com/?utm_source=threads&utm_medium=post` |
| チラシ・名刺のQRコード | `https://www.umigamekyoudaimiyakojima.com/?utm_source=flyer&utm_medium=qr` |
| 提携サイト・紹介ブログ | `https://www.umigamekyoudaimiyakojima.com/?utm_source=partner&utm_medium=referral&utm_campaign=相手の名前をローマ字で` |

`line / ...` は「LINEからサイトへ来た」ことを示します。その前にInstagram等を見たかは、この記録だけでは分かりません。
この表のUTMは、LINEの中からホームページへ飛ばす自社サイトURLに付けます。友だち追加用の`lin.ee`リンクへ同じパラメータを付けても、自社サイトへの引継ぎは保証されません。

### 誰の専用リンクを使ったか確認したい場合

| Instagramの掲載者 | 使用するURL |
|---|---|
| そういちろう | `https://www.umigamekyoudaimiyakojima.com/from/souichiro` |
| 山ちゃん | `https://www.umigamekyoudaimiyakojima.com/from/yamachan` |
| 海亀兄弟公式 | `https://www.umigamekyoudaimiyakojima.com/from/umigame` |

専用リンクの経由は媒体計測と別に、署名を検証して記録します。担当スタッフの指名や、任意のUTMの文字だけから紹介者を決めません。詳細は[専用入口の運用記録](booking-source-release-2026-09-25.md)を参照してください。

- トップページ以外に飛ばしたい場合も同じ要領（例: `https://www.umigamekyoudaimiyakojima.com/plans/S1?utm_source=instagram&utm_medium=story`）
- 新しい貼り先を増やすときは `utm_source=媒体名&utm_medium=場所`（**ローマ字・英数字のみ**。日本語は記録されません）
- UTMが付いていない流入も、GoogleやInstagramから来た場合は「参照元ドメイン」で自動判別されます。
  ただしLINEやInstagramのアプリ内ブラウザは参照元を渡さないことが多いため、**自分で貼るリンクには必ずUTMを付ける**のが確実です。

## AI経由の判別

ChatGPT・Claude・Gemini・Perplexity・Copilot・Grok・DeepSeekは、参照元ドメインまたはUTMが届いた場合に、それぞれのサービス名を仮予約メールへ表示します。「かんたんレポート」のAI内訳にも同じ名前で集計します。AIが通常URLを案内した場合も、参照元が届けば判別できます。どちらも届かない場合は不明のままです。[対応ドメイン・判別方法](ai-traffic-sources-2026-10-31.md)。

## 結果の見方

1. **予約1件ごとの流入元**：2026-10-31のメール表示更新では、仮予約通知の冒頭に「媒体・掲載場所・紹介者の専用リンク・判定根拠」を表示します。[反映状況](traffic-source-email-audit-2026-10-31.md)を確認してください。旧メール／Googleカレンダーの「特別なご要望」欄の末尾には
   `[流入元] instagram / profile（着地: /）` のように載ります。
   - `[流入元] 参照元: www.google.com` → Googleから。ホスト名だけでは検索／マップを断定できません
   - `[流入元] 不明（直接アクセス・ブックマーク等）` → URL直打ち・ブックマーク・参照元を渡さないアプリ等
2. **集計（どの流入元から何件予約が入ったか）**：Vercelダッシュボード → Analytics → Events →
   `booking_submitted` の `source` プロパティで内訳が見られます（例: `instagram/profile`, `ref:www.google.com`, `direct`）。
3. **訪問数ベースの集計**：Vercel Analytics のページビューでも UTM（utm_source 等）でフィルタできます。

## 仕組みメモ（技術）

- 計測同意後に `lib/attribution.ts` が UTM/参照元を localStorage に保存（90日有効・直近で取得できた流入元）。同意前のページ移動や別ブラウザへの移動では復元できない場合があります
- 予約送信時にフォーム（ja/en 共通）が `attribution` を `/api/booking` に添付
- API が備考欄末尾に `[流入元]` ブロックを追記（GAS側の変更は不要）
- お客様向けのLINE通知には載りません（管理者メール・カレンダーのみ）
