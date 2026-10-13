# 海亀兄弟 Webサイト管理台帳

確認日: 2026-09-26。秘密値は記録しない。

| 項目 | 確認済みの構成 |
| --- | --- |
| 顧客名 | 海亀兄弟 |
| Project名 | `umigame-kyoudai-site` |
| GitHub | `umigame-kyoudai/umigame-kyoudai-site`、既存の公開Repository。コード保存のための有料契約は不要 |
| 公開先 | 既存Vercel Team `umigame-kyoudai` / Project `umigame-kyoudai-site` |
| 本番ドメイン | `www.umigamekyoudaimiyakojima.com`、DNSはVercel |
| Supabase | 今回不要。既存GAS / Sheetsを継続 |
| 決済 | 今回追加なし。書籍はユーザー指定のAmazon購入ページへ案内 |
| 外部API | 既存Google Apps Script / Sheets / Calendar、LINE / LIFF、解析 |
| 引き渡し | サイト単位Repositoryあり。Google / LINE / ドメインの権利・管理者との対応確認は別途必要 |

Vercel Project ID: `prj_mkbIpIctCuEGUBUb0B2vHrhKn7pI`。
Team ID: `team_AVkVeJGhky3xEi61HxtzJ2IX`。

原則のGitHub→Cloudflare方針に対し、2026-09-25にユーザーが「バーセルでいいよ」と明示したため、今回の更新は既存Vercelプロジェクトで実施する。タートルラボTeamへの移管、Cloudflareへの移行、新規有料契約、ドメイン変更は行わない。

本番環境変数は既存Vercel Projectで管理する。READMEの変数一覧を参照。実環境ファイルや秘密値はコミットしない。

ナイト専用デザインと書籍案内は [ナイトページ公開記録](night-tour-release-2026-09-25.md) に記載する。

予約経由・Calendarの🥥表示は [公開作業記録](booking-source-release-2026-09-25.md) を参照。2026-09-26に受付GAS v36・管理GAS v23を既存URLのまま公開済み。所有アカウントは `info@umigamekyoudaimiyakojima.com`。予約Spreadsheet・Calendar・公開デプロイとの対応は上記記録に集約し、隔離検証8件を確認した。Webと受付GASで同一の `BOOKING_SOURCE_SECRET` を管理する。

専用入口 `https://www.umigamekyoudaimiyakojima.com/from/souichiro` はWeb本番へ反映済み。HTTPSでの署名・Cookie、スマホの詳細ページから予約フォームへの経由引き継ぎを確認した。

2026-09-26の仮予約フォーム改善（希望日の幅調整、代表者情報の順序変更、参加者1人目への氏名反映）は [変更・検証記録](booking-form-release-2026-09-26.md) を参照。

2026-09-30の写真掲載・素材利用の任意同意欄と、管理者メール・Calendar・台帳への引き継ぎは [変更・検証記録](photo-consent-release-2026-09-30.md) を参照。既存GASの備考連携を使用し、Google側の再デプロイや列追加は不要。


## SEO・集合案内の整備（2026-10-13）

事務所は来店受付・集合場所ではなく、ツアーは現地集合・現地解散。海のツアーは前日、ナイトツアーは当日にLINE案内する運営実態へ、アクセスページ・日本語予約フォームの導入・4言語のフッターと駐車場FAQを統一した。電話・住所・営業時間は `lib/site-config.ts` を参照する。

ホームのLocalBusinessから、観光名所・スポーツ施設の型と根拠未確認の座標・地図指定を除いた。事務所所在地自体は用途を明記して維持。料金、予約処理、検索対象から除外する予約ページのnoindexは変更しない。サイトマップの更新日はホーム・アクセス・FAQの実際の修正日に合わせた。

変更履歴：[PR #47](https://github.com/umigame-kyoudai/umigame-kyoudai-site/pull/47)。公開先は既存Vercelプロジェクトを継続する。`npm run lint`、`npm run build`、既存テスト292件と4言語の生成HTMLを検証。公開前調査ではサイトマップ82URLと追加の内部リンク6URLがすべてHTTP 200で、サイトマップ対象のタイトル・説明・canonical・H1・JSON-LD構文に欠落を検出しなかった。これはGoogleのインデックス登録や順位の保証ではない。
