# サイト診断の改善・第1弾

2026-10-30。状態: ローカル実装・検証済み。本番未反映。

元の診断: https://chatgpt.com/space/page_e5349cc045d881918a1985ed40f6c383

作業ブランチ: `codex/audit-safe-fixes`。開始時の main: `dfa229d644c93cf1de58cc620f1ed61cf1012876`。

## 今回の7項目

| 診断番号 | 修正内容 | 対象 |
| --- | --- | --- |
| 16 | 選択した開始時間を読み上げへ伝える。セットの昼・夜は別々のグループとする。外国語のプラン・指名にもグループ名と選択状態を追加 | `components/booking-time-slots.tsx`、`components/booking-form.tsx`、`components/booking-form-intl.tsx` |
| 17 | 人数の増減ボタンに「大人を1人増やす」等の名前を追加。変更後の人数も通知 | `components/booking-form.tsx` |
| 18 | 日本語・英語・韓国語・繁体字のクーポン欄と説明文を関連付け | `components/booking-form.tsx`、`components/booking-form-intl.tsx` |
| 19 | 日本語の全14プランで、キーボード操作中の選択枠に輪郭を表示 | `components/booking-form.tsx` |
| 24 | 英語・韓国語の「悪天候で中止したら全額返金」を、既存の当日払いに合わせて「料金は発生しない」に統一 | `lib/i18n/en.ts`、`lib/i18n/ko.ts` |
| 25 | 受付前プランの検索用データを `PreOrder` から `OutOfStock` へ変更。先行予約を受け付けているという誤表示をなくす | `components/json-ld.tsx` |
| 34 | 共有画像への一律1200×630指定を廃止。寸法確認済みの共通画像だけ指定を維持し、個別画像では任意の寸法項目を省略 | `lib/seo.ts` |

番号25はHTML内の検索向け表現だけの変更。プランの状態、予約可能日、時間枠、在庫は変更していない。番号24も料金・キャンセル条件自体の変更ではない。

## 検証

- `npm test`: 既存296件すべて成功。外部サービスは既存テストのモックを使用。
- ESLint: `app components lib --no-cache`、エラー・警告なし。
- TypeScript: `tsc --noEmit --incremental false`、成功。
- `NEXT_TELEMETRY_DISABLED=1 npm run build`: 成功。104ページ生成。
- ビルド後のサイトをChromeで確認。402×760・1440×900、4言語の予約画面で横へのはみ出しなし。
- 日本語: 時間ボタンのクリック・Space、14プランのフォーカス表示、矢印キーでのプラン変更、人数の増減、昼夜セットの独立した選択を確認。
- S1で大人1人＋子供1人が12,500円、子供を減らすと6,500円。ナイトで3歳以下を増やしても合計が変わらないことを確認。
- 外国語: プラン・時間・指名の選択状態が更新され、クーポン欄に各言語の読み上げ名が付くことを確認。
- axe-coreの対象ルール（label、button-name、aria-valid-attr-value、aria-allowed-attr、aria-input-field-name）は4言語で違反0。全項目の適合を意味しない。
- トップ・S1・S3・受付前プラン・ブログ一覧の生成HTMLを確認。受付前のみ `OutOfStock`、受付中プランは従来どおり。共通OG画像の寸法は維持、個別画像の誤った寸法指定はなし。
- ブラウザ操作は予約・クーポンAPI、計測先、POST等を開く前から遮断。予約・クーポンAPIの呼び出し、変更リクエストとも0件。

画像でもスマホのフォーカス枠と人数欄を確認。詳細証跡は作業端末の `/tmp/umigame-safe-fixes-20261030/` に保存（恒久保存先ではない）。テスト・ビルド等のログは `/tmp/umigame-safe-fixes-*.log`。

## 今回の範囲外

本番公開、外部サービスの設定、予約送信、クーポン適用、LINEログイン、GAS、料金・参加条件・在庫、パッケージ追加・更新は実施していない。検証用ビルドには本番のLINE環境を追加せず、LINE認証と通知の動作は今回の確認対象外。実機iPhoneや実際のスクリーンリーダーによる音声確認も未実施。

重大な依存部品の更新、GASの認証、予約通信や入力検証の変更は、別の変更として互換性・外部の公開版・運営条件を確認して進める。今回の7項目だけで、診断全体の安全性や点数が解決したとは扱わない。

参考仕様: [WAIのボタンの選択状態](https://www.w3.org/WAI/ARIA/apg/patterns/button/)、[Googleの販売状態の定義](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)、[Open Graphの任意の画像寸法](https://ogp.me/)。
