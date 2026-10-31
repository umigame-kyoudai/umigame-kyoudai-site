# 大元の集客元と予約経路の分離

更新日: 2026-10-31

## 記録するもの

- `trafficAttribution.originSource`: お客様の回答を優先し、未回答は同意後にこのブラウザで最初に計測したサイト入口（90日）。実際に最初に認知した媒体を完全に証明するものではない。
- `originEvidence`: `reported`（お客様回答）、`first_observed`（初回サイト流入）、`unknown`。
- `routeSource` / `routeMedium` / `routeEvidence`: 今回サイトへ入った経路とリンクの場所・根拠。例：LINE／リッチメニュー → 公式サイト。LINEログインと内部CTAは新しい入口に数えない。
- 同意なしは自動取得・保存をしない。任意の回答は予約情報としてメール・台帳へ保存する。
- 最初の観測がLINEや直接・不明の場合、LINE以前の大元は不明。別ブラウザに移った場合も推測しない。旧last-non-direct記録を初回流入へ変換しない。
- Googleの参照元ドメインだけでは検索とマップを区別せず「Google（検索・マップ等）」。GBPタグとお客様回答では区別する。
- AIはChatGPT / Claude / Gemini / Perplexity / Copilot / Grok / DeepSeekを区別する。参照元やタグがないAI経由を自動特定することはできない。

## メール・台帳

メール冒頭を「集客元・予約経路」に変更。根拠を併記し、署名付き紹介者の専用入口は独立した項目のまま残す。台帳の既存52列は維持し、備考に読みやすい説明と固定コード `[traffic-v1]` を追記。Calendarにも同じ説明を残す。単品・昼夜・海空・トリプルを対象とする。

「集客元・予約経路集計」タブは予約一覧全体を受付月・集客元・予約経路・根拠・場所で集計する。分析同意のない予約を含み、セット分割行は予約番号で1件。キャンセル・満席は差し引かない。解析GASの既存の毎朝6時台更新で再集計する。新たなトリガー権限は追加しない。旧予約の大元と直前経路は不明。

## 行動分析

イベント表の末尾BS:BXへ6列を追加し、既存70列を保持。`upgradeTrafficAttributionColumns` は既存ヘッダーと追加先の衝突を検証し、末尾だけ更新する。`setupAnalyticsWorkbook` は実行しない。

かんたんレポートに、大元・予約経路・組み合わせ・根拠の月別表を追加する。従来のlast-non-direct表は「参考」と明記。こちらの表は従来どおり分析同意したイベントのみ。全予約の集計は予約台帳の新しいタブを使用する。

## 検証

370テスト成功、lint・production build成功。初回Instagram→LINE、LINE初回→自己申告、認証復帰、内部CTA、直接再訪、保存期限、同意拒否、別ブラウザ、分類の同一性、API→GASメール/台帳/Calendar、セット分割の重複除去、解析の6列追記・再実行・衝突拒否・各表の合計一致を検証した。外部送信は模擬化し、実予約・実メール・実LINE通知は送信していない。

## 公開手順・状況

[PR #55](https://github.com/umigame-kyoudai/umigame-kyoudai-site/pull/55) をマージし、Web本番（`ae6582a`）のVercel成功とHTTPSフォーム表示を確認した。

- 予約GAS: v39、`2026.10.31-3`、17:45 JST。既存デプロイID・URL・実行者・アクセス設定を維持。保存ソースを全文照合。
- 解析GAS: v10、`2026-10-31-dual-attribution`、17:47 JST。既存URLと権限を維持。公開GET応答でも版を確認。末尾BS:BXの6列を17:45:55–17:45:57に移行。
- `refreshSimpleReport`: 17:46:14–17:49:57に成功。全予約の集計と、分析同意済みイベントの4種類の月別表を読み戻して確認。見切れた見出し2か所は保存HEADと表で短縮済み（イベント受信処理はv10のまま）。
- 本番 `/api/analytics/events` に、予約を作らないテスト用page_viewを1件送信。`accepted: true`、行57537で `instagram / reported / line / tag / richmenu` の分離保存を確認。`deployment-check` と `/__dual-attribution-check` により通常集計から除外される。実予約・メール・LINE送信は0件。
- HTTPSプレビューを390px設定（実コンテンツ幅375px）で確認。横あふれなし、質問は任意、選択した回答は再読み込みで復元。本番でも同じ22選択肢・任意設定の表示を確認。

集計先：

- 全予約：[予約台帳の集客元・予約経路集計](https://docs.google.com/spreadsheets/d/1bPYur4Dfg3LxTCIiYzZvyZRT8bgLoYizG1B6LIkETKk/edit#gid=1171640408)
- 行動分析：[かんたんレポート](https://docs.google.com/spreadsheets/d/1PvNgEYQTtKSxyQgao6jPrXPv-5p9R04CWyxqSeKKPDI/edit#gid=508414902)

## 外部リンクの設定

- LINE公式 `@321hppup` の公開中リッチメニュー（17513226）：Aスタッフ、B予約、D FAQの3URLに `utm_source=line&utm_medium=richmenu` を付与し、保存後の「現在の表示」で確認。C口コミ・E連絡先・F観光サイトは維持。
- GBPの別枠「予約URL」に `?utm_source=gbp&utm_medium=booking` を設定・保存し、再度編集画面を開いて保存値を確認。設定保存直後のGoogle検索の公開リンクは旧URLのままで、公開反映は未確認。検索内の埋め込み編集画面が白紙だったため、実際にDOMへ表示された編集iframe URLを直接開いて操作した。
- GBPの既存Webサイトとアクティビティ用タグは維持。
- LINEビジネスプロフィールのプラン一覧には、この作業前から未公開変更がある。別の変更まで公開しないため、今回は編集・公開していない。参照元・タグが渡らない入口では予約経路が不明になる可能性がある。

ロールバック時は旧予約GASとWebを戻せる。追加6列と集計タブは削除せず保持でき、旧解析コードは既存70列だけを書き込む。旧記録から大元を復元しない。
