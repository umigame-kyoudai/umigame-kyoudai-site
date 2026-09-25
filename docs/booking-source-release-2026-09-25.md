# 予約経由・ナイト予定の🥥表示 公開作業

2026-09-25。ユーザーから本番反映を明示依頼済み。既存Vercel継続の指定を適用する。

## 現在の状態

**実装・検証済み、本番の切替は未実施。予約受付GASのScript ID／編集URLの確認待ち。**

- 本番Webはナイトページ公開コミット `907fc0c`。`/from/souichiro` はまだ本番で案内しない。
- Vercelの既存Production環境に `BOOKING_SOURCE_SECRET` を機密値として追加済み。旧コードには影響しない。まだ受付GASに設定していない。
- Google Apps Script更新用の接続はユーザーが完了。アカウントは `info@umigamekyoudaimiyakojima.com`。
- 管理GASの実際の公開版は **v22（2026-09-13）**。過去の台帳のv21は古い情報だった。HEADもv22と一致。コード・HTML・公開設定をバックアップし、Repository側に既存版を同期した（`554d0f5`）。
- 管理GASの既存機能をそのまま維持し、集客経由の保存・表示・変更時の引き継ぎだけを加えた。
- 受付GASの候補差分はRepositoryの既存版から抽出済み。**実際の公開版との比較はまだできていないため、そのまま上書きしない。**
- 本番シート、カレンダー、GASのソース・デプロイは未変更。顧客への通知も送信していない。

## 対応関係

| 対象 | 確認済みID・設定 |
| --- | --- |
| Web | Vercel `umigame-kyoudai/umigame-kyoudai-site` |
| 本番URL | `https://www.umigamekyoudaimiyakojima.com` |
| 受付の公開デプロイ | `AKfycbzXS_oPYVNBOr1uGZXgQ3rALb6BFn-in_Jzy5xruve5RptuuHQk1zLkqYhyKsU5NWPe`（本番環境変数で確認） |
| 受付Script ID | **未確認。ユーザーに編集画面URLを確認中** |
| 管理Script ID | `11P8KtsmwzyeLdvWYOk6f01x1PE74MXCIKNUTQlozv_WXd0sxa3LLGfcH` |
| 管理の公開デプロイ | `AKfycby17YRSdptCSLdKmL9WqGuZLipEbnWJuTl8ezBU6uDauZEG5LlILFeke836oCeFtRPgrw` / v22 |
| 管理の実行・アクセス設定 | `USER_ACCESSING` / `ANYONE`。変更しない |
| 予約Spreadsheet | `1bPYur4Dfg3LxTCIiYzZvyZRT8bgLoYizG1B6LIkETKk`（既存文書に記載。受付実環境との最終照合は未実施） |
| Calendar | `genkidama2439@gmail.com`（既存コードの設定。実環境との最終照合は未実施） |

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

## 次の公開手順

1. 受付編集URLからScript IDを取得。現在の公開デプロイ、シート、Calendarを照合し、HEADと公開版をバックアップする。
2. 受付の実際の公開版に今回の経由差分だけを重ね、既存の変更を失わないことを確認する。
3. Webと受付Script Propertiesに同一の `BOOKING_SOURCE_SECRET` を設定する。コード・Git・台帳には秘密値を記録しない。
4. AX〜AZが空または所定の経由列であることを確認し、追加する。`setupSheet()` や紹介制度の初期化は実行しない。
5. 管理・受付を既存デプロイURLのまま更新。顧客通知を送らない隔離環境で実サービスの保存・Calendar表示を確認する。
6. 一時的な設定・検証用コードやデプロイを使用した場合は削除し、最終公開版に残っていないことを照合する。
7. 検証済みWebをGitHub main経由で既存Vercelへ公開。専用入口の応答・Cookie・経由引き継ぎと通常予約ページを確認する。
8. 反映完了後にユーザーへ `https://www.umigamekyoudaimiyakojima.com/from/souichiro` を渡す。

## 検証

- 250件の自動テスト成功。経由追加21件を含む。
- 相対リダイレクト変更後も経由21件成功。
- 本番用ビルド成功（型チェック・Lint込み）。
- PC・390px携帯幅で専用入口→S3詳細→予約フォーム、下書き復元、後から開いた山ちゃん入口への切替を確認。空のブラウザへの署名付き復帰URLからも経由が復元し、通常訪問には経由を付けないことを確認。実行時エラーなし。
- 実際のLINE認証・本番へのテスト予約送信は行っていない。

作業用ブランチ: `release/booking-source-2026-09-25`。
本番用作業ディレクトリ: `umigame-kyoudai-site-source-release-20260925`。
秘密値とGoogle公開版の作業用バックアップは、このMacのアクセスを制限した一時ディレクトリで管理し、Gitに含めない。
