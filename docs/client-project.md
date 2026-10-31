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

2026-10-31、受付GASの既存公開デプロイを版37（`2026.10.31-1`）へ更新。仮予約メールの冒頭に媒体・掲載場所・紹介者の専用リンク・判定根拠を表示する。管理GAS・Webの計測処理・台帳列・同意条件は維持。実データの照合と外部送信を模擬化した334テストが成功。新規予約・実メール送信は行っていない。[調査・反映記録](traffic-source-email-audit-2026-10-31.md)。

2026-10-31 17:04 JST、受付GASを版38（`2026.10.31-2`）へ更新し、AI7サービスを個別名で表示する。分析GASの保存コードも同じ分類へ更新。既存の公開先・同意条件・台帳列を維持。353テスト成功。[AI別分類の記録](ai-traffic-sources-2026-10-31.md)。

2026-09-26の仮予約フォーム改善（希望日の幅調整、代表者情報の順序変更、参加者1人目への氏名反映）は [変更・検証記録](booking-form-release-2026-09-26.md) を参照。

2026-09-30の写真掲載・素材利用の任意同意欄と、管理者メール・Calendar・台帳への引き継ぎは [変更・検証記録](photo-consent-release-2026-09-30.md) を参照。既存GASの備考連携を使用し、Google側の再デプロイや列追加は不要。


## SEO・集合案内の整備（2026-10-13）

事務所は来店受付・集合場所ではなく、ツアーは現地集合・現地解散。海のツアーは前日、ナイトツアーは当日にLINE案内する運営実態へ、アクセスページ・日本語予約フォームの導入・4言語のフッターと駐車場FAQを統一した。電話・住所・営業時間は `lib/site-config.ts` を参照する。

ホームのLocalBusinessから、観光名所・スポーツ施設の型と根拠未確認の座標・地図指定を除いた。事務所所在地自体は用途を明記して維持。料金、予約処理、検索対象から除外する予約ページのnoindexは変更しない。サイトマップの更新日はホーム・アクセス・FAQの実際の修正日に合わせた。

変更履歴：[PR #47](https://github.com/umigame-kyoudai/umigame-kyoudai-site/pull/47)。公開先は既存Vercelプロジェクトを継続する。`npm run lint`、`npm run build`、既存テスト292件と4言語の生成HTMLを検証。公開前調査ではサイトマップ82URLと追加の内部リンク6URLがすべてHTTP 200で、サイトマップ対象のタイトル・説明・canonical・H1・JSON-LD構文に欠落を検出しなかった。これはGoogleのインデックス登録や順位の保証ではない。


## プラン比較・仮予約への導線改善（2026-10-13）

[PR #48](https://github.com/umigame-kyoudai/umigame-kyoudai-site/pull/48)。日本語のホーム・一覧に体験別の絞り込みを追加し、比較表に貸切シュノーケル・貸切ナイトを補完。既存の4列表示を維持し、各行からプラン詳細へ進めるようにした。一般プラン詳細の冒頭に日付選択への入口と仮予約→LINE連絡→確定の説明を追加。独自デザインのナイト詳細と外国語フォームは今回の変更対象外。

日本語予約フォームは、有効な選択済みプランがある場合に確認欄を先に表示し、一覧を折りたたむ。「プランを変更する」で従来の14プランを開け、手動選択中は閉じない。日時入力へ進む操作で日付欄へフォーカスする。60歳以上の通常プラン制限は確認欄にも表示。全セットに1,000円割引と表示していたクーポン説明を、既存のプラン別割引表示と矛盾しない文言へ修正した。料金・参加条件・GAS/APIの予約処理・支払条件は変更していない。

対象のプランカード・一般詳細CTAは既存の `sendDetailedEvent` に揃え、既存の同意条件に従ってGA4・Vercelと分析シートへ送る。仮予約送信の成功は `generate_lead` であり、スタッフ確認後の成約や入金とは別。効果改善は公開後のデータで評価する。

検証：lint・本番ビルド・既存292テスト成功。HTTPSプレビューで390px幅の各カテゴリ件数（ウミガメ2・夜2・SUP4・セット6）、比較表からS1詳細・仮予約への遷移、S1→貸切ナイトへの変更、C6と日付の引き継ぎ、未公開プランが選択されず一覧が開くこと、キーボードで日付欄へ進めることを確認。実際の予約送信・通知は行っていない。


2026-10-31、[PR #55](https://github.com/umigame-kyoudai/umigame-kyoudai-site/pull/55)で集客元と予約経路を分離。受付GAS v39、解析GAS v10、Web本番へ反映。全予約の集計タブ（予約Spreadsheet gid `1171640408`）と分析側の月別表を更新。LINEリッチメニューの3本を計測付きに変更し、GBP予約URLは設定保存済み・公開反映未確認。[詳細・制限](dual-attribution-2026-10-31.md)。
