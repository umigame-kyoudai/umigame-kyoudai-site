# 海亀兄弟 Webサイト総合監査レポート

- 監査日: 2026-07-11（Asia/Tokyo）
- 対象リポジトリ: `genkidama2439-collab/umigame-kyoudai-site`
- 本番URL: https://www.umigamekyoudaimiyakojima.com
- 監査方針: 読み取り専用。ソースコード、依存関係、設定、デプロイ、Git履歴には変更を加えていない。
- このファイルは依頼に基づく監査成果物であり、修正実装ではない。

---

## A. 総合評価

### A-1. スコア

| 評価軸 | 点数 | 評価 |
|---|---:|---|
| **総合** | **61 / 100** | 技術SEOと見た目の土台は良いが、予約の保存失敗を成功扱いする不具合が売上を直接失わせ得る。信頼数値、英語SEO、計測、予約フォームの品質にも大きな改善余地がある。 |
| SEO | 74 / 100 | 65 URLのmetadata・canonical・H1・sitemapは良好。ソフト404、英語文書言語、孤立記事、星空検索意図との不一致が減点。 |
| UI/UX | 72 / 100 | 宮古島らしい配色と写真、明確な料金表示が強い。タブレットナビ、固定CTA、比較表、モーダル、フォームの負担に課題。 |
| コンバージョン | 45 / 100 | CTA配置とプラン引継ぎは良いが、予約の偽成功、在庫不在、LINE依存、検証不整合が重大。 |
| 表示速度 | 76 / 100 | 本番トップのLighthouse Performanceは81、TBT/CLSは良好。モバイルLCP 4.2秒、画像過多、予約ページCLS 0.352が課題。 |
| アクセシビリティ | 62 / 100 | Lighthouseは92〜96だが、コントラスト、フォームラベル、エラー案内、dialog、タップ領域、英語langに実害がある。 |
| 信頼性 | 48 / 100 | スタッフ・安全・アクセス・法的ページは強い。一方、口コミ/実績の根拠と内部数値の矛盾、AI生成疑義Hero、外部NAP不一致が大きい。 |
| 計測環境 | 57 / 100 | GA4とVercel Analyticsは稼働。GA4に最終予約CVが送られず、SPA page_viewやPreview除外は管理画面設定依存。 |
| コード品質 | 56 / 100 | strict TypeScript、lint/type/build成功、サーバー料金再計算は良い。予約連携、LIFF本人性、スパム/冪等性、既知脆弱性、巨大Client Componentが減点。 |

### A-2. 現状把握

| 項目 | 確認結果 | 根拠 |
|---|---|---|
| フレームワーク | Next.js 14.2.35 / React 実インストール18.3.1 | `package.json:11-45`, lockfile, `npm ls` |
| Router | App Router | `app/` 配下、`README.md:54-63` |
| 言語 | TypeScript、`strict: true` | `tsconfig.json:3-23` |
| CSS/UI | Tailwind CSS実インストール4.2.2、Radix UI、Lucide、Framer Motion | `package.json:15-31,34-44` |
| scripts | `dev`, `build`, `lint`, `start`。専用`typecheck`/`test`なし | `package.json:5-10` |
| ページ数 | sitemap 65 URL + noindex予約2 URL = 67ページ。動的ルートはJPプラン14、ENプラン8、ブログ25 | `app/sitemap.ts:23-77`, `app/plans/[id]/page.tsx`, `app/en/plans/[id]/page.tsx`, `app/blog/[slug]/page.tsx` |
| 主目的 | 「海亀兄弟」のウミガメシュノーケルを中心としたマリン体験の予約獲得 | `README.md:1-4`, `components/home/hero-section.tsx:43-55` |
| 想定ユーザー | 初めて宮古島を訪れる家族・子連れ・カップル・友人グループ、初心者、英語旅行者 | Hero、プラン説明、FAQ、英語ページ |
| 主要CV | Web仮予約、LINE相談/友だち追加、電話 | `components/tracked-cta.tsx`, `components/mobile-cta.tsx`, `components/booking-form.tsx` |
| SNS/外部導線 | LINE・電話・Google Mapsは可視。InstagramはJSON-LD `sameAs`のみで可視リンクなし | `components/json-ld.tsx:5-8`, nav/footer全検索 |
| 本番/デプロイ | Vercel。`main` pushで本番、PR/branchでPreview | `README.md:47-50`、本番response headers |
| 多言語 | 日本語 + 英語（主要ページと8プラン）。英語文書のroot `lang`は誤り | `app/en/`, `app/layout.tsx:83`, `app/en/layout.tsx:3-6` |
| 計測 | GA4 `G-Y23LDGNJXY`、Vercel Analytics。GTM/Google Ads/Meta/Clarity/Hotjarなし | `app/layout.tsx:4-5,76-80,111-118`、本番HTML/Network |
| GSC | verification meta/HTMLはなし。DNS認証の有無はコードから確認不能 | repo・本番HTML検索 |
| SEO基盤 | `sitemap.xml`, `robots.txt`, favicon/icon/apple-icon、OG/Twitter、JSON-LDあり。manifestなし | `app/sitemap.ts`, `app/robots.ts`, `app/layout.tsx`, `components/json-ld.tsx` |
| 構造化データ | WebSite、Organization、LocalBusiness、SportsActivityLocation、TouristAttraction、Product、Offer、FAQPage、BreadcrumbList、Person、BlogPosting | `components/json-ld.tsx` |
| 環境変数 | GAS/LINE secretはserver-only、LIFF/GAはpublic identifier。現行treeに実secretなし | `README.md:36-45`, `.gitignore:19-23`, secret pattern scan |

### A-3. 実行確認

| 確認 | コマンド/方法 | 結果 |
|---|---|---|
| Git | `git status --short --branch` | 監査開始時 `## main...origin/main`、差分なし。監査中のソース変更なし。 |
| Lint | `npm run lint` | **終了コード0**。`booking-form.tsx:361` と `plans-section.tsx:423` に React Hooks依存配列警告2件。 |
| 型チェック | `./node_modules/.bin/tsc --noEmit --pretty false` | **終了コード0**、エラーなし。専用scriptはない。 |
| Production build | `npm run build` | **終了コード0**、78 static pages生成。上記lint警告2件のみ。 |
| テスト | test/specファイルとtest scriptを検索 | **利用可能な自動テストなし**。未実行ではなく、実行対象が存在しない。 |
| sitemap URL | 本番sitemap 65 URLをHTTP取得 | **全65 URLが200**。 |
| 予約ページ | `/book`, `/en/book` | **両方200**、`noindex`、sitemap除外。 |
| 内部リンク | レンダリングHTMLから正規化した70件以上の固有内部リンクを取得 | **リンク切れ0、意図しない内部redirect 0**。 |
| 外部リンク | LINE、Google Privacy、Google Maps、Instagram | **すべて最終200**。Instagramは可視導線なし。 |
| 404 | `/no-such-audit-page`, `/plans/invalid`, `/en/plans/C1` | **404**。ただし存在しない`/blog/*`だけ200のソフト404。 |
| redirect | http/https、apex/www、trailing slash、旧`?page=`、旧ブログURL | http→https、apex→www、slashなしへ**308**。旧URLも308。 |
| Console/Network | 本番Lighthouse trace | 本番トップはconsole error/failed requestなし。ローカルだけ`/_vercel/insights/script.js`が404/MIME error（Vercel外のための環境差）。 |
| API障害系 | ローカルでGAS URLを意図的な404 HTMLへ向け、有効なS1予約payloadをPOST | GAS 404にもかかわらず`/api/booking`が**HTTP 200 / success:true**。重大不具合を再現。外部サービスへのPOSTはしていない。 |
| 依存監査 | `npm audit --omit=dev --json`（更新なし） | production依存に **high 3 / moderate 1 / critical 0**。Next、`@next/third-parties`、`form-data`、Next内postcss。 |

### A-4. Lighthouse / Core Web Vitals相当

Lighthouseはラボ値であり、実ユーザーのCore Web Vitalsそのものではない。INPは短時間の自動計測では評価できないため、GA/RUMまたはCrUXでのフィールド計測が必要。

| 対象 | 環境 | Perf | A11y | BP | SEO | FCP | LCP | SI | TBT | CLS | TTFB | 転送量 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | **本番・mobile** | **81** | 92 | 100 | 100 | 1.4s | **4.2s** | 5.6s | 0ms | 0 | 64ms | 1,852KiB |
| `/` | local・mobile 3回中央値 | 76 | 92 | 96 | 100 | 約1.1s | **7.68s** | 約2.6s | 0ms | 0 | — | 2,043KiB |
| `/` | local・desktop | 96 | 92 | 96 | 100 | 0.3s | 1.4s | 0.3s | 0ms | 0 | — | 2,244KiB |
| `/plans/S1` | local・mobile | 83 | 96 | 96 | 100 | — | 4.7s | — | — | — | — | 543KiB |
| `/book` | local・mobile | 79 | 92 | 96 | 69* | — | 2.7s | — | — | **0.352** | — | 357KiB |
| blog代表記事 | local・mobile | 90 | 94 | 96 | 100 | — | 3.6s | — | — | — | — | 363KiB |
| `/en` | local・mobile | 84 | 96 | 96 | 100 | — | 4.6s | — | — | — | — | 746KiB |

\* `/book`のSEO 69は意図的な`noindex`による監査減点を含み、検索流入ページとしての問題ではない。

画面確認の制約: 専用のアプリ内ブラウザruntimeが利用不可だったため、依頼された360/375/390/430/768/1024/1440pxすべてを個別に対話操作することはできなかった。実画面はLighthouseのmobile（約412px）/desktop screenshotと本番HTML/traceで確認し、その他幅はCSS breakpointとDOM構造をコード検証した。したがって768〜1024pxのナビ過密、360pxの固定CTA幅などは「コード上の高確率リスク」と明記し、再現済みと断定していない。

---

## B. 経営者向け要約

このサイトは、宮古島の海らしい写真、料金、対象年齢、写真無料、キャンセル条件が最初の画面で分かり、初めての旅行者がサービス内容を理解しやすい点が強みです。安全対策、集合場所、スタッフ、FAQ、規約まで揃っており、技術SEOも多くの項目が正しく実装されています。

最大の問題は、予約を保存するGoogle Apps Scriptが404/500やHTMLを返しても、サイトが「予約送信成功」と旅行者に表示することです。実際にローカルで再現できました。旅行者は予約できたと思い、運営側には予約が届かないため、売上と信用を同時に失い得ます。最初の修正はこれでなければなりません。

次に、予約CTAは「空き確認」と書かれていますが、実装は在庫を照会せず希望日時を送る仮予約です。LINEログイン、友だち追加状態、共有端末に残るLINE ID、人数条件、クーポン金額にも不整合があります。予約率を上げる前に「正しく届く・正しい相手へ連絡できる・表示金額が一致する」状態を作る必要があります。

信頼面では「口コミ10,136+」「年間案内5,000+」等の大きな数値に出典がなく、同じサイト内の口コミ件数とも矛盾します。外部予約サイトの公開レビュー件数はActivity Japan 2件、じゃらん1件で、サイト上の数千件表示との集計根拠が読み手に分かりません。事実であっても、媒体・期間・集計方法を示さないと誇張に見えます。トップHeroもファイル名からAI生成画像と推測され、体験商品の「現地で本当に撮れた写真か」という信頼を弱めます。

指定された「宮古島 星空フォト」等に対して、現行サイトはウミガメ・SUP・ヤシガニのサイトで、星空撮影商品はありません。実際に星空フォトを提供するなら商品、料金、所要時間、納品、雨天対応を備えた専用ページが必要です。提供しないなら、検索語だけを無理に追加すべきではありません。

---

## C. 良い点

1. **技術SEOの基本が強い**: sitemap 65 URLは全200、各ページにtitle/description/canonical/H1があり、重複もなかった。
2. **hreflangが相互**: 対応する日本語/英語14組は相互リンクを実測確認した。UTM付きURLもcanonicalはクリーン。
3. **リダイレクトが整理済み**: HTTP→HTTPS、apex→www、trailing slash、旧URLは308で正規URLへ統合される。
4. **検索結果の訴求が良い**: 日本語トップは「宮古島ウミガメシュノーケル」を前方に置き、写真無料・初心者OKを伝える。
5. **予約前情報が豊富**: 料金、所要時間、対象年齢、含有物、持ち物、雨天・中止、キャンセル、写真納品がプラン詳細にある。
6. **第一画面の理解が速い**: 大人/子供料金、5歳から、写真無料、前日キャンセル無料をHero内で確認できる。`components/home/hero-section.tsx:8-18,43-55`
7. **CTA配置が一貫**: Hero、カード、詳細末尾、固定バー、footerに予約/LINE導線があり、`?plan=`で選択プランを予約へ引き継ぐ。
8. **不安解消ページが充実**: `/staff`, `/safety`, `/access`, `/faq`, `/terms`, `/privacy`, `/tokushoho` が信頼形成に寄与する。
9. **写真資産が豊富**: galleryや各ツアー画像は宮古島らしさと体験の魅力を伝える。`next/image`を一貫使用し、生の`img`は見当たらない。
10. **画像配信設定が良い**: AVIF/WebP、`sizes`、Heroの`priority`、長期キャッシュを設定。`next.config.mjs:18-35`
11. **サーバー側価格検証がある**: クライアントの合計額/割引を信用せず、サーバーで料金とクーポンを再計算する。`app/api/booking/route.ts:398-413`
12. **主要入力のサーバー検証がある**: プラン、日付、時刻、スタッフ、年齢区分をAPIで再検証する。
13. **現在のtreeに秘密情報なし**: GAS/LINE secretはserver env、LIFF/GAは公開identifierとして分離され、`.env`/`.vercel`もignore済み。
14. **外部リンク安全性**: `target="_blank"`は`noopener`/`noreferrer`、LINE/Map/InstagramのURL自体も到達可能。
15. **セキュリティheader**: nosniff、SAMEORIGIN、Referrer-Policy、Permissions-Policy、本番HSTSを確認。
16. **ブラウザsource map非公開**: 代表的なproduction static chunkの`.map`は404。
17. **GAへPIIを送っていない**: 明示イベントはplan、人数、金額、locale、source等で、氏名・電話・email・LINE IDは含まれない。
18. **構造化データが広い**: WebSite、Organization、LocalBusiness、Product/Offer、FAQ、Breadcrumb、Person、BlogPostingを実装し、全JSONがparse可能。
19. **検索エンジンが本文を取得可能**: Client Componentを含むページも主要本文はSSR HTMLに存在し、JavaScriptのみには依存していない。
20. **品質ゲートが概ね通る**: lint、TypeScript、production buildはいずれも終了コード0。

---

## D. 重大な問題

### Critical

#### C-1. GASの404/500/HTML応答を予約成功として扱う

| 項目 | 内容 |
|---|---|
| 優先度 | **Critical** |
| 対応状況 | **2026-07-11 修正・検証済み** |
| 対象ページ | `/book`, `/en/book`, `/api/booking` |
| 対象ファイル/行 | `lib/services/gas-service.ts:59-115`, `app/api/booking/route.ts:432-444`, `components/booking-form.tsx:525-545`, `components/booking-form-en.tsx:295-310`, `lib/services/gas-service.test.mjs:1-66` |
| 現状 | `response.ok`を必須とし、本文がJSON objectかつ`success === true`の場合だけ成功とする。404、500、HTML、空、不正JSON、`success:false`、成功フラグ欠落はすべて失敗する。 |
| 問題となる理由 | 予約シートへ保存されていなくても旅行者には完了画面が出る。 |
| ユーザーへの影響 | 予約済みと思って他社を探さず、現地で予約がないことに気付く。旅行機会と信用を失う。 |
| SEOへの影響 | 直接のindex影響はないが、苦情・低評価・指名検索の評判悪化につながる。 |
| 推奨修正 | **実施済み:** GAS異常を固定文言のHTTP 502へ変換し、内部情報をAPIレスポンスへ含めない。日英フォームもHTTP 2xxだけで完了せず、API JSONの`success:true`を確認してから完了画面を表示する。異常系をNode標準テストでfixture化した。 |
| 修正難易度 | 低 |
| 想定工数 | 2〜4時間 + GAS正常応答確認 |
| 依存関係 | 現行GASの正常response仕様、Vercel環境変数 |
| 根拠 | 修正前はローカルの404 HTMLでAPIがHTTP 200・`success:true`を返した。修正後は同じ条件でHTTP 502と安全な固定文言を返し、正常な`{"success":true}`ではHTTP 200を維持。単体テスト10件、lint、型チェック、production buildも成功。GAS本番へのテスト送信は未実施。 |

### High

#### H-1. Git履歴から到達可能なGAS deploymentと、GAS側の認証欠如

| 項目 | 内容 |
|---|---|
| 優先度 | **High（該当deploymentにdoPostが残る場合はCritical）** |
| 対象ページ | 外部GAS予約受付、`/api/booking` |
| 対象ファイル/行 | `lib/services/gas-service.ts:54-60`, `docs/gas-line-notify.js:667-703`, Git履歴（URLは本レポートに記載しない） |
| 現状 | public Git履歴に過去GAS URLがあり、2件中1件は現在もWeb App応答へ到達。Next→GASにHMAC/shared secretがなく、同梱GAS例の`doPost`も認証なし。 |
| 問題となる理由 | URLを知る第三者がNextの検証/レート制限を迂回できる可能性がある。 |
| ユーザーへの影響 | 予約シート、通知メール、カレンダーが偽予約で汚染され、本予約を見落とす。 |
| SEOへの影響 | 直接なし。運用品質・評判への間接影響は大きい。 |
| 推奨修正 | Apps Script管理画面で全deploymentを棚卸しし未使用を失効。現行はtimestamp + nonce + HMAC、replay防止をGAS側で検証。履歴削除だけに頼らない。 |
| 修正難易度 | 中 |
| 想定工数 | 棚卸し30分、認証0.5〜1日 |
| 依存関係 | Apps Script/Vercel env管理権限 |
| 根拠 | GETのみ安全に確認。1件404、1件は「doGetがない」型のHTTP 200。副作用回避のためPOSTは未実施し、現行URLとの同一性も未断定。 |

#### H-2. 永続化LINE IDを本人確認せず予約へ利用する

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対応状況 | **2026-07-11 修正・ローカル検証済み。本番反映前に`LINE_LOGIN_CHANNEL_ID`設定とLIFF `openid` scope確認が必要** |
| 対象ページ | `/book`, `/en/book`, `/api/booking` |
| 対象ファイル/行 | `components/liff-provider.tsx:34-139`, `components/booking-form.tsx:222-236,496-501,711-733,1682-1711`, `components/booking-form-en.tsx:85-89,257-289`, `app/api/booking/route.ts:49-52,335-370,409-428`, `lib/services/line-login-service.ts:1-113`, `lib/services/line-login-service.test.mjs` |
| 現状 | localStorageに残る旧LINE ID/display nameを起動時に削除し、復元・再保存しない。クライアントは`liff.getIDToken()`だけを予約APIへ送り、APIがLINE公式`POST /oauth2/v2.1/verify`でChannel ID・issuer・期限・`sub`を確認する。GASへ渡すuserId/display nameは検証レスポンスからのみ生成する。 |
| 問題となる理由 | 共有端末、logout後、localStorage改変で別人のIDが予約に付く。 |
| ユーザーへの影響 | 予約確定通知や旅行情報が別ユーザーへ届き、本人には届かない。個人情報事故にもなる。 |
| SEOへの影響 | 直接なし。信頼・口コミへ間接影響。 |
| 推奨修正 | **実施済み:** 永続ID復元を廃止し、freshなLIFF sessionとID tokenでgate。予約時にID tokenをLINE公式APIで検証し、userIdをサーバー側で確定する。 |
| 修正難易度 | 中〜高 |
| 想定工数 | 1〜2日 |
| 依存関係 | Vercelへserver-onlyの`LINE_LOGIN_CHANNEL_ID`設定、LIFF appの`openid`/`profile` scope、実LINEテストアカウント |
| 根拠 | LINE検証serviceの自動テスト13件とC-1を含む全23件が成功。APIはtoken欠落を401、Channel ID未設定を503で拒否し、GAS処理へ進まないことをローカル確認。lint、型チェック、production buildも成功。LINE本番API/GASへのテスト送信は未実施。 |

#### H-3. 「空き確認」と表示するが在庫・満席確認がない

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対象ページ | `/`, `/plans`, `/plans/*`, `/book` と英語版 |
| 対象ファイル/行 | `components/home/hero-section.tsx:80-88`, `components/booking-form.tsx:1181-1295`, `app/api/booking/route.ts:174-243,362-435` |
| 現状 | CTAは「空き確認・予約する」だが、日時候補は静的。既存予約/枠数/満席を照会せず希望をGASへ送る仮予約。 |
| 問題となる理由 | 旅行者が即時在庫確認・予約確定と誤認する。売止・開催不可・代替日も表示できない。 |
| ユーザーへの影響 | 長い入力後にLINE返信待ちとなり、急ぐ旅行者が離脱または二重予約する。 |
| SEOへの影響 | 直接小。検索結果からの期待不一致、行動指標・評判に影響。 |
| 推奨修正 | 実在庫を連携するか、全CTAを「空き状況を問い合わせる」「仮予約を申し込む」に変更し、確定時期を第一画面とフォーム冒頭に明示。 |
| 修正難易度 | 文言変更は低、在庫連携は高 |
| 想定工数 | 文言2〜4時間、在庫1〜3週間 |
| 依存関係 | 予約台帳/Activity Japan/じゃらん等の在庫運用方針 |
| 根拠 | コードに在庫API、残数、sold-out判定がない。 |

#### H-4. 予約条件・金額・同意のクライアント/サーバー不整合

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対象ページ | `/book`, `/en/book`, `/api/booking` |
| 対象ファイル/行 | `components/booking-form.tsx:423-466,531-541,564-572,1315-1353,1644-1648`, `app/api/booking/route.ts:32-52,220-231,398-413`, `lib/data.ts:244`, `lib/constants/coupons.ts:18-32` |
| 現状 | 子どものみをclientは有効判定するがserverは成人必須。S2最大6名表示でも上限なし。クーポン適用後に人数を変えても表示割引を再計算せず、成功responseのserver totalも無視。規約同意はAPIで検証しない。 |
| 問題となる理由 | 長いフォームの最後で400、運用外人数、表示金額と記録金額の差、直接APIで同意なし予約が生じる。 |
| ユーザーへの影響 | 離脱、金額トラブル、予約受付条件への不信。 |
| SEOへの影響 | 直接なし。評判・CVRへ大きな間接影響。 |
| 推奨修正 | 条件を共通schema/マスタ化。client/server両方で成人・最大人数・年齢・同意を検証。成功responseの`totalPrice/couponDiscount`を完了画面へ使用。人数変更時はcoupon再計算。 |
| 修正難易度 | 中 |
| 想定工数 | 1〜2日 |
| 依存関係 | 正式な参加条件/規約/クーポン運用 |
| 根拠 | 上記コードパスの条件を突合。lintも`participants`依存配列欠落を警告。 |

#### H-5. 二重送信・スパム・巨大payloadへの防御不足

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対象ページ | `/book`, `/en/book`, `/api/booking`, `/api/coupon`, `/api/line/notify` |
| 対象ファイル/行 | `components/booking-form.tsx:469-475,1713-1720`, `components/booking-form-en.tsx:261-265,688-694`, `app/api/booking/route.ts:71-94,174-243,398-416`, `app/api/coupon/route.ts:7-28`, `docs/gas-line-notify.js:681-703` |
| 現状 | UIのdisabled以外に冪等キーなし。rate limitはinstance内Map。CAPTCHA/honeypotなし。participants・文字列・bodyサイズ上限が不足。GAS例は無条件`appendRow`。 |
| 問題となる理由 | Vercel複数instance/再起動で制限を迂回でき、retry/timeoutで重複予約も起こる。 |
| ユーザーへの影響 | 重複確定、誤請求不安、返信遅延。運営は偽予約処理に時間を失う。 |
| SEOへの影響 | 直接なし。可用性・評判に間接影響。 |
| 推奨修正 | client即時ref lock、`Idempotency-Key`、GAS/server側duplicate判定、durable rate limit、honeypot/Turnstile、schema/文字数/人数/body上限。 |
| 修正難易度 | 中 |
| 想定工数 | 1〜2日 |
| 依存関係 | KV/Upstash等の追加可否、GAS列/ストレージ変更 |
| 根拠 | 同一requestを識別するキーとdurable storeが存在しない。 |

#### H-6. 口コミ・実績・遭遇率の根拠不足と内部矛盾

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対象ページ | `/`, `/plans/*`, `/miyakojima-sea-turtle` |
| 対象ファイル/行 | `components/home/stats-section.tsx:12-17`, `components/home/plans-section.tsx:57-58,96-97,132-133`, `lib/plan-details.ts:68-69,123,170,217,365`, `lib/beach-info.ts:6-18`, `components/json-ld.tsx:185,217` |
| 現状 | トップは口コミ10,136+、年間案内5,000+。カードの主要口コミ合計は10,623、S1は一覧5,089と詳細3,842で不一致。95%/80%遭遇率も期間・母数なし。JSON-LDでは検証不能としてratingを意図的に除外。 |
| 問題となる理由 | 旅行者は大きな数値を予約判断に使う。出典なし/矛盾は誇張と受け取られ、表示の適法性も要確認。 |
| ユーザーへの影響 | 一度矛盾に気付くと、安全・写真・予約情報まで疑われる。 |
| SEOへの影響 | E-E-A-T、ブランド検索、口コミ評価に影響。構造化データへ出していない判断は正しい。 |
| 推奨修正 | 媒体、対象商品、集計期間、母数、更新日、算出式を公開。単一マスタ化。証明できない数値は削除/定性表現へ。 |
| 修正難易度 | 技術は低、事実確認は中 |
| 想定工数 | 0.5〜1日 + 証憑収集 |
| 依存関係 | 各予約媒体/Instagram/社内台帳の実績データ、法務判断 |
| 根拠 | Activity Japan公開ページは5.0・2件、じゃらんは5.0・1件（2026-07-11確認）。数千件が別媒体合算ならその説明が必要。 |

#### H-7. 英語ページの文書言語とtitle設計が誤っている

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対象ページ | `/en` 配下全ページ |
| 対象ファイル/行 | `app/layout.tsx:18-22,83`, `app/en/layout.tsx:3-6`, `app/en/plans/page.tsx:14-20`, `app/en/plans/[id]/page.tsx:20-29` |
| 現状 | 本番documentは全て`<html lang="ja">`。英語titleに日本語root suffix「海亀兄弟 - 宮古島」が追加され、14ページ中10ページが60文字超、最長85文字。descriptionは最大202文字。 |
| 問題となる理由 | 読み上げ発音、翻訳、検索エンジンの言語判定、SERPの省略に影響。 |
| ユーザーへの影響 | 英語話者の支援技術で誤発音し、検索結果も不自然。 |
| SEOへの影響 | 国際SEO、CTR、言語関連性に直接影響。hreflang自体は相互で良好。 |
| 推奨修正 | locale別root layoutで英語`html lang=en`、言語別title template/absolute title、descriptionを検索意図に沿って短縮。 |
| 修正難易度 | 中（App Router構成変更） |
| 想定工数 | 1〜2日 |
| 依存関係 | route group構成、全EN metadata回帰 |
| 根拠 | 本番HTMLとmetadata全件実測。 |

#### H-8. 存在しないブログURLがHTTP 200のソフト404

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対象ページ | 任意の存在しない`/blog/[slug]` |
| 対象ファイル/行 | `app/blog/[slug]/page.tsx:7-19,31-35`, `app/blog/[slug]/not-found.tsx:5-20`, `app/blog/layout.tsx:4-9` |
| 現状 | `/blog/definitely-not-real-123`がHTTP 200。「記事が見つかりません」、canonical `/blog`、root/index followとNext noindexが同居。 |
| 問題となる理由 | 検索エンジンが404を正しく判断できず、crawl budgetと品質シグナルを浪費する。 |
| ユーザーへの影響 | 見つからない画面なのにブラウザ/監視は成功扱い。 |
| SEOへの影響 | ソフト404、canonical矛盾、不要URLのクロール。 |
| 推奨修正 | 静的記事のみなら`export const dynamicParams = false`。未知slugのstatus、canonical、robotsを統合テスト。 |
| 修正難易度 | 低 |
| 想定工数 | 1〜2時間 |
| 依存関係 | 将来CMSで動的記事を出す予定の有無 |
| 根拠 | local/production双方でHTTP 200を実測。一般404とinvalid planは404。 |

#### H-9. ブログ後半7記事が内部リンク0でsitemap依存

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対象ページ | `/blog` と後半記事7件 |
| 対象ファイル/行 | `components/blog/blog-index-client.tsx:13,36-39,188-195` |
| 現状 | 初期12件のみSSR。「さらに記事を表示」後のリンクは初期HTMLにない。関連記事にも出ない7記事は内部被リンク0。 |
| 問題となる理由 | sitemapだけでは内部PageRankと発見経路が弱く、ユーザーもクリック操作なしに一覧できない。 |
| ユーザーへの影響 | 過去記事を見つけにくい。 |
| SEOへの影響 | 孤立ページ化、クロール頻度・評価伝播低下。 |
| 推奨修正 | 全記事リンクをSSRするか、`?page=2`等のcrawlableなpaginationと次/前リンクを実装。カテゴリページも検討。 |
| 修正難易度 | 低〜中 |
| 想定工数 | 0.5〜1日 |
| 依存関係 | 一覧UX/URL方針 |
| 根拠 | 実HTMLの内部リンクgraphを取得し、7 slugでinbound 0を確認。対象はcoral、photo-spot、hotel、repeater、gourmet、couple、family。 |

#### H-10. モバイルLCPと予約ページCLSが基準を外れる

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対象ページ | `/`, `/book`, blog記事、`/faq`, `/plans/[id]` |
| 対象ファイル/行 | `components/home/plans-section.tsx:393-503`, `app/book/page.tsx:38-42`, `app/blog/[slug]/BlogPostClient.tsx:52-63`, `components/faq-hero.tsx:9-18`, `components/plan-detail-page.tsx:1-999` |
| 現状 | 本番home mobile LCP 4.2秒、Speed Index 5.6秒、画像1.85MB。Lighthouseは画像569KiB削減余地。local homeは画像削減1.41MB。`/book` CLS 0.352。FAQ/Blogのabove-fold画像は`loading=lazy`。 |
| 問題となる理由 | LCP良好基準2.5秒以下、CLS良好基準0.1以下を超える。 |
| ユーザーへの影響 | 旅行中のモバイル回線で第一印象が遅く、予約フォーム表示時にfooterが大きく動く。 |
| SEOへの影響 | CWVとモバイル体験に影響。TBT 0/CLS 0のトップは良い。 |
| 推奨修正 | Hero以外の初期画像数を削減、carouselをviewport近傍まで遅延、適切な`quality/sizes`、FAQ/Blog Heroをpriority、Book fallbackと最終フォームの高さを近づける。 |
| 修正難易度 | 中 |
| 想定工数 | 2〜4日 |
| 依存関係 | 画像選定、デザイン、実機/Lighthouse回帰 |
| 根拠 | Lighthouse実測。最大級assetは`day-sup-topdown`約394KB、publicには最大約1.9MBの元画像がある。 |

#### H-11. 予約フォーム/モーダル/配色のアクセシビリティ不足

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対応状況 | **2026-07-11 全3弾完了。第1弾（77e0814）**: 送信ボタン直前に未入力項目チェックリスト（ja/en、isFormValidと同条件）、参加者欄のlabel/id関連付け、連絡先のautoComplete。**第2弾（c8129ef）**: homeのcontrast 53→1件（残1件はLINEブランド色#06C755を意図的に維持）、タップ領域13→0件（ドットは見た目維持で24pxボタン化）、Lighthouse a11y 0.92→0.96。**第3弾（5058ab3）**: gallery lightboxにrole=dialog/aria-modal/フォーカストラップ・復元、予約フォーム章見出しを実h2化（CardTitleにas prop）、送信完了画面で見出しへフォーカス移動＋jaオーバーレイをdialog化。未対応で残るのはfieldset/legend化のみ（優先度低） |
| 対象ページ | `/book`, `/en/book`, `/gallery`, `/`, `/plans`, blog |
| 対象ファイル/行 | `components/participant-form.tsx:53-141`, `components/booking-form-en.tsx:477-520`, `components/ui/card.tsx:31-38`, `components/booking-form.tsx:564-588,590-688,1713-1722`, `components/image-gallery.tsx:48-121`, `components/home/plans-section.tsx:485-493,744-754` |
| 現状 | labelとinputの関連なし、章見出しが`div`、無効buttonだけで不足理由なし、dialog role/focus trapなし。homeはcontrast違反53件、タップ領域違反13件。 |
| 問題となる理由 | WCAG 2.1 AAの名前・役割・値、コントラスト、フォーカス、エラー識別を満たしにくい。 |
| ユーザーへの影響 | 読み上げ/キーボード利用者だけでなく、長いフォームで全ユーザーが「なぜ送れないか」分からず離脱する。 |
| SEOへの影響 | 直接の順位要因とは限定できないが、UX・HTML品質・CVRに影響。 |
| 推奨修正 | `id/htmlFor`, `fieldset/legend`, 実見出し、inline error + summary + focus移動、Radix Dialog等、44px target、色を4.5:1以上へ。 |
| 修正難易度 | 中 |
| 想定工数 | 3〜5日 |
| 依存関係 | デザインtoken、支援技術/keyboard QA |
| 根拠 | Lighthouse a11y 92〜96でも、home contrast 53件、coupon input label、dialog/focusをDOM/コードで確認。 |

#### H-12. GA4に最終予約コンバージョンが送られない

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対象ページ | 全ページ→`/book`, `/en/book` |
| 対象ファイル/行 | `lib/analytics.ts:5-24,35-48`, `components/booking-form.tsx:531-546`, `components/booking-form-en.tsx:300-312` |
| 現状 | Vercelには`booking_submitted`等8種を送るが、GA mapは`line_click`, `phone_click`, `reservation_click`の3種だけ。GAで取れる最深地点は予約CTAクリック。 |
| 問題となる理由 | 流入/広告/LP別に実予約リクエストを評価・最適化できない。 |
| ユーザーへの影響 | 直接なし。誤ったマーケティング判断で集客費と改善機会を失う。 |
| SEOへの影響 | SEO施策の成果測定が不可能に近くなる。順位そのものには直接影響しない。 |
| 推奨修正 | 仮予約成功をGA4の`generate_lead`または統一custom eventへ送信しKey Event化。`value/currency/plan/locale/source`を統一。後日の確定は別event。 |
| 修正難易度 | 低 |
| 想定工数 | 2〜4時間 + DebugView確認 |
| 依存関係 | GA4管理権限、広告連携方針 |
| 根拠 | 本番初回`page_view`は1件で二重送信なし。コード上のevent mapを全件確認。 |

#### H-13. production依存に既知脆弱性

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対象ページ | サイト全体、API |
| 対象ファイル/行 | `package.json:12-30,39-45`, lockfile |
| 現状 | `npm audit --omit=dev`でhigh 3、moderate 1。Next 14.2.35 / `@next/third-parties`、`form-data@4.0.5`、Next内postcss。 |
| 問題となる理由 | RSC DoS/cache系等の複数advisoryがあり、公開サイトで放置すべきでない。すべてが現コードで悪用可能とは未断定。 |
| ユーザーへの影響 | 可用性/安全性リスク。 |
| SEOへの影響 | 障害や改ざんが起きれば大。通常時の直接影響なし。 |
| 推奨修正 | 承認後、別branchでNext/@next packagesを同時に安全な版へ。LINE SDKは`form-data`解消版を選定。全ルート/予約回帰後に段階deploy。 |
| 修正難易度 | Next majorは高、patch/minorは中 |
| 想定工数 | Next 2〜5日、LINE 0.5〜1日 |
| 依存関係 | Next公式migration、Node/Vercel runtime、LIFF/GAS E2E |
| 根拠 | 2026-07-11時点の読み取り専用audit。更新は一切実施していない。 |

#### H-14. 768〜1024pxのnav過密とモバイル固定CTAの重なりリスク

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対象ページ | nav/MobileCTAを使う全ページ、特に`/`, `/plans`, `/gallery` |
| 対象ファイル/行 | `components/navbar.tsx:66-117`, `components/mobile-cta.tsx:18-47`, `components/footer.tsx:55-131`, `components/image-gallery.tsx:48-121`, `components/home/plans-section.tsx:663-703` |
| 現状 | `md`=768pxからロゴ+7 nav+言語+LINE+予約を1行表示。固定CTA分の全体bottom padding/safe-areaなし。gallery lightboxとCTAが同じ`z-50`。比較表は360pxでも4列・11pxのdiv grid。 |
| 問題となる理由 | タブレットで圧縮/折返し、モバイルでfooter/Lightbox被覆、比較表の可読性低下が起こり得る。 |
| ユーザーへの影響 | 誤タップ、内容を読めない、閉じるUIを操作しにくい。 |
| SEOへの影響 | モバイルUX、CVRへの間接影響。 |
| 推奨修正 | desktop navを`xl`寄りに、mobile CTAのsafe-areaとbody/footer bottom padding、z-index階層を定義。mobile比較はカード、desktopはsemantic table。 |
| 修正難易度 | 中 |
| 想定工数 | 1〜2日 |
| 依存関係 | 360/375/390/430/768/1024/1440の実機回帰 |
| 根拠 | CSS/DOM構造による高確率リスク。専用ブラウザruntime不在のため指定全幅での再現断定はしていない。 |

#### H-15. 星空フォト系検索意図と現行商品が一致しない

| 項目 | 内容 |
|---|---|
| 優先度 | **High（星空商品を実際に提供する場合）** |
| 対象ページ | サイト全体、特に`/`, `/plans/S3`, `/plans/S5` |
| 対象ファイル/行 | `components/home/hero-section.tsx:43-55`, `lib/plan-details.ts:53-775`, `content/blog/miyakojima-couple-romantic-2nights-3days.md:26,47,61-62,102-104` |
| 現状 | サイトはウミガメ・SUP・ヤシガニ商品。日本語の星空は一般観光記事の6箇所だけで、星空撮影プラン、料金、所要時間、写真納品、metadata、LPがない。 |
| 問題となる理由 | 指定キーワードで訪れる人の目的を満たさず、キーワード追加だけでは予約につながらない。 |
| ユーザーへの影響 | 「星空フォトを予約できる」と期待した人は即離脱する。 |
| SEOへの影響 | 星空10キーワードのうち7つは適合0〜ほぼ0。ナイト/雨の日/夜アクティビティは強い。 |
| 推奨修正 | 提供実態を先に確定。提供するなら専用商品/LPに撮影者、作例、天候/月齢、納品枚数/形式、料金、所要時間、集合、安全、キャンセルを実装。提供しないなら狙わない。 |
| 修正難易度 | 商品がある場合は高 |
| 想定工数 | コンテンツ/撮影2〜5日、予約連携を含め1〜2週間 |
| 依存関係 | 実サービス内容、作例、撮影者、催行/雨天ポリシー |
| 根拠 | repo全文検索。英語ナイトツアーにだけ`star-filled skies`があり、日英の商品説明も要整合確認。 |

#### H-16. サイト内NAPと外部の住所・営業時間・旧URLが不一致

| 項目 | 内容 |
|---|---|
| 優先度 | **High** |
| 対象ページ | footer、`/access`, `/privacy`, `/tokushoho`、LocalBusiness schema |
| 対象ファイル/行 | `components/footer.tsx:7-14,81-84`, `components/json-ld.tsx:80-105`, `app/access/page.tsx:54-69`, `app/tokushoho/page.tsx:18-25` |
| 現状 | サイト内は「平良松原107-1 / 7:00〜18:00」。Activity Japan・じゃらんと沖縄県警の2025-11-30現在資料は「平良西里861-5」。Activity Japanは9〜17時、homepageも旧Vercel URL。 |
| 問題となる理由 | 住所移転後の外部未更新か、サイト側誤りかは断定できないが、NAP不一致はLocal SEOと来訪信頼を損なう。 |
| ユーザーへの影響 | 事務所を集合場所と誤認し、誤った場所へ向かう可能性。 |
| SEOへの影響 | GBP/引用情報の一貫性低下、entity理解とローカル検索の信頼低下。 |
| 推奨修正 | 正式な事業者所在地・来訪可否を証憑で確認し、GBP、Activity Japan、じゃらん、許認可届、schema、footerを同期。「集合場所ではない」も明記。 |
| 修正難易度 | 技術は低、外部更新は中 |
| 想定工数 | サイト2〜4時間、外部申請0.5〜1日 + 審査待ち |
| 依存関係 | 事業者の正式住所、GBP/パートナー管理権限 |
| 根拠 | [Activity Japan](https://activityjapan.com/publish/feature/9169)、[じゃらん](https://www.jalan.net/kankou/spt_guide000000230140/)、[沖縄県警届出事業者資料](https://cms.police.pref.okinawa.jp/docs/2020092200018/file_contents/R7_12_02_02_.pdf)を2026-07-11確認。 |

### Medium

#### M-1. 最重要HeroがAI生成画像と推測され、実体験の証拠として弱い

| 項目 | 内容 |
|---|---|
| 優先度 | **Medium（ブランド信頼を重視するならHigh）** |
| 対象ページ | `/`, `/en`, `/en/miyakojima-sea-turtle`、LocalBusiness schema |
| 対象ファイル/行 | `components/home/hero-section.tsx:24-35`, `app/en/page.tsx:37-45`, `components/json-ld.tsx:39,104` |
| 現状 | `gemini-generated-image-rq969urq969urq96.jpeg`をHeroと事業画像に使用。ファイル名から生成画像と推測できるが、生成経緯自体は断定しない。画面上に実参加者/ガイドはいない。 |
| 問題となる理由 | 体験サイトの写真は「実際にここでこの景色が見える」「この品質で撮ってもらえる」という証拠として機能する。 |
| ユーザーへの影響 | 美しい一方、広告イメージに見え、予約直前の安心を弱める。 |
| SEOへの影響 | 直接は小。E-E-A-T、画像検索、ブランド信頼に間接影響。 |
| 推奨修正 | 本ツアーで撮影したHero用実写へ。撮影場所・撮影者・実際の参加イメージが分かるcaption/altも検討。 |
| 修正難易度 | 低〜中 |
| 想定工数 | 画像選定/最適化2〜4時間、撮影が必要なら別途 |
| 依存関係 | 掲載許諾済み実写、モデルリリース |
| 根拠 | ファイル名、画像実体、使用箇所を確認。 |

#### M-2. ブログの出典・監修者・更新表示が不足し、AI的な定型感がある

| 項目 | 内容 |
|---|---|
| 優先度 | **Medium** |
| 対象ページ | blog 25記事、特に外部出典0の17記事 |
| 対象ファイル/行 | `content/blog/*.md`, `lib/blog/posts.ts:36-43`, `app/blog/[slug]/BlogPostClient.tsx:86-92,243-250`, `components/json-ld.tsx:283-290` |
| 現状 | 8記事は公式確認先3〜6件あり、17記事は店舗/ホテル/営業時間/安全/季節情報を含むが外部URL0。著者は「海亀兄弟編集部」またはUIで一律「海亀兄弟ガイド」。画面に更新日なし。`完全ガイド/完全網羅/おすすめ`が反復。 |
| 問題となる理由 | 旅行情報は営業時間、交通、台風、海況が変わる。出典と更新責任者がないと古い情報を見分けられない。 |
| ユーザーへの影響 | 閉店・時間変更・危険情報の誤認。文章が一般論中心に見え、現地ガイドの強みを感じにくい。 |
| SEOへの影響 | Experience/Expertise/Trustと有用性評価に影響。 |
| 推奨修正 | 実名監修者/資格/経験、確認日、更新日、公式出典、一次写真、現地固有の観察を追加。記事ごとに検索意図を1つへ絞る。 |
| 修正難易度 | 中 |
| 想定工数 | 17記事で3〜7日 |
| 依存関係 | 編集責任者、公式情報確認、写真権利 |
| 根拠 | Markdown全件のURL数、frontmatter、表示component、BlogPosting schemaを確認。 |

#### M-3. 参加条件・健康条件・口コミ内容がページ間で矛盾

| 項目 | 内容 |
|---|---|
| 優先度 | **Medium〜High** |
| 対象ページ | `/`, `/plans/S1`, `/plans/S2`, `/safety`, `/terms`, `/book` |
| 対象ファイル/行 | `lib/plan-details.ts:85,121,138,151`, `lib/plan-flags.ts:29-40`, `app/api/booking/route.ts:150-155`, `components/home/plans-section.tsx:325-335`, `app/safety/page.tsx:89-96`, `app/terms/page.tsx:62-68` |
| 現状 | S2は5〜65歳だが口コミは3歳参加。通常は5〜65歳表示だがAPIは60歳以上を貸切へ誘導。持病は「参加不可」と「個別相談」が混在。 |
| 問題となる理由 | 安全に関わる参加可否は、マーケティング表示とAPIで1文字でも違うべきでない。 |
| ユーザーへの影響 | 子ども/シニア/持病のある旅行者が予約終盤で拒否される、または誤って参加可能と思う。 |
| SEOへの影響 | FAQ/本文の整合性、信頼性に影響。 |
| 推奨修正 | 年齢・健康・貸切例外を単一マスタ化し、Hero/一覧/詳細/FAQ/規約/APIを生成。過去口コミには「当時条件」等の注記か不適合内容を非掲載。 |
| 修正難易度 | 中 |
| 想定工数 | 1〜2日 + 運用確認 |
| 依存関係 | 保険/安全基準、実際の催行ルール |
| 根拠 | 同一プランの表示とserver validationを突合。 |

#### M-4. 構造化データが重複・不足し、Coming SoonをPreOrder表示

| 項目 | 内容 |
|---|---|
| 優先度 | **Medium** |
| 対象ページ | 全ページ、`/plans/*`, `/en/plans/*`, `/gallery`, `/faq` |
| 対象ファイル/行 | `components/json-ld.tsx:31-43,80-105,106-223`, `app/en/plans/[id]/page.tsx:42-48`, `lib/plan-details.ts:730-775` |
| 現状 | OrganizationとLocalBusinessが別IDで関係付け不足。`makesOffer`にS2/S4/S5/slide-boat欠落。Coming Soonのslide-boatは予約不可でも`PreOrder`。EN planにProduct/Service/Offerなし。visible FAQのあるplanにFAQPageなし。ImageObject/WebPageは未実装。 |
| 問題となる理由 | entity/offer状態が実画面と一致せず、リッチリザルトの意味が弱い。 |
| ユーザーへの影響 | 直接小。検索結果で誤った予約可能性を伝える可能性。 |
| SEOへの影響 | 構造化データの一貫性・リッチリザルト適格性。 |
| 推奨修正 | `@id`でOrganization/LocalBusiness接続、実際の全Offerをマスタから生成、未販売はOfferを出さない。ENにも同等schema、FAQ/Breadcrumbはvisible UIと一致。 |
| 修正難易度 | 中 |
| 想定工数 | 1〜2日 |
| 依存関係 | 商品販売状態、schema validator/リッチリザルトテスト |
| 根拠 | 全JSON-LDはJSON parse成功。aggregateRatingを出していない点は適切。 |

#### M-5. OG画像の実寸・宣言比率と英語プラン画像が不適切

| 項目 | 内容 |
|---|---|
| 優先度 | **Medium** |
| 対象ページ | プラン、staff、FAQ、英語プラン |
| 対象ファイル/行 | `lib/seo.ts:67-73`, `app/en/plans/[id]/page.tsx:23-29` |
| 現状 | helperは全画像を1200×630と宣言するが、実寸は1400×1050、1600×1200、1172×2171、1024×1024等。EN planは画像を渡さず全てhomeのウミガメOG。 |
| 問題となる理由 | LINE/X/Facebookで意図しないcropや商品と違うpreviewになる。 |
| ユーザーへの影響 | 共有されたリンクの内容を誤解し、クリック率が下がる。 |
| SEOへの影響 | SNS CTR、画像理解に影響。通常検索順位への直接影響は小。 |
| 推奨修正 | 各主要ページに1200×630専用OG、または`opengraph-image`生成。実寸をmetadataと一致。 |
| 修正難易度 | 中 |
| 想定工数 | 1〜3日（画像制作数による） |
| 依存関係 | ブランドテンプレート、実写素材 |
| 根拠 | 画像dimensionとmetadata出力を比較。 |

#### M-6. API入力schema、Spreadsheet formula injection、document CSPが不足

| 項目 | 内容 |
|---|---|
| 優先度 | **Medium** |
| 対象ページ | `/api/booking`, `/api/line/notify`, GAS管理シート、全HTML |
| 対象ファイル/行 | `app/api/booking/route.ts:111-130,174-243,326-382`, `docs/gas-line-notify.js:681-703`, `lib/services/gas-service.ts:113-120`, `next.config.mjs:3-16,33-35` |
| 現状 | JSON shape/文字数/配列要素型の統一schemaなし。GAS例は文字列を`appendRow`し、先頭`=,+,-,@`対策なし。APIは生error.messageを返す場合あり。HTML documentにCSPなし（SVG用CSPは別）。 |
| 問題となる理由 | malformed入力で500、内部error露出、管理sheet式実行、将来XSSへの防御層不足。 |
| ユーザーへの影響 | エラー時の不明瞭な失敗、運用データの安全性低下。 |
| SEOへの影響 | 直接なし。障害/改ざん時は大。 |
| 推奨修正 | server/GAS両方のschema・長さ・範囲、危険先頭文字escape、固定client message+correlation ID。CSPはReport-Onlyからnonce方式へ。 |
| 修正難易度 | 中〜高 |
| 想定工数 | schema/GAS 0.5〜1日、CSP 1〜3日 |
| 依存関係 | 実運用GASの確認、GA/LINE/Vercel許可origin |
| 根拠 | 現行GASが同梱例と同一かは未確認のためformula injectionは条件付き。現在のuser-controlled XSS経路は確認できない。 |

#### M-7. GA4 page_view/本番限定、UTM、Consent、GSCが運用設定依存

| 項目 | 内容 |
|---|---|
| 優先度 | **Medium** |
| 対象ページ | 全ページ |
| 対象ファイル/行 | `app/layout.tsx:76-80,113-118`, `lib/attribution.ts:7-70`, `components/attribution-tracker.tsx:8-12`, `README.md:38-45`, `app/privacy/page.tsx:52-67` |
| 現状 | 初回GA page_viewは1件で二重なし。SPA遷移はGA4 Enhanced Measurementに依存。`NODE_ENV=production`だけではPreviewを除外できずenv scope依存。UTMはsource/medium/campaignのみでcontent/termなし。Consent Mode/CMPなし。GSC DNS ownershipは不明。 |
| 問題となる理由 | SPA page_view漏れ/二重、preview汚染、creative比較不能、地域/広告要件への未対応があり得る。 |
| ユーザーへの影響 | 直接小。プライバシー選択肢は地域要件次第。 |
| SEOへの影響 | 計測/検証の欠落。GSC設定有無自体は順位要因ではないが運用に必須。 |
| 推奨修正 | DebugViewで`/→/plans→/book`各1回を確認、`VERCEL_ENV`二重防御、utm_content追加、README env更新。EEA/UK/広告運用時はConsent Mode v2/CMPを法務確認。GSC管理画面確認。 |
| 修正難易度 | 低〜中 |
| 想定工数 | 0.5〜1日、CMPは1〜5日 |
| 依存関係 | GA/GSC/Vercel管理権限、対象地域/広告方針 |
| 根拠 | コード、本番HTML/Network、GA event map、UTM docsを確認。 |

#### M-8. Client Componentが大きく、不要なhydrationがある

| 項目 | 内容 |
|---|---|
| 優先度 | **Medium** |
| 対象ページ | `/plans/[id]`, `/book`, `/en/book`, `/blog`, `/blog/[slug]`, `/` |
| 対象ファイル/行 | `components/plan-detail-page.tsx:1-999`, `components/booking-form.tsx:1-1727`, `components/booking-form-en.tsx:1-707`, `app/blog/[slug]/BlogPostClient.tsx:1-309`, `components/blog/blog-index-client.tsx:1-206`, `components/home/plans-section.tsx:1-783` |
| 現状 | Plan詳細全体がclient+Framer+全14 plan data。Bookは約89KB/1727行の単一client。Blog記事全体がshare buttonのためclient+ReactMarkdown。Home planは多重carousel/scroll listener。 |
| 問題となる理由 | 初期JS、hydration、再render、保守コストが増える。 |
| ユーザーへの影響 | 低速端末で入力/scrollの反応が悪化しやすい。 |
| SEOへの影響 | 現在はSSR本文があるためcrawlは可能。速度に間接影響。 |
| 推奨修正 | 静的本文をServer Componentへ戻し、carousel/share/form field等だけclient island化。planごとのdataだけ渡す。フォームをstep/section reducer化。 |
| 修正難易度 | 高 |
| 想定工数 | 1〜2週間を段階実装 |
| 依存関係 | visual/booking regression tests |
| 根拠 | source size、build bundle `/plans/[id]` 54.9KB page JS、`/book` 26.5KB page JS/First Load188KB、component境界を確認。 |

#### M-9. semantic HTML・404/英語error・可視パンくずの不足

| 項目 | 内容 |
|---|---|
| 優先度 | **Medium** |
| 対象ページ | 404、blog、gallery、staff、FAQ、特商法、EN FAQ |
| 対象ファイル/行 | `app/not-found.tsx:5-31`, `app/blog/[slug]/BlogPostClient.tsx:47-309`, `components/footer.tsx:90,104`, `components/staff-grid.tsx:31,81`, `components/faq-section.tsx:42,67` |
| 現状 | 通常404はhome title/canonical/indexを継承しNext noindexと競合。英語error/404なし。`Link`内`Button`ネスト。blogに`main`なし。複数ページでH1→H3。JSON-LD Breadcrumbはあるが可視UIなし。 |
| 問題となる理由 | 支援技術のlandmark/見出しnavigation、HTML validity、404の意味が曖昧。 |
| ユーザーへの影響 | キーボード/読み上げで現在位置と復帰先を理解しにくい。英語利用者に日本語error。 |
| SEOへの影響 | 404 metadata競合、semantic構造、内部リンクUXに影響。 |
| 推奨修正 | 404専用metadata/noindex、EN not-found/error、Linkをbutton風に直接style、`main`と正しいh2/h3、可視breadcrumbを主要下層に追加。 |
| 修正難易度 | 低〜中 |
| 想定工数 | 1〜2日 |
| 依存関係 | 共通layout設計 |
| 根拠 | 本番HTMLのheading/landmark/metadataを全件走査。 |

#### M-10. 追加費用の説明が法的ページと商品ページで一致しない

| 項目 | 内容 |
|---|---|
| 優先度 | **Medium** |
| 対象ページ | `/tokushoho`, `/plans/*`, `/access` |
| 対象ファイル/行 | `app/tokushoho/page.tsx:38-42`, `lib/beach-info.ts:15,18`, `lib/plan-details.ts:82-88` |
| 現状 | 特商法は商品代金以外「なし（交通費のみ）」だが、候補地に¥1,000〜¥2,000駐車場、ウェットスーツ/度付きマスク各¥1,000がある。 |
| 問題となる理由 | 予約前の総費用説明として不足。 |
| ユーザーへの影響 | 現地で想定外費用と感じる。 |
| SEOへの影響 | 直接小。価格透明性/E-E-A-Tに影響。 |
| 推奨修正 | 任意レンタル、駐車、現地交通等を「追加で発生し得る費用」として統一表示。 |
| 修正難易度 | 低 |
| 想定工数 | 1〜2時間 + 法務確認 |
| 依存関係 | 正式な料金運用 |
| 根拠 | 法的ページとbeach/plan dataを突合。 |

### Low

#### L-1. manifestがなく、icon資産をPWA metadataへ統合していない

| 項目 | 内容 |
|---|---|
| 優先度 | **Low** |
| 対象ページ | サイト全体 |
| 対象ファイル/行 | `app/`に`manifest.ts`/`manifest.webmanifest`なし、`app/layout.tsx:34-35` |
| 現状 | `/manifest.webmanifest`は404。favicon、512px icon、180px apple iconは200でHTML出力済み。 |
| 問題となる理由 | installability/theme color等のブラウザ統合がない。予約サイトとしてPWA必須ではない。 |
| ユーザーへの影響 | ホーム画面追加時の名称/色の制御が弱い。 |
| SEOへの影響 | 通常検索順位への直接影響はほぼない。 |
| 推奨修正 | 必要性がある場合のみ`app/manifest.ts`を追加。 |
| 修正難易度 | 低 |
| 想定工数 | 1時間 |
| 依存関係 | PWA方針 |
| 根拠 | repo/production path確認。 |

#### L-2. プランURLが内部コードのままで意味が分かりにくい

| 項目 | 内容 |
|---|---|
| 優先度 | **Low** |
| 対象ページ | `/plans/S1`〜`/plans/C6` |
| 対象ファイル/行 | `app/plans/[id]/page.tsx:12-26`, `lib/plan-details.ts:52-775` |
| 現状 | URLが`S1`, `C5`等で商品を説明しない。blog slugは説明的で良好。 |
| 問題となる理由 | 共有時の理解、keyword文脈が弱い。既存URL変更には移行リスクがある。 |
| ユーザーへの影響 | 小。URLだけで内容を判断できない。 |
| SEOへの影響 | 小。既存評価を失う誤移行の方が危険。 |
| 推奨修正 | 新規商品から説明的slugを採用。既存変更時は1:1の308、canonical、sitemap、内部リンク、GSC監視をセット。 |
| 修正難易度 | 中 |
| 想定工数 | 1〜2日 |
| 依存関係 | URL移行方針 |
| 根拠 | route/data確認。 |

#### L-3. `any`、dead/重複コード、巨大な日英別フォーム、lint警告

| 項目 | 内容 |
|---|---|
| 優先度 | **Low（予約ロジック部分はMedium）** |
| 対象ページ | 主に予約/プラン詳細、build品質 |
| 対象ファイル/行 | `lib/services/gas-service.ts:104`, `components/plan-detail-page.tsx:20`, `components/booking-form.tsx:409,453`, `components/participant-form.tsx:23`, `components/liff-provider.tsx:51,112`; unused候補 `lib/image-blur.ts`, `lib/blur.tsx`, `components/TurtleLogo.tsx`, `components/motion-provider.tsx`, `components/welcome-animation.tsx` |
| 現状 | 明示`any`、参照なしファイル/exports、日英フォーム別実装によるdrift、Hooks warning2件。console.log/info/debugは0、missing React keyは確認されず。 |
| 問題となる理由 | 予約条件の差異と変更漏れを生みやすい。現在のbuild/typecheckは成功。 |
| ユーザーへの影響 | 将来の不具合として間接影響。 |
| SEOへの影響 | 直接なし。bundle/保守性へ小影響。 |
| 推奨修正 | まずテストを作り、その後型付け・共通domain logic化・unused確認。機械的な一括削除はしない。Hooks依存を修正。 |
| 修正難易度 | 中 |
| 想定工数 | 2〜5日を段階実施 |
| 依存関係 | 回帰テスト、利用状況確認 |
| 根拠 | `rg`参照graph、lint、typecheck、build output。 |

#### L-4. Instagramの可視導線と計測がない

| 項目 | 内容 |
|---|---|
| 優先度 | **Low〜Medium（Instagramを主要証拠に使う場合）** |
| 対象ページ | nav/footer/staff/gallery |
| 対象ファイル/行 | `components/json-ld.tsx:5-8`のみ |
| 現状 | schemaの`sameAs`にInstagramがあるが、画面リンクも`instagram_click`もない。アカウントURL自体は200。 |
| 問題となる理由 | 外部媒体の実績/日々の海況が強みなら、旅行者が検証できない。 |
| ユーザーへの影響 | SNSで最新の雰囲気を確認できない。一方、強く置くと予約前離脱を増やす。 |
| SEOへの影響 | entity/ブランド接点への小さな間接影響。 |
| 推奨修正 | 方針に合うならfooter/galleryに弱い副導線として新規tabリンク、event/location計測。 |
| 修正難易度 | 低 |
| 想定工数 | 1〜2時間 |
| 依存関係 | SNS運用方針 |
| 根拠 | app/components全検索とURL到達確認。 |

#### L-5. blog loadingが空で、route戻り操作が比較位置を失わせる

| 項目 | 内容 |
|---|---|
| 優先度 | **Low** |
| 対象ページ | `/blog`, `/blog/[slug]`, route遷移全般 |
| 対象ファイル/行 | `app/blog/loading.tsx:1`, `components/route-scroll-manager.tsx:11-26` |
| 現状 | Blog loadingは`null`。route変更時に常にtopへscrollし、browser戻るでも一覧の比較位置を失う。 |
| 問題となる理由 | 待ち時間の状態が分からず、記事/プラン比較の継続性が弱い。 |
| ユーザーへの影響 | 「戻ったらどこを見ていたか分からない」。 |
| SEOへの影響 | 直接なし。UXに小影響。 |
| 推奨修正 | 軽量skeleton、popstateではscroll restorationを尊重。 |
| 修正難易度 | 低〜中 |
| 想定工数 | 0.5日 |
| 依存関係 | route behavior回帰 |
| 根拠 | component実装確認。 |

---

## E. ページ別評価

評価記号: A=強い、B=概ね良いが改善あり、C=重要な改善が必要、D=目的達成を阻害。予約ページのSEO「適切」は`noindex`が正しいという意味。

共通課題コード:

- **JP-PLAN**: 詳細全体がClient Component、`plan.images`の複数写真を未表示、末尾に他プラン最大13件、レビュー/参加条件マスタの整合余地。
- **EN-ALL**: root `html lang=ja`、日本語title suffix、英語404/errorなし。
- **EN-PLAN**: EN-ALLに加えProduct/Offer schemaと固有OG、写真/レビュー/FAQが日本語版より弱い。
- **BLOG-TPL**: Hero画像lazy、記事全体Client、`main`なし、Footer/MobileCTAなし、更新日/実名監修者が弱い。
- **BLOG-SRC**: 公式出典URLが0。営業時間、料金、安全、店舗等の変動情報を再確認すべき。
- **BLOG-ISO**: 初期HTMLの内部被リンク0。crawlable paginationが必要。

### E-1. 静的ページ・予約ページ（20ページ）

| ページ名 | URL | 目的 | SEO | UI | CV | 主な問題 | 改善案 |
|---|---|---|---:|---:|---:|---|---|
| トップ | `/` | サービス理解・比較・予約 | A- | A- | C | 口コミ数矛盾、AI疑義Hero、mobile LCP 4.2s、星空商品なし | 実績証憑、実写Hero、画像削減、仮予約表記 |
| ウミガメガイド | `/miyakojima-sea-turtle` | 非指名検索のピラー | A | B+ | B | 遭遇時期/傾向の出典・更新監修不足 | 公式/一次データ、監修者、更新日 |
| プラン一覧 | `/plans` | 全商品比較 | A- | B | B | 大きいClient carousel、mobile比較表、レビュー整合 | semantic比較表、絞込、軽量化 |
| ギャラリー | `/gallery` | 写真で信頼形成 | B | A- | B | alt専用文未使用、dialog/focus、CTA z-index | 専用alt、accessible Dialog、実プランへCTA |
| スタッフ | `/staff` | 顔・経験・安心 | B | A- | B- | 実名/資格番号/証明リンク不足、H1→H3 | 監修/資格/担当プランを明記、見出し修正 |
| FAQ | `/faq` | 予約前不安解消 | A- | B | B+ | Hero lazy、上部LINE/電話カード非click、H1→H3 | Hero priority、カードを実link、heading修正 |
| 安全対策 | `/safety` | 安全基準・中止判断 | A- | A- | B+ | 持病/年齢条件が他ページと不一致 | 条件マスタ一元化、資格証憑 |
| 集合・アクセス | `/access` | 集合方法・駐車・設備 | A- | A- | A- | 事業者住所と集合場所の誤認余地、外部NAP不一致 | 「集合場所ではない」を明記、NAP同期 |
| ブログ一覧 | `/blog` | 情報検索流入・記事回遊 | C+ | B | C+ | 初期12件のみlink、7孤立、全体Client、`main`なし | SSR pagination、カテゴリURL、landmark |
| 利用規約 | `/terms` | 条件・キャンセル同意 | B+ | B+ | B | APIで同意未検証、参加条件差 | server consent、条件統一 |
| プライバシー | `/privacy` | 個人情報/計測説明 | B+ | B+ | C+ | Consent選択肢なし、LINE ID本人性リスク | LIFF処理追記、地域要件に応じCMP |
| 特商法 | `/tokushoho` | 事業/料金/支払表示 | B | B+ | B | 駐車/任意レンタル費と「追加費用なし」が不一致、H1→H3 | 追加費用を列挙、heading修正 |
| 日本語予約 | `/book` | 仮予約送信 | 適切 | C | D | GAS偽成功、CLS .352、在庫なし、LINE/validation/A11y | C-1を最優先、schema/冪等性、step化、errors |
| English home | `/en` | 英語旅行者の理解・予約 | C+ | B+ | C | EN-ALL、AI疑義Hero、mobile LCP 4.6s | lang/title、実写、英語で確定手順を強調 |
| English plans | `/en/plans` | 英語商品比較 | C+ | B+ | B- | EN-ALL、description最大202字、schema/証拠薄い | title/description短縮、schema、実写 |
| English turtle guide | `/en/miyakojima-sea-turtle` | 英語非指名検索 | C+ | B+ | B- | EN-ALL、AI疑義画像、安全/出典の厚み | lang/title、実写、一次出典 |
| English FAQ | `/en/faq` | 英語の不安解消 | C+ | B+ | B | EN-ALL、H1→H3 | lang/title/heading、問い合わせ導線 |
| English booking | `/en/book` | 英語仮予約 | 適切 | C | D | GAS/LINE/在庫/label/冪等性、EN event欠落 | 日本語と共通domain/schema、server token検証 |
| English terms | `/en/terms` | 英語規約 | C+ | B+ | B- | EN-ALL、日本語errorへ遷移 | lang/title、EN error/404 |
| English privacy | `/en/privacy` | 英語privacy | C+ | B+ | C+ | EN-ALL、Consent/LIFF本人性説明 | lang/title、処理実態とprivacyを整合 |

### E-2. 日本語プラン詳細（14ページ）

| ページ名 | URL | 目的 | SEO | UI | CV | 主な問題 | 改善案 |
|---|---|---|---:|---:|---:|---|---|
| ウミガメシュノーケル | `/plans/S1` | 主力商品の予約 | A- | B+ | B- | JP-PLAN、一覧5,089件/詳細3,842件、遭遇率根拠 | 単一実績マスタ、根拠、実写gallery |
| 貸切ウミガメ | `/plans/S2` | 家族/初心者の高単価予約 | A- | B+ | B- | JP-PLAN、5歳〜表示に3歳口コミ、最大6名未検証 | 条件統一、server上限、貸切価値の実写 |
| 本格ナイトツアー | `/plans/S3` | 夜アクティビティ予約 | A | B+ | B | JP-PLAN、星空商品ではない、口コミ数根拠 | ヤシガニ意図に集中。星空提供時のみ正確に追加 |
| サンセットSUP | `/plans/S4` | カップル/夕景体験予約 | A- | B+ | B | JP-PLAN、撮影条件/安全資格の証拠不足 | 実作例、風/中止/納品の具体化 |
| 貸切ナイトツアー | `/plans/S5` | 家族向け貸切夜体験 | A- | B+ | B | JP-PLAN、星空検索とは不一致 | 貸切メリット・歩行条件・実写を強化 |
| ドローンSUP | `/plans/S6` | 空撮体験予約 | A- | B+ | B | JP-PLAN、操縦/撮影条件の説明不足 | ドローン資格/許可/飛行不可時の代替を明示 |
| 貸切ドローンSUP | `/plans/S7` | 高単価空撮予約 | A- | B+ | B | JP-PLAN、S6との差を写真で比較しにくい | 比較表と貸切作例、納品仕様 |
| 海亀+ヤシガニ | `/plans/C1` | 昼夜セット予約 | B+ | B | B | JP-PLAN、title長め、複数集合の認知負荷 | 一日timeline、移動/休憩/総拘束時間 |
| 貸切 海亀+ヤシガニ | `/plans/C2` | 貸切昼夜セット | B+ | B | B | JP-PLAN、高額商品の証拠/写真不足 | 専属価値、家族例、総額を明確化 |
| 海亀+ドローンSUP | `/plans/C3` | 海空セット予約 | B+ | B | B | JP-PLAN、条件/場所変更の理解負荷 | 同日flow、海況別代替、gallery |
| 貸切 海亀+ドローンSUP | `/plans/C4` | 高単価海空貸切 | B+ | B | B | JP-PLAN、単品との差が文章中心 | savings/貸切比較、作例 |
| 海亀+SUP+Night | `/plans/C5` | 1日セット予約 | B | B | B- | JP-PLAN、長時間/移動/食事/疲労が見えにくい | 時刻入り旅程、休憩/食事/悪天候の部分催行 |
| 貸切 海亀+SUP+Night | `/plans/C6` | 最高単価1日貸切 | B | B | B- | JP-PLAN、高額判断用の証拠と保証不足 | 専用FAQ、全費用、case study、部分中止規定 |
| スライダーボート | `/plans/slide-boat` | 新商品予告 | C+ | B | C | Coming Soonなのにindex/PreOrder、予約不可 | Offer除去、waitlist計測、開始日/安全情報後にindex判断 |

### E-3. 英語プラン詳細（8ページ）

| ページ名 | URL | 目的 | SEO | UI | CV | 主な問題 | 改善案 |
|---|---|---|---:|---:|---:|---|---|
| Sea Turtle Snorkeling | `/en/plans/S1` | English booking | C | B | C+ | EN-PLAN、JP+¥2,000のsupport価値は注記あるが検索snippetで伝わりにくい | lang/title/schema、support内訳、実写/reviews |
| Private Sea Turtle | `/en/plans/S2` | Private English booking | C | B | C+ | EN-PLAN、最大人数/年齢のserver整合 | 条件schema、private case photos |
| Jungle Night Tour | `/en/plans/S3` | English night activity | C | B | C+ | EN-PLAN、英語だけ`star-filled skies` | 実提供なら日英統一、非提供なら削除 |
| Sunset SUP | `/en/plans/S4` | English sunset booking | C | B | C+ | EN-PLAN、weather/photo delivery情報薄い | cancellation/alternative/delivery具体化 |
| Private Jungle Night | `/en/plans/S5` | English private night | C | B | C+ | EN-PLAN、歩行/乳幼児条件の証拠不足 | safety/accessibility details |
| Drone SUP | `/en/plans/S6` | English aerial-photo booking | C | B | C+ | EN-PLAN、drone restrictions未説明 | no-flight alternative、delivery spec |
| Private Drone SUP | `/en/plans/S7` | Premium English booking | C | B | C+ | EN-PLAN、通常との差が弱い | side-by-side comparison、case photos |
| Slider Boat | `/en/plans/slide-boat` | Coming Soon | D | B- | D | EN-PLAN、未販売/index/PreOrder相当 | Offerなし、launch/waitlist目的を明確化 |

### E-4. ブログ記事（25ページ）

| ページ名 | URL | 目的 | SEO | UI | CV | 主な問題 | 改善案 |
|---|---|---|---:|---:|---:|---|---|
| 17END完全攻略 | `/blog/17end-complete-guide` | 観光検索流入 | B+ | B | C+ | BLOG-TPL。公式出典5件は良い | 更新日/監修者、関連体験への自然なCTA |
| 新城海岸完全ガイド | `/blog/aragusu-beach-snorkeling-guide` | Beach/海亀検索 | A- | B | B | BLOG-TPL。公式出典4件 | ピラー/プランとのtopic cluster強化 |
| 伊良部・下地ランチ2026 | `/blog/irabu-shimoji-lunch-cafe-2026` | 飲食検索流入 | B+ | B | C | BLOG-TPL。出典3件 | 店舗確認日、地図、更新責任者 |
| 初心者シュノーケル | `/blog/miyakojima-beginner-snorkeling-guide` | 初心者検索→S1 | A- | B | B | BLOG-TPL。出典4件 | 安全監修、S1比較CTA |
| カフェ巡り | `/blog/miyakojima-cafe-tour-scenic-tropical-sweets` | 飲食/写真検索 | C+ | B | C | BLOG-TPL + BLOG-SRC | 店舗公式URL/確認日、定型表現削減 |
| サンゴ礁保全 | `/blog/miyakojima-coral-reef-conservation` | 環境E-E-A-T | C | B | C | BLOG-TPL + BLOG-SRC + BLOG-ISO | 研究/行政出典、ガイドの保全実践、内部リンク |
| カップル2泊3日 | `/blog/miyakojima-couple-romantic-2nights-3days` | カップル旅/星空 | C | B | C | BLOG-TPL + BLOG-SRC + BLOG-ISO。星空は一般観察のみ | 公式情報、提供商品との境界、内部リンク |
| ドローンSUPガイド | `/blog/miyakojima-drone-sup-guide` | S6/S7検索流入 | B | B | B- | BLOG-TPL + BLOG-SRC | 飛行ルール/資格出典、実作例、商品CTA |
| 家族2泊3日 | `/blog/miyakojima-family-2nights-3days` | 子連れ旅 | C | B | C+ | BLOG-TPL + BLOG-SRC + BLOG-ISO | 年齢別一次情報、内部リンク、予約前不安CTA |
| グルメ完全ガイド | `/blog/miyakojima-gourmet-complete-guide` | 飲食検索 | C | B | C | BLOG-TPL + BLOG-SRC + BLOG-ISO | 店舗公式URL/確認日、網羅より選定根拠 |
| ホテル/宿泊エリア | `/blog/miyakojima-hotel-accommodation-guide` | 宿泊検索 | C | B | C | BLOG-TPL + BLOG-SRC + BLOG-ISO | 公式URL/更新日、集合地との距離価値 |
| 6月観光2026 | `/blog/miyakojima-june-travel-guide-2026` | 季節検索 | B+ | B | C+ | BLOG-TPL。出典6件 | 毎年更新、気象source日付、体験CTA |
| 子連れシュノーケル年齢 | `/blog/miyakojima-kids-snorkeling-age-guide` | 親の不安→S1/S2 | B | B | B- | BLOG-TPL + BLOG-SRC、サイト内年齢矛盾 | 安全基準出典、共通条件マスタ |
| 地元居酒屋 | `/blog/miyakojima-local-izakaya-guide` | 飲食検索 | C | B | C | BLOG-TPL + BLOG-SRC | 店舗公式/営業時間/予約要否の確認日 |
| 朝カフェ | `/blog/miyakojima-morning-breakfast-cafe` | 朝食検索 | C | B | C | BLOG-TPL + BLOG-SRC | 店舗source、営業変更notice |
| ナイトツアー完全ガイド | `/blog/miyakojima-night-tour-yashigani-guide` | 夜activity→S3/S5 | B+ | B | B | BLOG-TPL + BLOG-SRC、星空商品ではない | 生物/保全source、S3/S5比較、星空誤認回避 |
| フォトスポット20選 | `/blog/miyakojima-photo-spot-instagram-guide` | 写真検索 | C | B | C | BLOG-TPL + BLOG-SRC + BLOG-ISO | 撮影マナー/立入/公式source、内部リンク |
| 雨の日ガイド | `/blog/miyakojima-rainy-day-guide` | 雨の日検索 | B | B | B- | BLOG-TPL + BLOG-SRC | 営業/予約source、S1の雨天条件へ自然に接続 |
| レンタカー初心者 | `/blog/miyakojima-rental-car-beginner-guide` | 交通検索 | C+ | B | C | BLOG-TPL + BLOG-SRC | 交通/事故/駐車公式source、更新日 |
| リピーターdeep guide | `/blog/miyakojima-repeater-deep-guide` | 再訪検索 | C | B | C | BLOG-TPL + BLOG-SRC + BLOG-ISO | 独自現地情報、出典、内部リンク |
| シュノーケル服装/持ち物 | `/blog/miyakojima-snorkeling-outfit-packing` | 準備→予約 | B | B | B | BLOG-TPL + BLOG-SRC | 季節/水温source、商品別持ち物差 |
| ツアーvs個人 | `/blog/miyakojima-snorkeling-tour-vs-self-guide` | 比較検索→S1 | A- | B | B+ | BLOG-TPL。公式出典5件 | 公平な比較、監修資格、明確CTA |
| SUP初心者 | `/blog/miyakojima-sup-beginner-guide` | SUP検索→S4/S6 | B | B | B | BLOG-TPL + BLOG-SRC | 安全/気象source、S4/S6比較 |
| 観光最新2026 | `/blog/miyakojima-tourism-latest-2026` | 広域観光検索 | B+ | B | C+ | BLOG-TPL。出典6件 | 更新頻度、queryを絞る、cluster導線 |
| 下地島空港2026 | `/blog/shimojishima-airport-2026-summer-schedule-access` | 交通検索 | B+ | B | C | BLOG-TPL。公式出典5件 | ダイヤ更新監視、access/予約への文脈CTA |

### E-5. システムページ・API（ページ数67の外数）

| 対象 | URL | 目的 | 評価 | 問題 | 改善 |
|---|---|---|---|---|---|
| 通常404 | 任意の存在しないURL | 回復導線 | B- | home metadata継承、日本語のみ、Link/Buttonネスト | 専用metadata、EN 404、semantic link |
| Blog 404 | 存在しない`/blog/*` | 記事不存在 | D | HTTP 200 soft404 | `dynamicParams=false` + status test |
| Global error | runtime error | 再試行/回復 | B | 英語なし、suppressHydrationWarningが広い | locale error、必要箇所だけsuppress |
| Booking API | `POST /api/booking` | 予約受付 | D | GAS偽成功、本人性、冪等性、schema | C-1、HMAC、token検証、idempotency |
| Coupon API | `POST /api/coupon` | 割引preview | C+ | in-memory rate limit、公開repoにcode | durable limit、限定codeはenv/DBへ |
| LINE notify API | `POST /api/line/notify` | 管理通知 | B- | secret認証は良い、message長/JSON shape不足 | schema/長さ/400、secret rotation |

---

## F. 優先順位付き改善ロードマップ

以下は**承認後に実施する計画**であり、本監査では実装していない。

### 今すぐ直す

1. GASの全deploymentを管理画面で照合し、Git履歴に残る未使用endpointを失効する。
2. `sendToGAS`で`response.ok`と成功JSONを必須にし、偽成功を止める。
3. 正常/404/500/HTML/timeoutの予約APIテストを追加する。
4. 修正完了までは運営側で「Web予約とGAS sheet件数の突合」を毎日行い、未着予約の有無を調べる。
5. 口コミ・年間案内・遭遇率の証憑を集め、説明不能な数値は一時的に非表示または定性表現へする。

### 1日以内

1. Blog soft404を正しい404へする。
2. 「空き確認」を実態に合う「仮予約/空き状況を問い合わせる」へ統一し、確定はLINE返信後と明記する。
3. adult必須、最大人数、規約同意、coupon完了金額をclient/serverで一致させる。
4. `booking_submitted`をGA4へ送り、DebugViewで1回だけ送信されることを確認する。
5. FAQ/Blogのabove-fold画像から明示lazyを外し、priority/fetch priorityを適正化する。
6. NAPの正式情報を事業者資料で確認し、サイト内の「事業者所在地・集合場所ではない」表記を確定する。

### 3日以内

1. LIFF IDのlocalStorage永続復元を廃止し、fresh login/profileとサーバーtoken検証を実装する。
2. client ref lock + server/GAS idempotency keyを実装する。
3. server input schema、文字数、人数、body上限、formula escapeを実装する。
4. 英語`html lang`とtitle templateを直し、全英語ページのmetadata/hreflangを再検証する。
5. `/blog`をcrawlable paginationへし、孤立7記事を解消する。
6. 外部媒体（GBP、Activity Japan、じゃらん、許認可情報）の住所/営業時間/公式URLを更新申請する。

### 1週間以内

1. 予約フォームのlabel/fieldset/見出し/error summary/focus管理をWCAG AA相当にする。
2. Gallery/予約完了をaccessible dialogへし、mobile CTAとのz-indexを分離する。
3. 360/375/390/430/768/1024/1440pxでnav、固定CTA、比較表、form、Lightboxを実機回帰する。
4. Home画像/carouselを軽量化し、本番mobile LCP 2.5秒以下を目標にする。
5. `/book` fallbackを最終layoutへ近づけ、CLS 0.1以下にする。
6. 重要17ブログに公式出典・確認日・更新日・監修者を追加する。
7. 公開依存脆弱性を別branchで更新・回帰し、段階deployする。

### 中長期

1. 実在庫/満席/代替日を連携し、初めて「空き確認」を事実にする。
2. Plan詳細、Blog、BookingをServer Component + 小さなclient islandへ再設計する。
3. 予約確定イベントをGAS/CRMからGA4へPIIなしで戻し、`request→confirmed→cancelled`を分ける。
4. 全商品/参加条件/料金/Offer/FAQを単一コンテンツマスタへ統合する。
5. 星空フォトを実提供する場合だけ、専用商品・撮影作品・天候/月齢/納品/予約を備えたtopic clusterを作る。
6. field CWV、エラー率、予約到達率をRUM/monitoringで継続監視する。

---

## G. 最優先の改善10件

| 順位 | 改善 | 効果 | コスト | 選定理由 |
|---:|---|---|---|---|
| 1 | GAS HTTP/JSON成功判定を厳格化 | 極大 | 小 | 未保存予約を成功表示する直接売上損失を止める。 |
| 2 | GAS deployment棚卸し + HMAC/replay防止 | 極大 | 中 | Nextを迂回した偽予約/運用汚染を防ぐ。 |
| 3 | LIFF本人性をfresh tokenでserver検証 | 極大 | 中〜大 | 別人通知・未達・個人情報事故を防ぐ。 |
| 4 | 予約条件/最大人数/規約/coupon/idempotencyを統一 | 大 | 中 | 送信直前エラー、金額差、重複予約をまとめて減らす。 |
| 5 | 口コミ/年間案内/遭遇率の証憑と単一マスタ | 大 | 小〜中 | 予約の最後の心理障壁である信頼を回復する。 |
| 6 | 「空き確認」を仮予約実態へ合わせる | 大 | 小 | 期待不一致を最小コストで解消。将来は実在庫へ。 |
| 7 | GA4へ`booking_submitted`を送信 | 大 | 小 | SEO/広告/LPの実成果を判断できるようにする。 |
| 8 | Blog soft404 + crawlable pagination | 中〜大 | 小〜中 | 明確なtechnical SEO欠陥と孤立7記事を短期間で解消。 |
| 9 | 英語`lang`/title templateを修正 | 中〜大 | 中 | 全英語ページの検索結果と読み上げを一度に改善。 |
| 10 | mobile LCP/Book CLS + form A11yを改善 | 大 | 中〜大 | 速度と予約離脱を同時に改善し、全ユーザーに効く。 |

---

## H. 修正実施計画

### H-1. 作業単位・順序・テスト・リスク

| 順序 | 作業単位 | 主な対象ファイル | 実施内容 | テスト方法 | 主なリスク |
|---:|---|---|---|---|---|
| 0 | 予約契約のfixture化 | 新規test群、GAS response sample | 現行正常response、plan/age/price/LINE運用を文書化 | production相当payloadをfixture化、外部POSTなし | 正常仕様の誤認 |
| 1 | GAS response修正 | `lib/services/gas-service.ts`, `app/api/booking/route.ts` | status/JSON schema/success必須、固定error | 200 success、200 fail、400、404 HTML、500、空、timeout | GASの実正常responseがHTMLなら連携変更が必要 |
| 2 | GAS認証/失効 | GAS deployment、`gas-service.ts`, Vercel env | 旧deployment失効、HMAC/timestamp/nonce | signature正/誤、期限切れ、replay、secret rotation | Apps Script公開範囲/redirect仕様 |
| 3 | LIFF本人性 | `liff-provider.tsx`, JA/EN booking、API | stale storage削除、ID token server verify | 共有端末、logout、別account、expired token、改変ID | LIFF in-client/external browser差 |
| 4 | 予約domain統一 | `booking-form*.tsx`, `participant-form.tsx`, `route.ts`, plan/price/coupon data | adult/max/age/terms/coupon/idempotency/schema | unit matrix + JA/EN E2E + double click/retry | 日英・既存GAS列の互換 |
| 5 | 信頼/NAP | stats/plans/plan-details/json-ld/footer/legal | 実績根拠、単一数値、正式NAP、集合注記 | source照合、schema validator、外部listing確認 | 過去広告/媒体表示との不一致 |
| 6 | technical SEO | blog route/index、EN layouts/metadata、404 | soft404、pagination、lang/title、404 metadata | 全67 URL status/meta/H1/canonical/hreflang/link graph | route group変更によるURL破壊 |
| 7 | analytics | `analytics.ts`, booking forms、layout/attribution | GA final CV、event辞書、SPA/preview/utm_content | GA DebugView/Realtime、各event exactly-once、PII scan | page_view二重化 |
| 8 | accessibility/UI | form/card/dialog/navbar/mobile CTA/comparison | labels/errors/focus/dialog/contrast/responsive | axe/Lighthouse、keyboard、VoiceOver、7幅screenshot | 見た目/フォーム高さの変化 |
| 9 | performance | Hero/carousel/Book fallback/Blog/FAQ/plan boundary | 画像数、priority/sizes、CLS、server/client分割 | 本番相当Lighthouse各3回、bundle compare、visual regression | LCP画像の誤lazy、hydration差 |
| 10 | dependency update | `package.json`, lockfile | Next/@next/LINEを段階更新 | lint/type/build、67 URL、API fixtures、LIFF/GAS staging | major migration/regression |
| 11 | content strategy | blog、plan、必要なら新規星空商品 | 出典/監修/更新、星空提供実態に合わせる | 編集レビュー、claim evidence checklist、検索intent review | 未提供商品をSEO目的で誤掲載 |

### H-2. リリース手順

1. 予約のC-1〜H-5は他の見た目改善と分離し、最小PRにする。
2. GAS/LIFFは本番データを使わないstaging deploymentで検証する。
3. 予約APIは障害系を含むfixture testが通るまで本番へ出さない。
4. Vercel PreviewではGA4が出ないこと、Productionだけ出ることをNetworkで確認する。
5. technical SEO変更後は全67 URLのstatus/title/description/canonical/robots/H1/hreflangを自動比較する。
6. 360/375/390/430/768/1024/1440pxでHero、nav、CTA、比較、form、dialog、footerを確認する。
7. deploy後24〜72時間はGAS受信件数とWeb成功eventを突合し、差分0を確認する。
8. GSCでsoft404、indexing、sitemap、英語URLの状態を継続監視する。

---

## 付録1. 予約導線を旅行者の行動順に評価

| 段階 | 旅行者の状態 | 良い点 | 離脱/誤認ポイント | 改善 |
|---:|---|---|---|---|
| 1 | 初訪問 | 料金、年齢、写真無料、キャンセル無料が一画面で分かる | Hero写真が実ツアー証拠として弱い。星空目的には別商品 | 実写Hero、商品を一言で限定 |
| 2 | プラン比較 | 料金・対象・所要時間が豊富 | mobile 4列×12行、carousel内carousel、選択肢過多 | 利用者別3導線+semantic比較 |
| 3 | 詳細確認 | flow、集合、持ち物、FAQ、安全が充実 | 複数実写を未表示、他プラン13件で長い | 実写gallery、関連3件に絞る |
| 4 | 予約へ | `?plan=`で選択引継ぎ | 選択済みでも巨大な全plan選択欄を通る | 選択plan summary、変更は折りたたみ |
| 5 | 日時選択 | 日付/時間UIは分かる | 在庫ではなく静的希望。売切れ/不可を表示しない | 仮予約明記または実在庫 |
| 6 | 人数/参加者 | 自動料金計算 | 1人最大5項目、任意も常時表示、条件不整合 | 必須最小化、追加情報を後段化 |
| 7 | LINE | 入力を一時保存してlogin後復元 | LINE必須、friend未確認、stale ID、代替連絡弱い | fresh verify + email/phone fallback |
| 8 | 送信 | 規約と金額を直前表示 | buttonが無効な理由を示さず、二重送信防御弱い | error summary/focus/idempotency |
| 9 | 完了 | 仮予約、内容、金額、キャンセルを表示 | GAS未保存でも成功、client金額がserverと違い得る | strict success + server response表示 |
| 10 | 確定待ち | LINEで連絡する設計 | friendでなければ確定連絡不能、いつまでに返るか曖昧 | 返信SLA、代替連絡、未返信時手順 |

---

## 付録2. 検索キーワードとの適合

| 検索語 | 適合度 | 現状の受け皿 | 評価/方針 |
|---|---:|---|---|
| 宮古島 星空フォト | 0/5 | なし | 撮影商品がある場合だけ専用LPを作る。 |
| 宮古島 星空ツアー | 0/5 | なし | S3/S5はヤシガニ・夜行性生物で別intent。 |
| 宮古島 星空撮影 | 0/5 | なし | 撮影者/作例/納品情報なし。 |
| 宮古島 星空 写真 | 1/5 | カップル記事の一般観察 | 予約商品へつながらない。 |
| 宮古島 ナイトツアー | 5/5 | `/plans/S3`, `/plans/S5`, ナイト記事 | 強い。ヤシガニ/家族/0歳/写真無料を正確に磨く。 |
| 宮古島 カップル 星空 | 1/5 | カップル2泊3日記事 | 星空観察の一般情報のみ。提供商品と誤認させない。 |
| 宮古島 家族 星空ツアー | 0/5 | なし | 家族ナイトはあるが星空ではない。 |
| 宮古島 子連れ 星空 | 0/5 | なし | 同上。 |
| 宮古島 雨の日 観光 | 4/5 | 雨の日記事、雨天シュノーケル | 店舗/施設の出典と更新日を追加すれば強い。 |
| 宮古島 夜 アクティビティ | 4/5 | S3/S5/C1/C2/C5/C6、記事 | 商品群は強い。比較と予約確定方法を改善。 |

キーワードは「あるサービスを正確に説明した結果として含まれる」べきで、未提供の星空撮影語を既存ナイトツアーへ混ぜるべきではない。

---

## 付録3. GA4・流入計測マトリクス

### 計測できているもの

| 項目 | Vercel Analytics | GA4 | 根拠/備考 |
|---|---:|---:|---|
| 初回page_view | 自動 | 自動・本番で1件確認 | `app/layout.tsx:111-118` |
| SPA page_view | Vercel自動 | 設定依存 | GA Enhanced Measurementの履歴変更を要確認 |
| 予約CTA | ○ `book_cta_click` | ○ `reservation_click` | locationあり |
| LINE相談 | ○ | ○ `line_click` | locationあり |
| 電話 | ○ | ○ `phone_click` | footer/FAQ/legalも確認 |
| LINE友だち追加（JA） | ○ | × | success/booking箇所でVercelのみ |
| 予約フォームview | ○ | × | LIFF ready後、login状態あり |
| LINE login click | ○ | × | JA/ENあり |
| 予約送信成功 | ○ | **×** | 最終CV欠落 |
| 予約送信失敗 | ○ | × | error category/status不足 |
| UTM source/medium/campaign | GAS payloadへ○ | GA自動取得 | 90日last-non-direct、sanitizeあり |
| 個人情報をexplicit eventへ送信 | 送っていない | 送っていない | 全event props確認 |

### 計測できていない/不十分なもの

| 項目 | 状況 | 推奨event/parameter |
|---|---|---|
| 最終仮予約 | GA4なし | `generate_lead`または`booking_request_submitted`; value/currency/plan/locale/source |
| 予約確定 | なし | `booking_confirmed`をbackendからPIIなしで送信 |
| plan選択 | なし | `plan_select`; plan_id/plan_name/location |
| form_start | viewのみ | 最初の有効入力時に`form_start` |
| submit_attempt | なし | validation結果/error_category |
| EN LINE friend | onClick計測なし | `line_add_friend_click`; locale=en |
| Instagram | 可視リンクもeventもなし | `instagram_click`; location |
| email/map/generic outbound | なし | `email_click`, `map_click`, `outbound_click` |
| utm_content/utm_term | 保存しない | content、必要ならtermをsanitizeして保存 |
| GA4 Key Event/Ads連携 | repoから確認不能 | 管理画面で確認 |
| GSC ownership | repoから確認不能 | DNS property管理画面で確認 |
| Consent Mode v2 | なし | 対象地域/広告要件に応じCMP |

---

## 付録4. テクニカルSEO確認記録

| 項目 | 状態 | 記録 |
|---|---|---|
| title | **確認済み・概ね良好** | 65 URL全てあり、重複0。EN過長/日本語suffixは問題。 |
| meta description | **確認済み・概ね良好** | 65 URL全てあり、重複0。EN最大202字。 |
| canonical | **確認済み・良好** | 全sitemap URLとbookにあり。UTM/任意queryでもclean URL。未知blogのみ競合。 |
| robots/noindex | **確認済み** | 通常ページindex、book2件noindexでsitemap除外。一般404/soft404 metadata競合あり。 |
| sitemap.xml | **確認済み・良好** | 65 URL、全200。固定lastModifiedとblog date利用。 |
| robots.txt | **確認済み・良好** | `/api/`のみdisallow、bookはcrawlさせnoindexを読ませる。 |
| HTTP status | **確認済み** | 67実ページ200、一般invalid 404、未知blogだけsoft404 200。 |
| redirect | **確認済み・良好** | HTTPS/www/slash/旧URLは308。redirect chainはapex httpで2段。 |
| URL構造 | **概ね良好** | blog/pillarは説明的。plan IDはopaque。 |
| 重複/parameter URL | **確認済み・良好** | canonical統合。旧`?page=`は308。 |
| 見出し/H1 | **確認済み** | sitemap全ページH1=1。gallery/staff/faq/tokushoho/en-faqでH1→H3。 |
| 内部リンク | **確認済み** | 検出リンク切れ0。blog孤立7件。 |
| パンくず | **一部** | BreadcrumbListは多いがvisible breadcrumb不足。 |
| 画像alt | **確認済み** | 初期HTMLの全imgにalt。galleryは専用altを使わずtitle。 |
| 画像filename | **要改善あり** | `gemini-generated-image-rq969urq969urq96.jpeg`等、意味/信頼に弱い名称。配信SEOへの直接影響は限定的。 |
| OG/Twitter | **確認済み** | 全主要pageに出力。実寸宣言/crop、EN固有画像が課題。 |
| favicon | **確認済み・良好** | favicon/icon/apple-iconは200。 |
| manifest | **未実装** | webmanifest 404。SEO上はLow。 |
| schema.org | **確認済み・広範** | JSON parse成功。entity接続/Offer/EN/Coming Soon等は改善。 |
| JS rendering | **確認済み・良好** | 主要本文はSSR HTMLに存在。blog load-more linkだけclient依存。 |
| Server/Client境界 | **要改善** | marketing Serverは多いがplan/book/blogが大きいClient。 |
| metadata API | **概ね良好** | helperで一元化。EN root templateと404 inheritanceが問題。 |
| pagination | **未実装で問題** | Blogはbutton load-more。crawlable URLなし。 |
| hreflang | **確認済み・良好** | 対応14組は相互、x-defaultは日本語。JP-only comboに無理なENなし。 |
| 日本語/英語URL | **概ね良好** | `/en` prefixは明快。document langだけ誤り。 |

---

## 付録5. アクセシビリティ確認記録

| 項目 | 状態 | 主な根拠 |
|---|---|---|
| contrast | **問題あり** | home Lighthouse 53違反。`gray-400/white`約2.60:1、白/emerald-500系CTA約2.47:1。 |
| keyboard | **一部良好** | Lightbox Escape/矢印あり。dialog focus trap/restoreなし。 |
| focus表示 | **要改善** | sr-only radio、無効submit、modal initial focus。 |
| alt | **概ね良好** | 空欠落なし。gallery semantic品質は改善。 |
| aria-label/状態 | **一部** | nav/FAQはexpandedあり。人数+/−、選択button、carousel dots不足。 |
| landmarks | **問題あり** | blog index/articleに`main`なし。skip linkなし。 |
| 見出し順 | **問題あり** | H1→H3ページ、booking CardTitleがdiv。 |
| form label | **問題あり** | participant/coupon等の関連付け不足。 |
| error message | **問題あり** | error summary/field association/focus移動なし。 |
| screen reader | **問題あり** | EN root lang ja、dialog roleなし、div比較表。 |
| modal/dialog | **問題あり** | Lightbox/booking successにrole/aria-modal/focus trapなし。 |
| reduced motion | **一部良好** | CSS media queryあり。Framer用MotionProviderは未使用。 |
| button/link | **問題あり** | Link内Buttonのinvalid nesting、見た目だけcontact card。 |
| touch target | **問題あり** | Home mobile 13件。dots 6〜8px、時間32px等。 |
| 色だけの状態 | **一部問題** | blog category/plan staff selectionの状態説明が弱い。 |
| semantic HTML | **問題あり** | mobile比較がdiv grid、CardTitle div、blog mainなし。 |

---

## 付録6. セキュリティ・コード品質確認記録

| 項目 | 状態 | 記録 |
|---|---|---|
| API key/secret露出 | **現行treeは確認済み・なし** | public identifier以外なし。過去GAS URLはdeployment失効要確認。 |
| 環境変数 | **概ね良好** | server/public分離。READMEにGA env欠落、`.env.example`なし。 |
| source map | **確認済み・非公開** | browser chunk `.map` 404。 |
| dangerouslySetInnerHTML | **低リスク** | JSON-LD 8箇所のみ、`JSON.stringify`、静的repo data。CMS化時safe serializer。 |
| XSS | **明確な経路なし** | ReactMarkdownにrehypeRawなし。CSP defense-in-depthは未実装。 |
| form spam | **問題あり** | instance Mapのみ、CAPTCHA/durable limitなし。 |
| external rel | **確認済み・良好** | blankリンクはnoopener/noreferrer。 |
| dependencies | **問題あり** | production high 3/moderate 1。更新は未実施。 |
| 不要ファイル/dead code | **候補あり** | 参照0の複数module。削除はテスト後。 |
| console.log | **確認済み・なし** | warn/errorはGAS/LINE/global errorのみ。 |
| duplicate code | **問題あり** | JA/EN booking別実装、複数plan/price/review data。 |
| exception handling | **一部問題** | timeoutあり。GAS status、JSON shape、error露出が問題。 |
| 404/500 | **一部問題** | 一般404正常、blog soft404、malformed APIが500になり得る。 |
| TypeScript any | **少数あり** | booking/liff/plan icon/service generic。`@ts-ignore`なし。 |
| React key | **重大問題なし** | missing keyなし。静的listのindex keyはLow。 |
| hydration | **明白なerrorなし** | Math.randomはeffect内。広い`suppressHydrationWarning`は縮小余地。 |
| Server/Client境界 | **問題あり** | plan/book/blogが過大client。 |
| build warning | **2件** | Hooks dependency 2件。build自体成功。 |
| security headers | **確認済み・概ね良好** | CSP documentだけ不足。 |
| CORS | **確認済み** | evil OriginへのACAOなし。cross-origin JSON POSTを許可しない。 |

---

## 付録7. ローカルSEO確認記録

| 項目 | 状態 | 記録 |
|---|---|---|
| サイト内NAP | 一貫 | 海亀兄弟 / 平良松原107-1 / 080-5344-2439 / 7:00〜18:00 |
| 外部NAP | **不一致** | Activity Japan/じゃらん/県警資料は平良西里861-5、Activity Japanは9〜17時/旧Vercel URL。どちらが現行か所有者確認要。 |
| GBP | 確認不能 | 公開map URLは同住所の名称へ到達。電話/営業時間/所有状態は管理権限なしでは断定しない。 |
| LocalBusiness schema | あり | 住所/電話/営業時間あり。Organizationとの接続、来訪型地点の表現を見直す。 |
| 地図 | 一部あり | 候補beach/slide-boat mapあり。事務所住所と集合場所の区別が重要。 |
| アクセス/駐車場 | 良い | `/access`に前日案内の理由、候補地、設備、駐車情報。追加費用表示は要統一。 |
| 営業時間 | 不一致 | 内部と外部媒体を同期。ツアー受付時間/事務所営業時間も分ける。 |
| 対応地域 | 良い | 宮古島、新城/シギラ等の具体性あり。 |
| 集合場所非公開への配慮 | 良い | 海況で前日決定する理由は説明済み。「事業者所在地へ来訪しない」をさらに明確に。 |

---

## 付録8. 監査上「確認不能」とした項目

推測で断定しないため、以下は管理画面/実サービス/所有者情報が必要であり未確定とした。

- 現在のVercel `GAS_BOOKING_URL`がGit履歴中の到達可能deploymentと同一か。
- 実運用GASが`docs/gas-line-notify.js`と同一か。
- GA4 Enhanced Measurementの「browser history events」、Key Events、内部トラフィック除外、Ads連携。
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`がVercel Production scopeのみに設定されているか。
- Google Search ConsoleのDNS domain property ownership。
- Google Business Profileの正式住所、電話、営業時間、ownership。
- 口コミ10,136+、年間案内5,000+、各plan review count、遭遇率の実証資料。
- Hero画像の正式な生成経緯、実写利用許諾、モデルリリース。
- 星空フォト/星空鑑賞を実商品として提供しているか。英語S3だけの`star-filled skies`が実態か。
- 正式な参加年齢、持病の扱い、60歳以上の通常/貸切条件。
- 360/375/390/430/768/1024/1440pxの全幅対話操作。専用ブラウザruntime不在のため、Lighthouse screenshotとコード検証に限定。

---

## 監査結論

このサイトは「検索で見つけてもらい、内容を理解してもらう」土台はかなり良い。一方、「予約が確実に保存され、本人へ正しく連絡され、表示内容と運用が一致する」という収益の最終区間が弱い。最初に行うべきことは、デザインやキーワード追加ではなく、GAS偽成功の修正と予約経路のend-to-end保証である。その後に実績/NAPの証拠、英語SEO、GA4最終CV、フォームA11y、モバイルLCPを順に直すと、信頼・予約率・集客判断を同時に改善できる。
