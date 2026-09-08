# 2026-09-08 本番反映・動作確認

ユーザーの「実行して」を受け、修正コミット`d6214e6f782d6d598562c84b6f7bd09251d3d651`を`main`へ反映した。

## サイト

- 本番URL: https://www.umigamekyoudaimiyakojima.com
- Vercel: `umigame-kyoudai/umigame-kyoudai-site`、Production、**Ready**。
- 修正コードのデプロイ: `dpl_2tQV51N9vKc81DborYWqzEueoP4b`。
- デプロイURL: https://umigame-kyoudai-site-2rghx05u5-umigame-kyoudai.vercel.app
- 本番ビルド42秒、2026-09-08 20:40 JSTに完了。本番ドメインへの割り当てをCLIで確認した。
- CLIは`npx --yes vercel@59.11.7`を使用。既存のグローバルCLIは変更していない。

## 管理GASの起動エラーを修復

公開版20では`App.html`の末尾323文字が欠け、`escapeHtml`の途中で終わっていた。「App.htmlが読み込まれていません」と表示され、起動できなかった。

欠けた末尾だけを補完し、全文75,566文字・チェックサムがリポジトリの検証済み`App.html`と一致することを確認して保存した。既存の公開URLを維持し、**版21（2026-09-08 20:46 JST）**へ更新した。アプリのソース版は引き続き`2026.09.08-1`。

受付は**版34（2026-09-08 19:58 JST）**で、公開URLがVercelの`GAS_BOOKING_URL`と一致することを確認した。受付`Code.gs`、管理`Code.gs`・`Index.html`・`Styles.html`・修復後`App.html`は、エディタ内の全文について文字数とFNV-1aチェックサムをローカルファイルと照合した。両GASのSheetsサービスも確認した。マニフェストには、ローカルの設定に加えてGoogle側のデプロイ設定`webapp`が含まれる。

## 本番で確認できたこと

| 確認 | 結果 |
|---|---|
| 4言語のトップ・予約ページ計8ページ | すべてHTTP 200 |
| 登録外の継承キー3種類のクーポン | すべて無効、割引0円 |
| 前後に空白のある有効クーポン | 正しい割引額 |
| 予約APIのnull・配列・存在しない日付・不正月 | 4ケースともHTTP 400 |
| 受付GASへ不正な金額を直接送信 | 最新版の検証エラーを返し、予約作成なし |
| 日本語フォームの再読み込み | S2・変更後の日付・09:00を維持 |
| 英語・韓国語・繁体字フォームの再読み込み | S5・変更後の日付・19:20を維持 |
| URLの付帯情報 | プラン・日付を更新し、UTMとハッシュを維持 |
| 管理GASの起動 | 予約一覧56件を表示し、起動エラーが解消 |
| 管理GASの紹介画面 | 既存の紹介成果を表示。初期設定の再実行は不要 |

ブラウザの日付欄への`fill`はReactの変更処理を発火しなかったため、ネイティブの日付欄にArrowUpを入力して変更・復元を確認した。確認用の日付は`2099-12-10`から`2100-12-10`へ変更した。フォームの実送信はしていない。

## 解析保存エラーの追加修復

その後の「解決して」を受け、解析APIに安全な拒否理由ログを追加し、GASの`ScriptLock.tryLock(10000)`による`busy`を特定した。解析GASをSheets APIの追記へ変更し、**版8（2026-09-08 21:23 JST）**へ更新した。詳細と本番保存確認は[解析復旧記録](analytics-recovery-2026-09-08.md)を参照。

## 確認の限界

実予約の作成、顧客予約の変更・削除、Googleカレンダーの書き換え、実LINE・メール送信は実施していない。同時書き込み、復旧、LINEプレビューの連続操作は既存のローカルテストで検証済みで、本番での一連の操作は未検証。

当初、アクセス解析の`/api/analytics/events`では`analytics_webhook_rejected`による502を確認した。修正前のデプロイ`dpl_3pMr3Z85XfKMU8oJwDzTqXWnhpca`でも直近24時間の取得上限50件すべてに同じエラーがあり、今回の反映前から発生していた。この保存拒否は上記の追加作業で修復した。過去に保存されなかったイベントの補完はしていない。

本番環境変数をCLIで確認した際、Sensitive指定の解析URL・共有秘密は取得不可だった。値の変更や秘密情報の再生成は行っていない。

検証ログは`/tmp/umigame-production-check.json`、`/tmp/umigame-production-gas-check.json`、`/tmp/umigame-production-build.log`、`/tmp/umigame-production-errors.jsonl`、`/tmp/umigame-previous-production-errors.jsonl`に保存した。
