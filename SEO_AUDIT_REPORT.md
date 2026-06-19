# SEO / UX / CVR Audit Report

Audit date: 2026-06-19 JST  
Target: 海亀兄弟 / 宮古島ウミガメシュノーケル系サイト  
Repository: `/Users/yonetaniyoshikazukari/クロード/v0-website`

## 1. 総合評価

- SEOスコア：82 / 100
- 表示速度スコア：74 / 100
- スマホUXスコア：78 / 100
- CVRスコア：80 / 100
- 技術安定性スコア：84 / 100

総合コメント:

App Router、metadata、canonical、OGP、robots、sitemap、FAQ/Breadcrumb JSON-LD、ブログ、ピラーページまで入っており、SEOの土台はかなり強いです。特に `/miyakojima-sea-turtle` は「宮古島 ウミガメ」「宮古島 ウミガメシュノーケル」の受け皿として機能しやすい構成です。

公開前に優先して直すべき弱点は、次の5つです。

1. 口コミ件数、年間案内実績、遭遇率などの数値が実データと紐づいて見えない
2. 予約フォームの年齢制限メッセージが一部プランと矛盾している
3. ESLintが未設定で、`npm run lint` が監査コマンドとして使えない
4. トップ/プラン/予約フォームがクライアントJSと画像にやや重い
5. 集合場所、送迎なし、シャワー/更衣、当日希望、会えなかった場合の扱いが予約前不安として残る

確認した主な構成:

- Framework: Next.js 14.2.35 / App Router
- Main routes: `/`, `/plans`, `/plans/[id]`, `/book`, `/miyakojima-sea-turtle`, `/faq`, `/gallery`, `/staff`, `/blog`, `/blog/[slug]`
- English routes: `/en`, `/en/plans`, `/en/plans/[id]`, `/en/book`, `/en/faq`, `/en/miyakojima-sea-turtle`
- SEO files: `app/layout.tsx`, `lib/seo.ts`, `app/sitemap.ts`, `app/robots.ts`, `components/json-ld.tsx`
- Booking/API: `components/booking-form.tsx`, `app/api/booking/route.ts`, `app/api/line/notify/route.ts`
- Main data: `lib/plan-details.ts`, `lib/data.ts`, `lib/booking-plans.ts`, `lib/plan-price-display.ts`

競合確認メモ:

- VELTRA、アソビュー、Activity Japan、ナミ宮古島、ヤビジマリンハート系ページを検索結果から確認。
- 上位ページは「写真無料」「初心者歓迎」「子連れ」「当日予約」「送迎相談」「年齢」「所要時間」「口コミ数」「安全説明」を料金付近またはファーストビューに強く出している。
- 海亀兄弟は「少人数制」「泳げない人OK」「写真・動画無料」「浅瀬」「ライフジャケット」が強い。一方で「送迎なし/現地集合」「集合場所の決まり方」「シャワー/更衣」「ウミガメ非遭遇時」「当日希望の扱い」の説明を料金・予約近くに足すと予約率が上がる可能性が高い。

参照した競合/比較URL:

- https://www.veltra.com/jp/japan/okinawa/miyako_island/ctg/185320%3AMiyako_Sea_Turtle_Snorkel/
- https://activityjapan.com/search/category/snorkelling/okinawa/okinawa_r/344/
- https://www.asoview.com/leisure/15/location/are0471708/
- https://nami-miyako.com/
- https://www.yabiji.jp/

## 2. 最重要修正 P0

### P0-1. 口コミ件数・実績・遭遇率の根拠整理

- 問題
  - トップ、プランカード、詳細ページで大きな口コミ件数や実績数、遭遇率が表示されているが、レビュー元や集計根拠が画面上に見えない。
  - `components/json-ld.tsx` では「検証可能な口コミ・評価データと紐づかないため aggregateRating は出力しない」と明示している一方、UIでは `4.9 / 10,136+ / 5,000+ / 95%` などが表示される。
- 影響
  - ユーザー信頼、Google品質評価、景表法/誇大表現リスクに関係する。
  - Googleビジネスプロフィールや外部OTAレビューと件数が一致しない場合、逆に不信感が出る。
- 該当ファイル
  - `components/home/stats-section.tsx:34-39`
  - `components/home/plans-section.tsx:57-58`, `96-97`, `135-136`, `334-338`
  - `lib/plan-details.ts:67-68`, `126-127`, `178-179`, `225-226`, `271-272`
  - `components/plan-detail-page.tsx:77-86`, `381-428`, `700-716`
- 修正方針
  - 実データがある場合: 「Google/OTA/自社アンケート合算、YYYY年MM月時点」など出典を明記する。
  - 実データがない場合: 口コミ件数・年間案内実績・具体的な遭遇率%を削除または「多くのお客様から好評」「遭遇しやすいポイントへ案内」に弱める。
  - `遭遇率95%` のような数値は、根拠がなければ `遭遇しやすい傾向` に変更する。
- 優先度
  - P0
- 修正難易度
  - 低から中
- 推定インパクト
  - 信頼性: 大
  - SEO: 中
  - CVR: 中から大

### P0-2. 予約フォームの年齢制限メッセージが貸切ナイトツアーと矛盾

- 問題
  - `S5` は `lib/plan-price-display.ts:13` で3歳以下無料対象に入っている。
  - 予約フォームの警告は `selectedPlan !== "S3"` だけで判定しており、`S5` を選んだ場合にも「3歳以下のお子様が参加できるのは本格ナイトツアーのみ」と表示される。
- 影響
  - 貸切ナイトツアーを検討する子連れユーザーが離脱する。
  - 表示と料金ロジックの矛盾により問い合わせ増加、予約ミスにつながる。
- 該当ファイル
  - `components/booking-form.tsx:207-218`
  - `components/booking-form.tsx:995-1000`
  - `lib/plan-price-display.ts:13`, `50-52`
- 修正方針
  - `selectedPlan !== "S3"` ではなく `!showUnder3` または `!UNDER3_FREE_PLAN_IDS.has(selectedPlan)` のような判定へ変更。
  - プラン切替時、`showUnder3 === false` になったら `under3Count` を0に戻す。
- 優先度
  - P0
- 修正難易度
  - 低
- 推定インパクト
  - CVR: 中
  - 予約ミス防止: 大

### P0-3. ESLint未設定で公開前の品質ゲートが不完全

- 問題
  - `npm run lint` が Next.js のESLint設定プロンプトで止まり、CIやデプロイ前チェックとして使えない。
- 影響
  - 未使用import、アクセシビリティ、React/Next.jsの危険な書き方を継続的に検出できない。
  - 今回の監査では `next build` と `tsc --noEmit` は通ったが、Lintの自動検査は未完了。
- 該当ファイル
  - `package.json`
  - `.eslintrc` または `eslint.config.*` が未作成
- 修正方針
  - Next.js推奨のESLint設定を追加。
  - 既存コードに大量警告が出る場合は、まず `next/core-web-vitals` を入れてエラーだけ潰す。
- 優先度
  - P0寄りのP1
- 修正難易度
  - 中
- 推定インパクト
  - 技術安定性: 大

## 3. 重要修正 P1

### P1-1. LocalBusiness JSON-LDの型と価格帯を更新

- 問題
  - `LocalBusinessJsonLd` の `@type` が `TouristAttraction` 単体。
  - `priceRange` が `¥4,000〜¥9,000` のままで、`C1`, `C2`, `slide-boat` を反映していない。
- 影響
  - ローカルビジネスとしての意味づけが弱い。
  - 料金帯がサイト上のプランと不一致。
- 該当ファイル
  - `components/json-ld.tsx:79-114`
- 修正方針
  - `@type` を `["LocalBusiness", "SportsActivityLocation", "TouristAttraction"]` などにする。
  - `priceRange` を現状プランに合わせて `¥4,000〜¥16,000`、スライダーボート公開後は `¥4,000〜¥14,000/¥16,000` の整理。
  - `makesOffer` または `hasOfferCatalog` で主要プランを紐付ける。

### P1-2. サイトマップの最終更新日が新プラン追加に追従していない

- 問題
  - `CONTENT_LAST_UPDATED` が `2026-06-13` 固定。
  - `C2` 追加や予約導線変更が入っているが、sitemap上の `lastModified` は古いまま。
- 影響
  - クロール上の鮮度シグナルが弱くなる。
- 該当ファイル
  - `app/sitemap.ts:8-11`, `46-60`
- 修正方針
  - 今回のC2追加日として `2026-06-19` に更新。
  - 将来的にはプランごとに `updatedAt` を持たせる。

### P1-3. トップの比較表に貸切昼夜セット `C2` が出ていない

- 問題
  - カードには `C2` があるが、上部の簡易比較 `quickCompare` は `C1` のみ。
- 影響
  - ユーザーが「1日プランの貸切版」を素早く比較できない。
  - ユーザー要望の「あるプランみたいに簡単な切り替え」に対して、比較表側の発見性が弱い。
- 該当ファイル
  - `components/home/plans-section.tsx:215-221`
- 修正方針
  - `C2` を `quickCompare` に追加するか、`C1/C2` を同一行で「通常/貸切」表示にする。

### P1-4. モバイルファーストビューで予約CTAの認知をさらに強める

- 問題
  - `MobileCTA` はあるが、トップヒーローのモバイル表示では予約ボタンがページ下固定CTAに依存しがち。
  - 競合は料金/予約/空き状況をファーストビュー付近に出している。
- 影響
  - 初回訪問者が「料金」「予約」「LINE相談」にたどり着く前に離脱する可能性。
- 該当ファイル
  - `components/home/hero-section.tsx`
  - `components/mobile-cta.tsx:9-38`
- 修正方針
  - モバイル固定CTAの予約文言を `空き確認・予約` に変更。
  - ヒーロー内にも小さく `大人¥6,500 / 子供¥6,000 / 写真無料 / 前日キャンセル無料` を維持しつつ、予約ボタンの認知を強化。

### P1-5. FAQに予約直前の不安解消がまだ足りない

- 問題
  - 既存FAQはかなり充実しているが、競合比較上、予約直前に効く質問が不足。
- 影響
  - LINE問い合わせは増えるが、フォーム予約への自己完結率が下がる。
- 該当ファイル
  - `lib/data.ts:720-777`
  - `app/miyakojima-sea-turtle/page.tsx:26-51`
- 修正方針
  - 「送迎はありますか」「シャワー/更衣室はありますか」「ウミガメに会えなかったら返金ですか」「当日予約は可能ですか」「集合場所はなぜ前日案内ですか」「スマホ/貴重品はどうすればいいですか」を追加。

### P1-6. クライアントコンポーネントとアニメーションが多く、First Load JSが重め

- 問題
  - `/` First Load JS 199kB、`/book` 214kB、`/plans/[id]` 185kB。
  - トップの主要セクションの多くが `framer-motion` を使うクライアントコンポーネント。
- 影響
  - モバイル回線でLCP/INPに影響する可能性。
- 該当ファイル
  - `components/home/hero-section.tsx`
  - `components/home/plans-section.tsx`
  - `components/home/stats-section.tsx`
  - `components/plan-detail-page.tsx`
- 修正方針
  - まず監査後に Lighthouse で実測。
  - その後、静的表示で十分なセクションを Server Component 化、または motionを限定。
  - 予約フォームは必要なクライアント処理なので維持。

### P1-7. ローカルSEO向けのアクセス説明が弱い

- 問題
  - NAPはあるが、観光客が気にする「宮古空港から」「市街地から」「ホテルエリアから」「送迎有無」がまとまっていない。
- 影響
  - Googleビジネスプロフィール流入や観光客の予約判断で弱い。
- 該当ファイル
  - `components/footer.tsx:6-12`
  - `lib/plan-details.ts:89-91`, `143-146`, `346-349`, `399-402`
  - `app/miyakojima-sea-turtle/page.tsx`
- 修正方針
  - `/faq` と `/plans/[id]` に「集合場所・アクセス」説明を追加。
  - 送迎がない場合は隠さず、レンタカー推奨と駐車場案内を明記。

## 4. 改善推奨 P2

### P2-1. `.DS_Store` とプレースホルダー画像の整理

- 問題
  - `.DS_Store` が複数存在。
  - `public/placeholder-*.png`, `placeholder.svg`, `placeholder-user.jpg` などが多数存在。
- 該当ファイル
  - `.DS_Store`
  - `app/.DS_Store`
  - `components/.DS_Store`
  - `lib/.DS_Store`
  - `public/placeholder-*`
- 修正方針
  - 未使用確認後に削除。
  - `.gitignore` に `.DS_Store` を追加済みか確認し、未追加なら追加。

### P2-2. `PAGE_MAP.plan` のリダイレクト先が `/` になっている

- 問題
  - 旧URL `?page=plan` が `/plans` ではなく `/` に飛ぶ。
- 該当ファイル
  - `middleware.ts:4-13`
- 修正方針
  - `plan: "/plans"` に変更。

### P2-3. `window.open` のnoopener不足

- 問題
  - `<a target="_blank" rel="noopener noreferrer">` は概ね正しい。
  - `window.open(url, "_blank")` は `noopener,noreferrer` がない。
- 該当ファイル
  - `components/navbar.tsx:57`
  - `components/mobile-cta.tsx:24`
  - `components/faq-section.tsx:75`
- 修正方針
  - `window.open(url, "_blank", "noopener,noreferrer")` に変更、または `<a>` に寄せる。

### P2-4. アクセシビリティの細かい不足

- 問題
  - FAQ開閉ボタンに `aria-expanded` / `aria-controls` がない。
  - ギャラリーlightboxの閉じる/前へ/次へボタンに `aria-label` がない。
  - トップの横スクロールドットに `aria-label` がない。
- 該当ファイル
  - `components/faq-section.tsx:33-45`
  - `components/image-gallery.tsx:62-93`
  - `components/home/plans-section.tsx:617-631`
- 修正方針
  - 見た目を変えずに aria 属性だけ追加。

### P2-5. OGP画像の管理をNext標準へ寄せる

- 問題
  - OGPは metadata で指定済みだが、`app/opengraph-image.*` は未確認。
- 該当ファイル
  - `app/layout.tsx:52-73`
  - `public/images/gemini-generated-image-rq969urq969urq96.jpeg`
- 修正方針
  - 1200x630の専用OGPを固定し、`app/opengraph-image.jpg` or `app/opengraph-image.tsx` を検討。

## 5. SEOメタ改善案

| ページ | 推奨title | 推奨meta description | 狙うキーワード | 現状との差分理由 |
|---|---|---|---|---|
| `/` | 宮古島ウミガメシュノーケル｜初心者・子連れOK・写真動画無料｜海亀兄弟 | 宮古島でウミガメと泳ぐ少人数制シュノーケル。泳げない方・初心者・5歳からのお子様連れもライフジャケットと浅瀬練習で安心。写真・動画無料、前日キャンセル無料。 | 宮古島 ウミガメシュノーケル / 宮古島 シュノーケリング / 子連れ | 現状も良いが「泳げない」「浅瀬練習」を入れると不安解消型クエリに強くなる。 |
| `/plans` | 宮古島シュノーケリング料金比較｜ウミガメ・貸切・ナイト・SUP｜海亀兄弟 | ウミガメシュノーケル、貸切、ヤシガニ探検、サンセットSUP、昼夜セットを料金・所要時間・対象年齢で比較。写真無料、前日キャンセル無料。 | 宮古島 アクティビティ / 宮古島 シュノーケリング 料金 | 「料金比較」を前に出すと比較検討ユーザーに刺さる。 |
| `/plans/S1` | 宮古島ウミガメシュノーケルツアー｜初心者・泳げない方OK | 宮古島の浅瀬でウミガメ遭遇を狙う少人数制シュノーケル。ライフジャケット着用、浮き具あり、写真・動画無料。5歳から参加OK。 | 宮古島 ウミガメシュノーケル / 泳げない | 現状の魅力に「泳げない」を明確に追加。 |
| `/plans/S2` | 【貸切】宮古島ウミガメシュノーケル｜子連れ・初心者に安心 | 1組限定の貸切ウミガメシュノーケル。専属ガイドが家族や泳ぎが苦手な方のペースに合わせて案内。ウェットスーツ・度付きマスク無料。 | 宮古島 子連れ シュノーケル / 宮古島 貸切 シュノーケル | 貸切の価値を「子連れ」「初心者」に寄せる。 |
| `/plans/S3` | 宮古島ヤシガニ探検ナイトツアー｜0歳から参加OK | 宮古島の夜にヤシガニや夜行性の生き物を探すナイトツアー。0歳から参加OK、3歳以下無料。家族旅行・三世代旅行におすすめ。 | 宮古島 ナイトツアー / 宮古島 ヤシガニ | ウミガメ以外の自然検索を取りに行く。 |
| `/plans/S4` | 宮古島サンセットSUP｜1日1組限定・写真動画無料 | 宮古島の夕日を海上から楽しむサンセットSUP。初心者OK、1日1組限定。写真・動画データ無料で記念日やカップル旅行にもおすすめ。 | 宮古島 サンセットSUP / 宮古島 SUP | プラン特化キーワードを前方へ。 |
| `/plans/C1` | 宮古島ウミガメシュノーケル＆ヤシガニ探検 昼夜セット | 昼はウミガメシュノーケル、夜はヤシガニ探検。宮古島の海と夜の自然を1日で楽しめる通常より1,000円お得な昼夜セット。 | 宮古島 ウミガメ ツアー / 宮古島 ナイトツアー セット | 新プラン名をそのまま検索結果に出す。 |
| `/plans/C2` | 【貸切】宮古島ウミガメシュノーケル＆ヤシガニ探検 昼夜セット | 昼も夜も貸切で宮古島の自然を満喫。貸切ウミガメシュノーケルと貸切ヤシガニ探検を専属ガイドが案内。通常より1,000円お得。 | 宮古島 貸切 シュノーケル / 宮古島 子連れ アクティビティ | 貸切検索と家族/子連れに寄せる。 |
| `/miyakojima-sea-turtle` | 宮古島でウミガメに会える場所｜初心者向けシュノーケル完全ガイド | 宮古島でウミガメに会いやすい場所、時期、注意点、初心者・子ども・泳げない方でも楽しむ方法を現地ツアー視点で解説。 | 宮古島 ウミガメ / 宮古島 ウミガメ 場所 | 現状タイトルは強いが少し長い。「初心者」を入れる案。 |
| `/faq` | 宮古島シュノーケリングのよくある質問｜初心者・子連れ・持ち物 | 泳げない方、子連れ、集合場所、持ち物、雨天時、キャンセル、写真データ、支払いについて海亀兄弟のツアー前によくある質問をまとめました。 | 宮古島 シュノーケリング FAQ / 持ち物 | FAQの網羅性を検索結果に伝える。 |

## 6. 見出し構造改善案

### `/`

- h1: 宮古島でウミガメと泳ぐシュノーケルツアー
- h2: 料金・対象年齢でツアーを比較
- h2: 初心者・泳げない方・子連れでも安心な理由
- h2: 海亀兄弟が選ばれる理由
- h2: 宮古島のウミガメに会える場所
- h2: 写真・動画ギャラリー
- h2: お客様の声
- h2: ガイド紹介
- h2: よくある質問
- h2: 空き状況を確認して予約する

現状:

- h1はトップヒーローにあり問題なし。
- `PlansSection` が最初に来る構成はCVR上良い。
- 「初心者・泳げない・子連れ」のセクション見出しをもう少し検索語に寄せるとよい。

### `/plans`

- h1: 宮古島ツアープラン一覧
- h2: 料金・対象年齢で比較
- h2: ウミガメシュノーケル
- h2: 貸切ツアー
- h2: ナイトツアー・ヤシガニ探検
- h2: サンセットSUP
- h2: 昼夜セットプラン
- h2: 迷った方へのおすすめ

### `/plans/[id]`

- h1: プラン名
- h2: このプランの魅力
- h2: 体験の流れ
- h2: 料金に含まれるもの
- h2: 集合場所・アクセス
- h2: 持ち物・服装
- h2: 注意事項・キャンセル
- h2: よくある質問
- h2: このプランを予約する

現状:

- 詳細ページの骨格は良い。
- 集合場所/アクセスを見出しとして強くするとローカルSEOと予約率に効く。

### `/miyakojima-sea-turtle`

- h1: 宮古島でウミガメに会える場所とシュノーケリング完全ガイド
- h2: 宮古島でウミガメに会える可能性が高い場所
- h2: ウミガメに会いやすい時期・時間帯
- h2: 初心者や子どもでもウミガメシュノーケルはできる？
- h2: 泳げない方が安心して参加するためのポイント
- h2: 個人で行く場合の注意点
- h2: ツアー参加がおすすめな理由
- h2: 海亀兄弟のウミガメシュノーケルの特徴
- h2: よくある質問

## 7. 追加した方がいいFAQ

1. 送迎はありますか？
   - 回答案: 送迎がない場合は「現地集合・現地解散です。宮古島は公共交通機関が少ないためレンタカーでのお越しをおすすめしています。集合場所と駐車場は前日までにLINEでご案内します。」
2. 集合場所はいつ決まりますか？
   - 回答案: 「海況・風向き・潮位を見て安全なビーチを選ぶため、前日までにLINEでご案内します。」
3. シャワーや更衣室はありますか？
   - 回答案: 「ビーチにより設備が異なります。簡易シャワーやトイレがある場所もありますが、車内で使えるタオルや着替えをご準備ください。」
4. ウミガメに会えなかった場合は返金されますか？
   - 回答案: 「野生動物のため遭遇保証はありません。返金保証を行う場合のみ明記。行わない場合は、熱帯魚やサンゴの観察、写真撮影も含めてご案内します。」
5. 当日予約はできますか？
   - 回答案: 「空きがあれば前日まで予約可能。推測: 当日希望はLINEで相談、受けられる場合のみ対応。」
6. 泳げない人は浮き輪につかまれますか？
   - 回答案: 「ライフジャケット着用、ガイドの浮き具につかまって参加可能。浅瀬で慣れてから進みます。」
7. 貴重品やスマホはどうすればいいですか？
   - 回答案: 「必要最小限で集合。海に持ち込む場合は防水ケース推奨。車内保管は自己管理。」
8. 何分前に集合すればいいですか？
   - 回答案: 「開始15分前。ナイトツアーは開始時刻に合わせて集合など、プランごとに明記。」
9. 雨の日は開催されますか？
   - 既存あり。追加するなら「雨より風・波・雷を重視して判断」と明記。
10. LINEと予約フォームはどちらが早いですか？
   - 回答案: 「日程と人数が決まっている方は予約フォーム、不安がある方や当日希望はLINE。」

## 8. 追加した方がいいコンテンツ

### 初心者向け説明

- 追加場所: `/`, `/plans/S1`, `/miyakojima-sea-turtle`
- 内容:
  - 初めてでも参加者の多くが問題なく楽しめること
  - 浅瀬でマスク/呼吸の練習をしてから進むこと
  - ガイドが近くにいること

### 泳げない人向け説明

- 追加場所: `/plans/S1`, `/plans/S2`, FAQ
- 内容:
  - ライフジャケットで沈まない
  - 浮き輪/浮き具につかまれる
  - 足がつく浅瀬から始める
  - 不安が強い場合は貸切がおすすめ

### 子連れ向け説明

- 追加場所: `/`, `/plans/S2`, FAQ
- 内容:
  - 5歳から参加OK
  - 子ども用器材
  - 途中で怖がった場合の対応
  - 兄弟/三世代の場合は貸切推奨

### 雨の日について

- 追加場所: FAQ, 予約フォーム注意事項
- 内容:
  - 小雨よりも風、波、雷が重要
  - 中止時はキャンセル料なし
  - 中止/変更連絡のタイミング

### ウミガメ遭遇率について

- 追加場所: `/miyakojima-sea-turtle`, `/plans/S1`
- 内容:
  - 保証しない
  - ガイドが当日の海況で場所を選ぶ
  - 会えなかった場合でもサンゴ/熱帯魚/写真を楽しめる
  - 具体的な%は根拠がある場合のみ

### 集合場所について

- 追加場所: `/plans/[id]`, FAQ, 予約フォーム
- 内容:
  - 前日までにLINEで案内
  - 宮古空港、市街地、主要ホテルエリアからの目安時間
  - 送迎有無
  - 駐車場有無/料金

### 持ち物について

- 追加場所: `/plans/[id]`, FAQ
- 内容:
  - 水着着用で集合
  - タオル、着替え、飲み物、日焼け止め、サンダル
  - ナイトは歩きやすい靴、虫よけ

### 写真・動画無料について

- 追加場所: `/`, `/plans/[id]`, 予約フォーム
- 内容:
  - 枚数制限なし
  - LINEで当日中、繁忙期は遅れる可能性
  - ウミガメと一緒の写真をガイドが撮る

### 安全対策について

- 追加場所: `/`, `/plans/[id]`
- 内容:
  - ライフジャケット
  - 浅瀬で練習
  - 少人数制
  - 保険加入
  - 海況判断
  - 飲酒/妊娠/持病の参加不可

## 9. 構造化データ改善案

現状:

- `WebSiteJsonLd`: あり
- `OrganizationJsonLd`: あり
- `LocalBusinessJsonLd`: あり。ただし `TouristAttraction` 単体
- `PlanJsonLd`: `Product` と `Offer`
- `FAQJsonLd`: あり
- `BreadcrumbJsonLd`: あり
- `BlogPostingJsonLd`: あり

改善方針:

- トップでは `LocalBusiness` として事業情報を強化。
- プラン詳細では `Product` だけでなく `Service` または `TouristTrip` 的な意味づけを検討。
- 検証可能な口コミソースがない限り `aggregateRating` は出さない方針を維持。

コード例:

```tsx
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "SportsActivityLocation", "TouristAttraction"],
  "@id": `${SITE_URL}/#business`,
  name: "海亀兄弟",
  url: SITE_URL,
  telephone: "+81-80-5344-2439",
  address: {
    "@type": "PostalAddress",
    postalCode: "906-0014",
    streetAddress: "平良松原107-1",
    addressLocality: "宮古島市",
    addressRegion: "沖縄県",
    addressCountry: "JP",
  },
  areaServed: ["宮古島", "沖縄県宮古島市"],
  priceRange: "¥4,000〜¥16,000",
  sameAs: ["https://www.instagram.com/umigamekyoudai"],
  makesOffer: [
    {
      "@type": "Offer",
      name: "ウミガメシュノーケルツアー",
      price: "6500",
      priceCurrency: "JPY",
      url: `${SITE_URL}/plans/S1`,
    },
    {
      "@type": "Offer",
      name: "ウミガメシュノーケル＆ヤシガニ探検 昼夜セット",
      price: "9500",
      priceCurrency: "JPY",
      url: `${SITE_URL}/plans/C1`,
    },
  ],
}
```

プラン詳細の改善例:

```tsx
const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: plan.name,
  description: plan.heroDescription,
  provider: { "@id": `${SITE_URL}/#business` },
  areaServed: "宮古島",
  serviceType: "シュノーケリングツアー",
  offers: {
    "@type": "Offer",
    priceCurrency: "JPY",
    price: priceNum,
    url: `${SITE_URL}/book?plan=${plan.id}`,
    availability: "https://schema.org/InStock",
  },
}
```

## 10. 画像改善案

### 重い画像

確認コマンド: `du -sh public public/images public/*.jpg public/*.png public/images/* 2>/dev/null | sort -hr | head -40`

主な重いファイル:

- `public`: 49MB
- `public/images`: 33MB
- `public/images/gallery`: 6.8MB
- `public/images/blog`: 5.3MB
- `public/images/tours`: 4.8MB
- `public/miyakojima-oceanview-cafe-tropical-drinks.png`: 1.9MB
- `public/images/sea-turtle-brothers-logo.png`: 1.1MB
- `public/images/gallery-night-tour-4.jpg`: 1.0MB
- `public/images/gallery-nt-0263.jpg`: 992KB
- `public/images/gallery-nt-0232.jpg`: 872KB
- `public/images/miyakojima-night-tour-creatures.jpg`: 864KB

改善:

- ロゴはナビ用に小さいWebP/PNGを別途作る。現状の `1276x903` を毎ページ `priority` 指定している。
- ギャラリー画像はNext Imageで最適化されるが、元画像が大きい。公開前に長辺1600から2000px程度へ圧縮してもよい。
- OGPは専用1200x630で固定。

### alt不足/改善候補

- `components/gallery-hero.tsx`: `alt="ギャラリー背景"` は内容説明として弱い。
- `components/faq-hero.tsx`: `alt="よくある質問背景"` は装飾なら空alt、意味があるなら具体化。
- `components/staff-hero.tsx`: `alt="スタッフ紹介"` は具体性が弱い。
- `components/image-gallery.tsx:107`: サムネイル `alt=""` は装飾扱いならOK。ただしボタンには `aria-label` が必要。

### LCP候補

- `/`: `components/home/hero-section.tsx` のヒーロー画像
- `/plans/[id]`: `components/plan-detail-page.tsx:53-63`
- `/gallery`: `components/gallery-hero.tsx`
- `/staff`: `components/staff-hero.tsx`
- `/blog/[slug]`: `app/blog/[slug]/BlogPostClient.tsx`

改善:

- LCP画像は現状 `priority` が概ね設定されている。
- ただし画像そのものとクライアントJSが重いので、実測Lighthouse後に優先順位を決める。

## 11. スマホUI改善案

1. ファーストビュー
   - 現状: 何のサイトかは分かる。
   - 改善: `泳げない方OK / 5歳から / 写真動画無料 / 前日キャンセル無料` を小さな証拠チップとして予約ボタン近くに維持。
2. CTA
   - 現状: 下部固定に `LINEで質問` と `予約する`。
   - 改善: `予約する` を `空き確認・予約` にする。
3. 料金
   - 現状: プランカードは分かりやすい。
   - 改善: `C1/C2` の通常/貸切切り替えを比較表にも出す。
4. セクション順
   - 現状: ヒーロー -> プラン比較 -> 実績 -> 特徴。CVR上は良い。
   - 改善: 数字実績の根拠がない場合は、実績より先に「安全・初心者・子連れ」を出す方が安心感は強い。
5. ヒーロー画像
   - 現状: 写真は強い。
   - 改善: モバイルで重要被写体が見切れる場合は `object-position` をページごとに調整。
6. 予約フォーム
   - 現状: 料金自動計算、日付、時間、人数、参加者情報がある。
   - 改善: フォーム冒頭に「仮予約です。確定はLINE/電話連絡後」の説明を短く固定。
7. 高齢者/子連れ
   - 現状: 子連れは訴求あり。
   - 改善: 「何歳から」「途中で怖がったら」「トイレ/シャワー」を予約前にすぐ見える位置へ。

## 12. CVR改善案

1. CTA文言
   - `予約する` -> `空き確認・予約`
   - `LINEで質問` -> `LINEで空き相談`
2. 予約前の不安を料金近くに配置
   - 写真動画無料
   - 前日キャンセル無料
   - 天候中止は無料
   - 当日現金決済
   - 現地集合/駐車場案内あり
3. C1/C2の売り方
   - 「通常セット」「貸切セット」の切り替えを1枚のカード内で見せる。
   - C2は「子どものペース」「周りを気にしない」「写真リクエストしやすい」を明記。
4. LINE導線
   - 不安相談: LINE
   - 日時/人数が決まっている: 予約フォーム
   - 当日/前日希望: LINE
5. 口コミ
   - 本物のレビュー出典がある場合は、Google/じゃらん/アソビュー/自社アンケートなど出典を明記。
   - 出典がない場合は件数を消し、体験談として3件だけ出す。
6. 予約フォーム完了後
   - 「仮予約完了。24時間以内に連絡」だけでなく「LINEを追加しておくと確認が早い」を出す。

## 13. 技術的な修正候補

| ファイル | 修正候補 | 理由 |
|---|---|---|
| `components/booking-form.tsx` | S5の年齢制限警告を修正、プラン切替時に `under3Count` をクリア | 予約矛盾の解消 |
| `components/home/stats-section.tsx` | 口コミ実績/年間案内実績の根拠注記または数値削除 | 信頼性/法務リスク低減 |
| `components/home/plans-section.tsx` | `C2` を `quickCompare` に追加、口コミ件数の根拠整理、ドットにaria-label | CVR/アクセシビリティ |
| `lib/plan-details.ts` | `encounterRate` 数値を根拠付きにするか表現変更 | 誇大表現回避 |
| `components/plan-detail-page.tsx` | 遭遇率テーブルの表現変更、FAQ開閉aria追加 | 信頼性/アクセシビリティ |
| `components/json-ld.tsx` | LocalBusiness型、priceRange、OfferCatalogを更新 | ローカルSEO |
| `app/sitemap.ts` | `CONTENT_LAST_UPDATED` 更新、将来的にプランごとの更新日へ | クロール鮮度 |
| `middleware.ts` | `PAGE_MAP.plan` を `/plans` へ | 旧URL評価集約 |
| `components/navbar.tsx` | `window.open` にnoopener追加 | セキュリティ |
| `components/mobile-cta.tsx` | `window.open` にnoopener追加、CTA文言改善 | セキュリティ/CVR |
| `components/faq-section.tsx` | `aria-expanded`, `aria-controls`, LINE window.open改善 | アクセシビリティ/セキュリティ |
| `components/image-gallery.tsx` | lightboxボタンにaria-label、サムネボタンを操作可能に | アクセシビリティ/UX |
| `next.config.mjs` | `dangerouslyAllowSVG` の必要性を確認 | セキュリティ面の整理 |
| `package.json` | ESLint設定追加 | 品質ゲート |

## 14. 実装してよい安全な修正候補

壊すリスクが低く、すぐ直せる候補だけを列挙します。大きなリデザインは含めません。

1. `components/booking-form.tsx`
   - S5の年齢制限警告を修正
   - プラン切替時の `under3Count` クリアを追加
2. `app/sitemap.ts`
   - `CONTENT_LAST_UPDATED` を `2026-06-19` に更新
3. `components/json-ld.tsx`
   - `priceRange` を `¥4,000〜¥16,000` に更新
   - `@type` を配列化
4. `components/mobile-cta.tsx`
   - `予約する` を `空き確認・予約` に変更
   - `window.open` に `noopener,noreferrer` 追加
5. `components/navbar.tsx`
   - `window.open` に `noopener,noreferrer` 追加
6. `components/faq-section.tsx`
   - `aria-expanded`, `aria-controls` 追加
   - LINE window.openのnoopener追加
7. `components/image-gallery.tsx`
   - lightboxボタンに `aria-label` 追加
8. `middleware.ts`
   - `PAGE_MAP.plan` を `/plans` に変更
9. `components/home/plans-section.tsx`
   - `quickCompare` に `C2` を追加
   - カルーセルドットに `aria-label` 追加
10. `lib/data.ts`
   - FAQを数件追加。ただし文言確認が必要な「返金」「当日予約」「送迎」は事実確認後が安全。

## 15. 実行ログ

実行コマンドと結果:

- `find app -maxdepth 3 -type f`
  - App Router構成を確認。主要ページ、英語ページ、APIルートあり。
- `find components lib public -maxdepth 3 -type f`
  - 主要コンポーネント、SEO/schema、プランデータ、画像を確認。
- `npm run build`
  - 成功。
  - 64ページを静的生成。
  - `/` First Load JS: 199kB
  - `/book` First Load JS: 214kB
  - `/plans/[id]` First Load JS: 185kB
  - Middleware: 26.7kB
- `npm run lint`
  - 失敗扱い。ESLint未設定のため Next.js の設定プロンプトが表示された。
- `CI=1 npm run lint`
  - 同じくESLint設定プロンプトが表示された。
- `npm run typecheck`
  - 失敗。`typecheck` script が未定義。
- `npx tsc --noEmit --pretty false`
  - 成功。型エラーなし。
- `ls node_modules/.bin | rg '^(lighthouse|playwright|next|tsc)$|lighthouse|playwright'`
  - `next`, `tsc` のみ確認。`lighthouse`, `playwright` は未導入。
- `du -sh public public/images public/*.jpg public/*.png public/images/* 2>/dev/null | sort -hr | head -40`
  - `public` 49MB、`public/images` 33MB。重い画像を確認。
- `rg -n "noindex|index: false|robots" app components lib middleware.ts next.config.mjs`
  - `/book`, `/en/book` のみ noindex。意図通り。
- `rg -n "aggregateRating|rating|reviews|口コミ|件の口コミ|遭遇率|encounterRate|高遭遇率" app components lib`
  - レビュー/遭遇率/実績数の表示箇所を確認。
- `git status --short --branch`
  - 監査前は `## main...origin/main`。作業ツリーはドキュメント作成前にクリーン。

Lighthouse:

- 未実行。
- 理由: `lighthouse` がローカルに導入されておらず、ネットワーク制限により追加導入しなかった。
- 代替: `next build` のFirst Load JS、画像サイズ、コード構成から推定監査。

Playwright:

- 未実行。
- 理由: `playwright` がローカルに導入されていなかった。

## 16. 競合比較メモ

### 検索クエリ: 宮古島 ウミガメシュノーケル

- 上位傾向
  - 写真無料、当日予約OK、初心者歓迎、子ども年齢、口コミ件数を前面に出す。
  - OTA系はレビュー数と比較表が強い。
- 海亀兄弟との差分
  - 写真無料、初心者/子連れは強い。
  - 当日予約、送迎、集合場所、口コミの出典が弱い。

### 検索クエリ: 宮古島 シュノーケリング

- 上位傾向
  - 複数プラン比較、価格、所要時間、対象年齢、手ぶら、送迎相談、女性ガイド、返金保証などの比較材料が多い。
- 海亀兄弟との差分
  - 少人数制と写真の強さはある。
  - 比較表に「送迎なし/現地集合」「手ぶら度」「初心者おすすめ度」を入れると比較負けしにくい。

### 検索クエリ: 宮古島 ウミガメ ツアー

- 上位傾向
  - ウミガメ遭遇に関する期待値管理と、高確率訴求が混在。
- 海亀兄弟との差分
  - `/miyakojima-sea-turtle` は良い受け皿。
  - 詳細ページ側の `95%` 表示は根拠整理が必要。

### 検索クエリ: 宮古島 子連れ シュノーケリング

- 上位傾向
  - 何歳から、怖がった場合、浅瀬、貸切、送迎、設備の説明が重要。
- 海亀兄弟との差分
  - 子連れ/貸切の方向性は強い。
  - トイレ/シャワー/着替え/駐車場/集合場所の前日案内理由をFAQとプラン詳細に足すべき。

## 17. 明日の朝にまず見るチェックリスト

1. `components/booking-form.tsx` のS5年齢制限矛盾を直す
2. 口コミ件数、年間案内実績、遭遇率%の根拠を確認する
3. 根拠がない数値は文言へ置き換える
4. `app/sitemap.ts` の更新日を `2026-06-19` にする
5. `components/json-ld.tsx` の `LocalBusinessJsonLd` を更新する
6. `components/home/plans-section.tsx` の比較表に `C2` を出す
7. FAQに「送迎」「集合場所」「シャワー/更衣」「非遭遇時」「当日希望」を追加する
8. `window.open` のnoopenerを追加する
9. FAQ/ギャラリー/カルーセルのaria不足を直す
10. ESLint設定を入れて `npm run lint` がCIで落ちない状態にする
