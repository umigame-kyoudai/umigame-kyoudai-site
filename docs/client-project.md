# 海亀兄弟 Webサイト管理台帳

確認日: 2026-09-25。秘密値は記録しない。

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

今回の公開対象・未反映機能は [ナイトページ公開記録](night-tour-release-2026-09-25.md) に記載する。

予約経由・Calendarの🥥表示は [公開作業記録](booking-source-release-2026-09-25.md) を参照。2026-09-25にGoogle接続と管理GASの公開v22を確認済み。受付GASの編集URLとの照合待ちで、経由機能の本番切替は未実施。
