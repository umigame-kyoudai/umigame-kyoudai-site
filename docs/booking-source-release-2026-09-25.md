# 予約経由・ナイト予定の🥥表示 公開作業

2026-09-25。ユーザーから本番反映を明示依頼済み。既存Vercel継続の指定を適用する。

## 現在の状態

**2026-09-26: Web・受付GAS・管理GASの本番反映と公開確認が完了。専用リンクを案内できる状態。**

- Web実装コミット `cd666b7ae0b20d3d868d0a566fc1e40f9531dbcd` をGitHub main経由で公開。本番デプロイ `dpl_Fr5jEbrDK1WtgekpQ1Ayz8yUL8DR`（`umigame-kyoudai-site-bz6esnsk2-umigame-kyoudai.vercel.app`）のReadyと独自ドメインへの割当を確認。以降の公開記録更新はドキュメントのみ。

- 受付GASを **v34 → v36**、管理GASを **v22 → v23** へ更新。両方のアプリ版は `2026.09.26-1`。既存の公開URLと実行・アクセス設定を維持し、公開ソースの全文一致を確認した。
- 管理GASの既存v22（2026-09-13）の機能をRepositoryへ同期してから、集客経由の保存・表示・変更時の引き継ぎを加えた。古いv21への巻き戻しは行っていない。
- Vercel Productionと受付Script Propertiesへ同一の `BOOKING_SOURCE_SECRET` を設定し、値の一致を検証。秘密値はRepositoryや台帳に記録しない。
- 本番予約シートにAX〜AZの3列を追加。既存予約行の書き換えや経由の推測補完は行っていない。
- Google更新用アカウントは `info@umigamekyoudaimiyakojima.com`。Apps Script APIの設定による更新拒否は解消済み。
- 一時シート・一時Calendarで8パターンの受付から保存・予定作成までを実行し、経由と絵文字を確認。顧客へのLINE・メール通知は0件。検証用シート・Calendarは削除済み。
- 設定用の一時デプロイは削除済み。最終HEADと本番版に一時設定用コードが含まれていないことも確認した。

## 対応関係

| 対象 | 確認済みID・設定 |
| --- | --- |
| Web | Vercel `umigame-kyoudai/umigame-kyoudai-site` |
| 本番URL | `https://www.umigamekyoudaimiyakojima.com` |
| 受付の公開デプロイ | `AKfycbzXS_oPYVNBOr1uGZXgQ3rALb6BFn-in_Jzy5xruve5RptuuHQk1zLkqYhyKsU5NWPe` / v36（本番環境変数で確認） |
| 受付Script ID | `1GqvKTvucfFzmawSbu3koxzOQFdlf4tiOCA21fraD04jXFyVKxmrQNWRc`。所有者 `info@umigamekyoudaimiyakojima.com` |
| 管理Script ID | `11P8KtsmwzyeLdvWYOk6f01x1PE74MXCIKNUTQlozv_WXd0sxa3LLGfcH` |
| 管理の公開デプロイ | `AKfycby17YRSdptCSLdKmL9WqGuZLipEbnWJuTl8ezBU6uDauZEG5LlILFeke836oCeFtRPgrw` / v23 |
| 管理の実行・アクセス設定 | `USER_ACCESSING` / `ANYONE`。変更しない |
| 予約Spreadsheet | `1bPYur4Dfg3LxTCIiYzZvyZRT8bgLoYizG1B6LIkETKk`（Google APIの受付parentIdと一致） |
| Calendar | `genkidama2439@gmail.com`（実際の受付設定と一致。サービスへのアクセス確認済み） |

Googleのスクリプト一覧APIはシートに紐づく受付スクリプトを列挙しない。予約シートの「拡張機能 → Apps Script」で開く編集URLからScript IDを取得し、公開デプロイIDと照合する。

## 実装仕様

- `/from/souichiro` → `/plans/S3`。相対Locationを使い、プロキシ内のホスト名ではなく、開いたサイトのホストを維持する。
- `/from/yamachan`、`/from/umigame` → `/`。
- 最後に開いた有効な専用入口を優先。署名付きCookieとLINE復帰用の署名値を最大30日間保持する。通常の回遊で上書きしない。
- 担当ガイド・報酬用紹介コードとは独立して記録。Webと受付GASで署名と期限を確認する。
- 既存49列の末尾にAX「集客経由」、AY「集客入口」、AZ「集客経由取得日時」。既存データとの衝突時は停止する。
- そういちろう経由のS3/S5/C1/C2/C5/C6のナイト予定に🥥。他のナイト予定は従来どおり🦀。
- 管理画面の検索・詳細表示・予約変更・Calendar再作成・削除時の退避に経由を引き継ぐ。
- 旧予約を推測でそういちろう経由に変更しない。

## 運用・引き渡し

- そういちろうのInstagramに設定する入口は `https://www.umigamekyoudaimiyakojima.com/from/souichiro`。詳細ページ直URL `/plans/S3` だけでは新しい経由を付与しない。
- 山ちゃん専用入口は `/from/yamachan`、海亀兄弟の専用入口は `/from/umigame`。ナイト予定は従来どおり🦀。
- 担当スタッフをそういちろうに変更するだけでは🥥にならない。専用入口から取得した経由で判定する。
- 旧予約の経由は不明のまま保持する。`setupSheet()` や紹介制度の初期化を再実行しない。
- 次回もGoogleの現在のHEADと公開版を先に取得し、差分を照合してから同じデプロイIDを更新する。
- ロールバック基準は受付v34・管理v22・Web `907fc0c`。GASを戻す場合はWebも経由機能追加前へ戻し、片側だけ更新された状態を避ける。追加3列の既存値・署名鍵は消さない。

## 検証

- 250件の自動テスト成功。経由追加21件を含む。
- 相対リダイレクト変更後も経由21件成功。
- 本番用ビルド成功（型チェック・Lint込み）。
- PC・390px携帯幅で専用入口→S3詳細→予約フォーム、下書き復元、後から開いた山ちゃん入口への切替を確認。空のブラウザへの署名付き復帰URLからも経由が復元し、通常訪問には経由を付けないことを確認。実行時エラーなし。
- 実際のLINE認証・本番へのテスト予約送信は行っていない。
- Google隔離検証: S3のそういちろう・山ちゃん・通常入口、S5/C1/C2/C5/C6のそういちろう入口の計8件。必要な1〜3行とCalendar予定が保存され、そういちろうのナイト成分だけ🥥、通常ナイトは🦀となることを確認。
- 本番HTTPSで3つの専用入口の307応答、同一ホストの遷移先、受付GASと同一鍵による署名、Secure/HttpOnly/SameSite=Lax・30日Cookie、no-store、不明な入口の404を確認。
- 本番390px幅でナイトページの画像・CTA・横はみ出しなしを確認。「必要な機能のみ」を選んだ後も経由が保持され、予約フォームでS3選択・そういちろう経由を確認。実行時エラーなし。1365px幅で山ちゃん入口への切替とホーム表示も確認。新しいブラウザの詳細ページ直訪問には経由を付与しない。

作業用ブランチ: `release/booking-source-2026-09-25`。
本番用作業ディレクトリ: `umigame-kyoudai-site-source-release-20260925`。
秘密値とGoogle公開版の作業用バックアップは、このMacのアクセスを制限した一時ディレクトリで管理し、Gitに含めない。
