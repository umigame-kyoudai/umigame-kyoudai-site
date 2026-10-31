# AIサービス別の流入表示

2026-10-31。予約メールと「かんたんレポート」で、紹介元のAIサービス名を分けて表示する。

## 判別方法

| 表示名 | 参照元ドメイン | UTM Sourceの別名 |
| --- | --- | --- |
| ChatGPT | `chatgpt.com`, `chat.openai.com` | `chatgpt`, `openai` |
| Claude | `claude.ai` | `claude`, `anthropic` |
| Gemini | `gemini.google.com`, `bard.google.com` | `gemini`, `google_gemini`, `bard` |
| Perplexity | `perplexity.ai` | `perplexity` |
| Copilot | `copilot.com`, `copilot.microsoft.com`, `copilot.cloud.microsoft` | `copilot`, `microsoft_copilot`, `bing_copilot` |
| Grok | `grok.com` | `grok` |
| DeepSeek | `chat.deepseek.com` | `deepseek` |

UTM Sourceにもドメイン名を使用できる。大文字小文字・末尾のドットを正規化し、ドメインは一致または実際のサブドメイン境界で比較する。UTMがあれば参照元より優先する。

Geminiを一般のGoogle検索より先に判定する。通常のGoogle/Bing/XのアクセスをAIと推測しない。`openai.com`・`anthropic.com`など企業サイトの参照元や、名前にcopilotを含むだけの無関係なドメインもAIと認定しない。

予約メールの例：

```text
【流入経路】
媒体：Gemini
掲載場所：判別できません
紹介者の専用リンク：記録なし
判定根拠：参照元ドメイン（gemini.google.com）
```

「かんたんレポート」のAI内訳は上位4種類の制限を外し、記録のあるサービスをすべて表示する。閲覧記録がなく予約時だけ記録されたサービスも内訳に残す。集計キャッシュの版を更新し、既に保存されたUTM・参照元も再分類する。生イベントや過去の予約行・メール本文は書き換えない。

## 確認

- 既存本番エディタ全文とRepository基準コードの一致を、予約GAS・分析GASの両方で確認してから変更。
- `npm test`: 353件成功。7サービスのUTM・参照元、類似ドメインの除外、Googleとの分類順、メールと分析の分類一致、7種類の内訳、旧キャッシュ無効化を検証。
- Gemini参照元とClaudeタグ付きリンクについて、通常・昼夜・海空・まるごと1日セットのAPI→GAS→メール本文・台帳・Calendarの引継ぎを検証。外部サービスは模擬化し、実予約・実メール・LINEは送信しない。
- 本番保存後のソース全文一致：予約143,060文字、分析83,960文字。

## 運用上の限界

分かるのはAIサービス名で、内部のモデル名・版ではない。参照元とUTMが渡らないアクセス、計測未同意、別ブラウザへの移動等で元情報がない場合は復元できず「不明」のまま。過去の不明分を推測で分類しない。一般の媒体保持・同意条件は[メール調査記録](traffic-source-email-audit-2026-10-31.md)のとおり。

## 本番反映

予約GAS：2026-10-31 17:04 JST、既存の公開デプロイID・URL・実行者・アクセス設定を維持し、版37から版38（アプリ版`2026.10.31-2`）へ更新。Googleの成功表示を確認。旧版は`apps-script/umigame-reservation-admin/archive/Code.2026-10-31.before-ai-sources.gs`に保存。以降に生成される通知へ適用する。

分析GAS：同じ所有アカウントの既存プロジェクトへ保存し、`refreshSimpleReport`を実行（17:03:43開始、17:06:52正常終了）。時間主導型トリガーは保存コードを使うため、イベント受信用ウェブアプリの版9・公開URLは維持する。初期設定関数やトリガー追加は実行しない。

再集計後の本番シートを読み戻し、月別の人数・閲覧回数・予約件数・参加人数・金額が更新前と一致すること、説明文と更新時刻が変わったことを確認。現在記録されているAI内訳はChatGPTのみで、その他のサービスの架空行は追加していない。

本番の新規予約やメール受信までは試験していない。予約メールは模擬化した結合テスト、本番反映は保存全文一致・デプロイ成功で確認した。
