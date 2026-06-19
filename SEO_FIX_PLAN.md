# SEO Fix Plan

Audit date: 2026-06-19 JST  
Goal: 公開・運用前にSEO、表示速度、スマホUX、予約率、信頼性を落とさず安全に改善する。

## 方針

- 予約導線は壊さない。
- デザインの大きな作り替えはしない。
- まずは「表示の矛盾」「信頼性」「構造化データ」「FAQ」「軽いアクセシビリティ」を直す。
- その後に画像圧縮、クライアントJS削減、Lighthouse実測へ進む。
- 数値訴求は必ず根拠確認後に扱う。根拠がない場合は文言を弱める。

## Day 1: 公開前に必ず直す安全修正

### 1. 予約フォームのS5年齢制限矛盾を修正

- 対象ファイル
  - `components/booking-form.tsx`
  - `lib/plan-price-display.ts`
- 作業
  - `selectedPlan !== "S3"` で年齢制限警告を出す条件をやめる。
  - `S3` と `S5` は3歳以下無料対象として扱う。
  - プラン切り替えで3歳以下不可プランになったら `under3Count` を0に戻す。
- 確認
  - `/book?plan=S5` で「3歳以下無料」が矛盾なく出る。
  - `/book?plan=S1`, `/book?plan=C1`, `/book?plan=C2` では5歳以上制限が出る。
  - `npm run build`
  - `npx tsc --noEmit --pretty false`

### 2. 口コミ/実績/遭遇率の根拠確認

- 対象ファイル
  - `components/home/stats-section.tsx`
  - `components/home/plans-section.tsx`
  - `lib/plan-details.ts`
  - `components/plan-detail-page.tsx`
- 作業
  - 実際の集計元を確認する。
  - 根拠がある場合は「YYYY年MM月時点 / Google・OTA・自社アンケート合算」などの注記を入れる。
  - 根拠がない場合は以下へ置換する。
    - `口コミ実績 10,136+` -> `体験後の写真共有・LINE相談に対応`
    - `年間案内実績 5,000+` -> `少人数制で丁寧にご案内`
    - `遭遇率95%` -> `遭遇しやすいポイント`
    - `高遭遇率！` -> `ウミガメに会いやすいポイントを選定`
- 確認
  - トップ、プランカード、詳細ページで不自然な数値が残っていない。

### 3. sitemap更新日を最新化

- 対象ファイル
  - `app/sitemap.ts`
- 作業
  - `CONTENT_LAST_UPDATED` を `2026-06-19` に更新。
  - コメントに「C2追加・予約導線調整」を追記。
- 確認
  - `npm run build`
  - `/sitemap.xml` が生成される。

### 4. LocalBusiness JSON-LDを更新

- 対象ファイル
  - `components/json-ld.tsx`
- 作業
  - `@type` を `["LocalBusiness", "SportsActivityLocation", "TouristAttraction"]` に変更。
  - `priceRange` を `¥4,000〜¥16,000` に変更。
  - 主要プランの `makesOffer` 追加を検討。
- 確認
  - `npm run build`
  - Rich Results TestでJSON-LDエラーが出ない。

### 5. C2を簡易比較に追加

- 対象ファイル
  - `components/home/plans-section.tsx`
- 作業
  - `quickCompare` に `C2` を追加する。
  - 表示が詰まる場合は `昼夜セット` と `貸切昼夜` に短縮。
- 確認
  - スマホで横幅が崩れない。
  - `/` と `/plans` の比較表でC2が見える。

### 6. noopenerとariaの軽微修正

- 対象ファイル
  - `components/navbar.tsx`
  - `components/mobile-cta.tsx`
  - `components/faq-section.tsx`
  - `components/image-gallery.tsx`
  - `components/home/plans-section.tsx`
- 作業
  - `window.open(url, "_blank")` を `window.open(url, "_blank", "noopener,noreferrer")` にする。
  - FAQ開閉ボタンに `aria-expanded`, `aria-controls` を追加。
  - ギャラリーlightboxの閉じる/前へ/次へに `aria-label` を追加。
  - プランカルーセルのドットに `aria-label` を追加。
- 確認
  - 見た目が変わらない。
  - キーボード操作でボタンの意味が分かる。

### 7. middlewareの旧planリダイレクトを修正

- 対象ファイル
  - `middleware.ts`
- 作業
  - `PAGE_MAP.plan` を `/` から `/plans` へ変更。
- 確認
  - `/?page=plan` が `/plans` へ308リダイレクト。

## Day 2: SEO/CVRに効くコンテンツ追加

### 1. FAQ追加

- 対象ファイル
  - `lib/data.ts`
  - `app/miyakojima-sea-turtle/page.tsx`
- 追加候補
  - 送迎はありますか？
  - 集合場所はいつ決まりますか？
  - シャワーや更衣室はありますか？
  - ウミガメに会えなかった場合は返金されますか？
  - 当日予約はできますか？
  - 泳げない人は浮き輪につかまれますか？
  - 貴重品やスマホはどうすればいいですか？
- 注意
  - 送迎、返金、当日予約は事実確認してから公開する。
  - 不明なら「LINEでご相談ください」に逃がす。

### 2. プラン詳細にアクセス/集合場所説明を強化

- 対象ファイル
  - `lib/plan-details.ts`
  - `components/plan-detail-page.tsx`
- 作業
  - 集合場所が前日/当日案内になる理由を明記。
  - ビーチごとの駐車場、有料/無料、トイレ/シャワーを分かりやすく。
  - 送迎がないなら「現地集合・現地解散」「レンタカー推奨」を明記。
- CVR効果
  - 観光客の「当日どう動けばいいか分からない」を解消。

### 3. トップに「泳げない方へ」説明を追加または強化

- 対象ファイル
  - `components/home/features-section.tsx`
  - `components/home/hero-section.tsx`
  - `components/home/faq-section.tsx`
- 作業
  - ライフジャケット、浮き具、浅瀬で練習、ガイドが近くでサポートを短く出す。
  - 予約ボタンの近くに安心材料を置く。

### 4. メタタイトル/ディスクリプション調整

- 対象ファイル
  - `app/layout.tsx`
  - `app/plans/page.tsx`
  - `app/plans/[id]/page.tsx`
  - `app/miyakojima-sea-turtle/page.tsx`
  - `app/faq/page.tsx`
- 作業
  - トップとS1は「泳げない」「初心者」「子連れ」を自然に入れる。
  - C1/C2は新プラン名をそのまま検索結果に出す。
  - FAQは「持ち物」「雨天」「キャンセル」「集合場所」を入れる。

### 5. Googleビジネスプロフィール前提のNAP確認

- 対象ファイル
  - `components/footer.tsx`
  - `components/json-ld.tsx`
  - `app/tokushoho/page.tsx`
- 作業
  - 店舗名、電話番号、住所、営業時間が完全一致しているか確認。
  - Google Maps URLをschemaと表示で揃える。

## Day 3: 表示速度と運用品質

### 1. ESLint設定追加

- 対象ファイル
  - `package.json`
  - `.eslintrc.json` または `eslint.config.mjs`
- 作業
  - Next.js推奨設定を追加。
  - まず `next/core-web-vitals` を入れる。
  - 既存コードで大量警告が出たら、予約導線に関わるエラーだけ優先して直す。
- 確認
  - `npm run lint` が非対話で完了する。

### 2. Lighthouse実測

- 必要
  - `lighthouse` またはChrome DevTools。
- 対象URL
  - `/`
  - `/plans/S1`
  - `/book?plan=S1`
  - `/miyakojima-sea-turtle`
- 見る指標
  - LCP
  - CLS
  - INP/TBT
  - mobile performance
  - accessibility
  - SEO

### 3. 画像整理

- 対象
  - `public/images/sea-turtle-brothers-logo.png`
  - `public/images/gallery-*`
  - `public/images/blog/*`
  - `public/placeholder-*`
- 作業
  - ナビ用ロゴを小さくする。
  - ギャラリーの大きすぎる画像を圧縮。
  - 未使用プレースホルダーを削除。
- 確認
  - 画像の見た目が崩れない。
  - `npm run build`

### 4. クライアントJS削減

- 対象ファイル
  - `components/home/plans-section.tsx`
  - `components/home/stats-section.tsx`
  - `components/plan-detail-page.tsx`
- 作業
  - motionが不要な部分を静的表示へ。
  - セクション全体ではなく、必要な小パーツだけClient Componentに切る。
- 注意
  - 予約フォームは無理にServer Component化しない。

### 5. 計測イベント設計

- 対象
  - Vercel Analytics
  - Google Analytics / Search Console / Google Tag Managerは導入状況確認
- 計測したいイベント
  - ヒーロー予約クリック
  - 固定CTA予約クリック
  - LINEクリック
  - プラン詳細から予約
  - 予約フォーム送信成功
  - フォーム途中離脱は可能なら後日

## すぐ売上に効く修正

1. 固定CTA文言を `空き確認・予約` にする
2. 予約フォームのS5年齢制限矛盾を直す
3. C2を比較表に出す
4. FAQに「集合場所」「送迎」「シャワー/更衣」「当日希望」を追加
5. プラン詳細の料金下に「写真動画無料 / 前日キャンセル無料 / 天候中止無料 / 当日現金」を入れる
6. 口コミ/実績の数値に根拠注記を入れる
7. LINE導線を「不安な方はこちら」に位置づける

## 後からやる修正

1. 画像圧縮
2. Client Component分割
3. Lighthouse改善
4. Blog内リンク最適化
5. OGP専用画像作成
6. Service schema追加
7. Googleビジネスプロフィール投稿/写真整備
8. Search Console登録後のクエリ分析

## 実装順チェックリスト

- [ ] S5年齢制限メッセージ修正
- [ ] プラン切替時の `under3Count` クリア
- [ ] 口コミ/実績/遭遇率の根拠確認
- [ ] 根拠なし数値の文言置換
- [ ] sitemap更新日変更
- [ ] LocalBusiness JSON-LD更新
- [ ] C2を簡易比較に追加
- [ ] noopener追加
- [ ] FAQ/ギャラリー/カルーセルのaria追加
- [ ] `PAGE_MAP.plan` を `/plans` へ
- [ ] FAQ追加
- [ ] 集合場所/アクセス説明追加
- [ ] メタタイトル/description調整
- [ ] ESLint設定追加
- [ ] build/type/lint確認
- [ ] Lighthouse実測

## 確認コマンド

```bash
npm run build
npx tsc --noEmit --pretty false
npm run lint
git diff --stat
git diff
```

ESLint設定前は `npm run lint` がプロンプトで止まるため、Day 3で設定後に再実行する。
