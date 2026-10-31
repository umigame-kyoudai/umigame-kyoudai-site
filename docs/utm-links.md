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
| Googleビジネスプロフィール：予約リンク | `https://www.umigamekyoudaimiyakojima.com/?utm_source=gbp&utm_medium=booking` |
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

1. **予約メール**：冒頭の「大元の集客元」「予約経路」「それぞれの根拠」を見ます。例：Instagram（お客様回答）／LINE・リッチメニュー → 公式サイト。紹介者の署名付き専用入口は別項目に残します。
2. **全予約の集計**：[予約台帳の「集客元・予約経路集計」](https://docs.google.com/spreadsheets/d/1bPYur4Dfg3LxTCIiYzZvyZRT8bgLoYizG1B6LIkETKk/edit#gid=1171640408)。解析同意なしも含み、セット分割行は予約番号で1件。キャンセル・満席は差し引かない受付件数です。毎朝6時台更新。
3. **行動分析**：[かんたんレポート](https://docs.google.com/spreadsheets/d/1PvNgEYQTtKSxyQgao6jPrXPv-5p9R04CWyxqSeKKPDI/edit#gid=508414902)に大元・予約経路・組み合わせ・根拠を月別表示します。こちらは分析同意したイベントだけです。
4. 従来の`source`プロパティ・`[流入元]`は「最後に記録された流入」の参考値です。新しい大元・今回の入口と混同しないでください。

## 仕組みメモ（技術）

- `lib/traffic-attribution.ts` が、同意後の初回サイト入口（90日・このブラウザ）と今回の入口を分離保存。最初の観測がLINE／直接・不明なら、それ以前の大元は不明。旧last-non-direct記録は大元へ転用しません。
- ja/en/ko/zh-twの任意回答があれば、大元にはその回答を優先し「お客様回答」と明記。回答は同意の有無に関係なく予約情報へ保存します。
- フォームが`trafficAttribution`を予約APIへ渡し、APIが備考へ説明と固定コードを追記。受付GAS v39のメール冒頭、台帳、Calendarへ反映。
- 解析は`traffic_version / origin_source / origin_evidence / booking_route / route_evidence / route_medium`を別々に保存。
- お客様向けLINE通知には掲載しません。実装・公開状況は[分離記録](dual-attribution-2026-10-31.md)を参照。

2026-10-31：LINEリッチメニューのスタッフ／予約／FAQリンクはタグ付きで公開設定を確認済み。GBPの別枠予約URLはタグ付きで保存済み、Google検索での公開反映は未確認。LINEビジネスプロフィールの未公開変更は今回公開していません。
