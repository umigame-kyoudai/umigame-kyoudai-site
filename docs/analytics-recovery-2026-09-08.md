# 2026-09-08 アクセス解析の保存エラー復旧

## 原因と修正

本番の`/api/analytics/events`で発生していた502は、解析GASが`busy`を返していたことが原因だった。`Sheet.appendRow`を`ScriptLock.tryLock(10000)`で直列化していたため、複数イベントの同時送信で待機が10秒を超えると保存を拒否していた。

従来のAPIはGASの拒否理由をすべて`analytics_webhook_rejected`へ置き換えていた。APIに、許可したエラーコード・上流HTTPステータス・所要時間だけを記録するログを追加した。共有秘密、イベント本文、利用者識別子、任意の上流エラーメッセージはログへ出さない。解析APIへ`null`や配列が届いた場合も、例外ではなく400で拒否する。

GASは通常の保存をGoogle Sheets API v4の`appendCells`へ変更した。Sheets側で最終行の後への追加を実行するため、アプリ側で空き行番号を予約せず、書き込みをScriptLockで直列化しない。初回の空シートへのヘッダー作成だけはロック内で行い、flush後に解放する。保存結果が不明な失敗は自動再送しない。

既存の70列を維持し、日時はシートのタイムゾーンとミリ秒精度を保つ日付シリアル値、数値はnumberValue、真偽値はboolValue、文字列はstringValueとして保存する。入力文字列は数式として評価しない。

仕様確認: [AppendCellsRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#AppendCellsRequest)、[Sheets APIの一括更新](https://developers.google.com/workspace/sheets/api/guides/batch)。

## 本番反映

- サイトAPI: コミット`16c8c03`、Vercel Production `dpl_7fsVRzjQyuyEiALGMf5AoNjiCe3V`、Ready。本番ドメイン経由でテストした。
- 解析GAS: 「海亀兄弟 顧客・行動分析レポート」。既存デプロイを**版8（2026-09-08 21:23 JST）**へ更新した。
- 更新ファイル: `apps-script/umigame-analytics/Code.gs`と`appsscript.json`。Sheets v4サービスを有効にし、既存のOAuthスコープを維持した。
- エディタから全文を読み戻し、最終`Code.gs`が49,097文字、FNV-1aが`1550938900`でローカルと一致することを確認した。マニフェストも読み戻して照合した。
- 公開URL、保存先スプレッドシート、共有秘密は変更していない。初期設定関数や秘密の生成関数も実行していない。
- GETの版表示: `2026-09-08-atomic-append`。`configured`は保存先IDの設定有無を表す。

## 検証結果

| 確認 | 結果 |
|---|---|
| 修正前・単発送信 | 1件成功、約3秒 |
| 修正前・8件同時送信 | 4件成功・4件502。運用ログで`busy`を確認 |
| 修正後・版7で8件同時送信 | 8件すべてHTTP 200、accepted: true。約2.5〜17.8秒 |
| 最終版8で8件同時送信 | 8件すべてHTTP 200、accepted: true。約2.3〜42.3秒 |
| 保存先の読み戻し | 修正後の各8件が、パス・Visitor ID・Visit ID・検証マーカー一致で1行ずつ保存され、重複なし |
| 日時・型 | 最終8行のミリ秒精度、日付型、金額0の数値型、falseの真偽値を確認 |
| 本番エラーログ | 最終版の検証後に取得した直近5分のエラーログは0件 |
| ローカル検証 | 全229件成功。最終の日時精度調整後もGASの関連6件成功。API変更のlint・TypeScript検査も成功 |

検証用イベントは個人情報を含まない合成データで、`/__analytics_check`配下と専用UTMを使用した。保存された全21行（単発1・修正前4・版7の8・版8の8）の識別子を送信データと照合し、`イベントデータ!A26328:BR26348`だけを削除した。既存の26,327行と末尾3行が元の状態で残っていることを読み戻して確認した。

予約の作成・変更、カレンダーの変更、LINE・メール送信は実施していない。過去に保存されなかったイベントの補完もしていない。今回の検証は8件同時送信までであり、APIの外部障害や上限超過時まで保存を保証するものではない。

一時検証記録は`/tmp/umigame-analytics-probe.json`、`/tmp/umigame-analytics-before-burst.json`、`/tmp/umigame-analytics-after-burst.json`、`/tmp/umigame-analytics-final-burst.json`、`/tmp/umigame-analytics-tests.log`、`/tmp/umigame-analytics-final-errors.jsonl`に保存した。
