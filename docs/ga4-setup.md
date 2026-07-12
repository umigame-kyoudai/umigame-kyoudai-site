# GA4 設定と分析ガイド（海亀兄弟）

サイトの計測イベントは Vercel Analytics（Hobbyプランのためイベント閲覧不可）と
**GA4** の両方に送っている。細かい分析は GA4 側で行う。

## プロパティ情報（間違い注意）

| 項目 | 値 |
|---|---|
| アカウント | こめっち事業サイト（400760759） |
| プロパティ | **海亀兄弟（545077037）** |
| 測定ID | `G-Y23LDGNJXY`（Vercel 環境変数 `NEXT_PUBLIC_GA_MEASUREMENT_ID`、Production のみ） |

⚠️ **同じアカウントに「宮古レジン」「スペースイナダ」プロパティもある。**
GA4 の画面は最後に開いたプロパティを表示するので、作業前に左上が「海亀兄弟」か必ず確認する。
宮古レジンのサイトも同型のイベント（reservation_click 等）を送っており、画面だけでは見分けがつかない。

## GA4 に流れるイベント一覧（コード: `lib/analytics.ts`）

| GA4イベント名 | 意味 | 付くパラメータ |
|---|---|---|
| `reservation_click` | 予約CTAクリック（予約意図） | location, plan_id |
| `booking_form_view` | 予約フォーム表示 | locale, line_logged_in, lead_source |
| `line_login_click` | フォームのLINEログイン押下 | location |
| `generate_lead` | **予約送信成功（本コンバージョン）** | value（予約金額）, currency, plan_id, plan_name, locale, headcount, lead_source |
| `booking_failed` | 予約送信失敗 | locale, plan_id, lead_source |
| `line_click` | LINE相談クリック | location, plan_id |
| `line_add_friend_click` | 友だち追加クリック | location |
| `phone_click` | 電話タップ | location |

- `location` = ボタンの場所（hero / navbar / plan_card / plan_detail / footer / blog など）
- `lead_source` = UTM由来の流入元ラベル（`line/richmenu`, `instagram/profile`, `ref:www.google.com`, `direct`）。
  GA4標準の「セッションの参照元」と違い、LINEアプリ内ブラウザ経由でも UTM を貼っていれば判別できる
- ページ情報（どのページで起きたか）は GA4 が全イベントに自動で付ける（ページパス）ので登録不要

## 管理画面で1回だけやる設定（すべて「海亀兄弟」プロパティで）

### 1. カスタムディメンション（管理 → データの表示 → カスタム定義）

「カスタムディメンションを作成」で以下を登録。**範囲はすべて「イベント」**。
これをしないと上のパラメータが標準レポート・探索で集計できない。

| ディメンション名 | イベントパラメータ |
|---|---|
| Location | `location` |
| Plan ID | `plan_id` |
| Plan Name | `plan_name` |
| Lead Source | `lead_source` |
| Locale | `locale` |
| LINE Logged In | `line_logged_in` |

同じ画面の「カスタム指標」タブで1つ登録（合計・平均人数を出せるようにする）:

| 指標名 | イベントパラメータ | 単位 |
|---|---|---|
| Headcount | `headcount` | 標準 |

※ `value`（予約金額）は GA4 組み込みの「イベント値」なので登録不要。
※ 過去に案内のあった `button_name` / `link_url` / `page_url` はこのサイトでは**使っていない**ので登録しない。

### 2. キーイベント（管理 → データの表示 → イベント）

イベント名の左の☆をクリックして★にする:

- `reservation_click`（予約意図）
- `generate_lead`（予約送信成功。**初予約がGA4に届いてから一覧に出る**ので、出たら★を付ける）

### 3. データ保持（管理 → データの収集と修正 → データの保持）

イベントデータ: 2か月 → **14か月** に変更して保存。

### 4. Search Console 連携（管理 → サービス間のリンク設定 → Search Console のリンク）

「リンク」→ umigamekyoudaimiyakojima.com の Search Console プロパティを選択 →
ウェブストリーム「海亀兄弟 公式サイト」→ 送信。
連携後、「レポート」に Search Console セクションを出すには レポート → ライブラリ →
Search Console コレクションを「公開」する。

## 分析レシピ（探索 = 左メニューの虫眼鏡アイコン）

カスタム定義の登録**後**に届いたデータから使える（登録前のデータには効かない）。
設定変更の反映には最大48時間かかる。すぐ確認したいときは「リアルタイム」か DebugView。

- **予約ファネル**: 探索 →「目標到達プロセスデータ探索」でステップを
  `reservation_click` → `booking_form_view` → `line_login_click` → `generate_lead` の順に設定。
  どこで一番離脱しているかが一目で分かる。内訳に `LINE Logged In` を入れると
  LINE未ログインが障壁になっているかを検証できる
- **どのボタンが仕事しているか**: 自由形式で 行=`Location`、値=イベント数、
  フィルタ=イベント名 `reservation_click`
- **流入元別の予約数・予約金額**: 行=`Lead Source`、値=イベント数＋イベント値、
  フィルタ=`generate_lead`（クリック段階で見るなら `reservation_click`）
- **プラン別の人気と単価**: 行=`Plan Name`、値=イベント数・イベント値・`Headcount`、
  フィルタ=`generate_lead`
- **どのページが予約を生むか**: 行=ページパス＋クエリ文字列、値=イベント数、
  フィルタ=`reservation_click`。SEO記事・料金ページの貢献度が見える
- **言語別（ja/en/ko/zh-tw）**: 行=`Locale`、フィルタ=`generate_lead` または `booking_form_view`
- **検索キーワード**: Search Console 連携後、レポート → Search Console →「クエリ」

## 実装メモ

- 転送コードは `lib/analytics.ts`。個人情報の混入防止のため **`GA_PARAM_KEY` の許可リストに
  あるキーだけ** GA4 に送る。パラメータを増やしたらこの表とカスタム定義の両方に追加する
- Vercel 側のイベント名（`book_cta_click` 等）は集計の連続性のため変えない
- 開発環境では `window.gtag` が未定義のため GA4 送信は自動でスキップされる
