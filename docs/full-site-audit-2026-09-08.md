**全ファイル検査報告 — 2026年9月8日**

この文書は修正前の監査記録です。その後の修正・検証・本番反映状況は[監査修正記録](fixes-2026-09-08.md)を参照してください。

対象は `main` の `68ea694`。Git管理下494ファイルを棚卸しし、構文・設定・画像・参照先の検査、予約／計測／GASのコードレビュー、ローカルの本番ビルドとブラウザ操作を実施した。今回確認した不具合は **9件（P1：2件、P2：7件）**。既存の自動テストが通っていても、以下の条件では問題が発生する。

ソースの修正・コミット・デプロイは実施していない。予約APIの検証ではLINE認証とGAS送信をローカルモックに置き換え、GAS検証ではシート・カレンダー・メール・LINE・Propertiesをメモリ内で再現した。実予約や通知は発生させていない。本番への反映状況と実際の顧客への発生有無は未確認。

**確認した不具合**

| Severity | Location (file:line) | Finding |
|---|---|---|
| P1 | `lib/constants/coupons.ts:26` | 未登録の特定文字列がクーポンとして通り、予約金額が0円になる |
| P1 | `apps-script/umigame-reservation-webapp/Code.gs:1162` | 管理でのプラン変更と新規予約が重なると、新規予約の行が消失する |
| P2 | `components/booking-form.tsx:339` / `components/booking-form-intl.tsx:137` | 再読み込みやLINEログインからの復帰で、変更したプランが元へ戻る |
| P2 | `app/api/booking/route.ts:559` | 空白付きクーポンは割引表示と実際の予約金額が一致しない |
| P2 | `apps-script/umigame-reservation-webapp/Code.gs:1492` | プラン変更で別種ツアーの開催場所を引き継ぐ |
| P2 | `apps-script/umigame-reservation-webapp/Code.gs:860` | LINEプレビュー後、次の予約更新が競合エラーになる |
| P2 | `apps-script/umigame-reservation-webapp/Code.gs:3753` | 入力上限内の日本語LINEメッセージでもプレビュー保存に失敗する |
| P2 | `components/detailed-analytics.tsx:100` | ページ滞在時間とスクロール量が移動先ページの実績として記録される |
| P2 | `app/api/booking/route.ts:291` | 存在しない日付を予約APIが受け付け、GASへ転送する |

P1は料金や予約データの完全性に関わるため優先修正。P2も発生条件を再現した不具合だが、通常操作や特定入力に条件がある。

**1. P1 — 未登録クーポンによる0円予約**

`COUPON_LIST` が通常のJavaScriptオブジェクトであり、`COUPON_LIST[couponCode]` の取得後に値の真偽しか確認していない。`toString`、`constructor`、`__proto__` は登録していないが、継承プロパティが返るため有効扱いになる。

参加人数との乗算で割引額が `NaN`、予約合計も `NaN` になり、JSON変換で両方が `null` になる。現行GASの最終 `doPost` はこれを0として保存する。

再現結果（S1・大人1名）：

- クーポン確認API：`valid:true, discount:null`
- 予約API：`200, success:true, totalPrice:null`
- GAS：`success:true`、予約一覧の金額0円
- メール本文：`合計受取金額：¥0`
- カレンダー本文：`売上: ¥0（クーポン適用後・当日この金額を受け取る）`

根拠は `lib/constants/coupons.ts:26`、`app/api/booking/route.ts:559`、予約受付GAS `Code.gs:1732`。LINE認証を迂回しなくても、通常の予約フォームのクーポン入力からこの値が届く。

修正方針：登録キー自身だけを許可し、割引単価を有限の非負数として検証する。GAS送信直前とGAS受信時にも金額の有限性を検証し、不正値を0円として保存しない。

**2. P1 — 管理操作と新規予約の同時書き込みで予約が消失**

管理側 `adminChangeReservation` は、単品からセットへ変更するとき、追加予定行を `getLastRow() + 1` で決め、その行を空にした後、カレンダーを取得・更新してから予約内容を書き込む（`Code.gs:1162`、`:1191`）。

その間に予約受付側 `writeBookingRows_` が実行されると、追加予定行にはまだ予約番号がないため、同じ行を新規予約の追記先に選ぶ（予約受付 `Code.gs:1474`、`:1533`）。その保存が成功した後、管理側が同じ行をセット予定で上書きする。

READMEでは受付と管理を別GASプロジェクトとして動かす構成になっている。両者が取得する `getScriptLock()` は別物であり、同一シートへの書き込みを相互排他しない。これは[Google公式のスクリプトロックの範囲](https://developers.google.com/apps-script/reference/lock/lock-service#getScriptLock())とも一致する。

2つの独立したGAS実行環境と1つのメモリシートで、管理操作のカレンダー取得時点に新規予約を挿入した結果：新規予約とプラン変更は両方 `success:true`、終了後の新規予約行は0件だった。

修正方針：受付・管理の予約書き込みを同じ排他制御が効く処理へ集約する。別プロジェクトの `getScriptLock()` 追加だけでは解決しない。保存直前の行所有者確認と競合時の中断も必要。

**3. P2 — 復帰時に選択したプランが戻る**

`/book?plan=S1` でフォームを開き、画面上で貸切S2へ変更してもURLの `plan=S1` は残る。再読み込みすると下書きのS2よりURLのS1が優先され、S1へ戻る。外部ブラウザでのLINEログインも現在のURLを戻り先として使う（`components/liff-provider.tsx:334` 付近）ため、同じ再初期化が起こる。

ブラウザ実測：日本語は `S1 → 手動でS2 → 再読み込み → S1`、英語は `S2 → 手動でS5 → 再読み込み → S2`。韓国語・繁体字は英語と同じ `booking-form-intl.tsx` を使う。実LINEログイン自体は実行しておらず、同じURLへの復帰を再現した。

料金や対象年齢が変わり、変更したプランの時間だけが残れば予約APIで拒否される場合もある。修正方針：初回のURL事前選択と認証後の下書き復元を区別するか、手動でプランを変更した時点でURLも同期する。

**4. P2 — 空白付きクーポンで表示額と請求額が違う**

クーポン確認APIは `couponCode.trim()` を使うが、予約APIは未加工のコードを `calculateCouponDiscount` へ渡す。両フォームも入力文字列をそのまま予約APIへ送る。

S1・大人1名で ` UMIGAME500 ` を入力すると、確認APIは500円引きを返し画面上は6,000円になるが、予約APIは割引0円・合計6,500円で保存する。空白なしでは正しく6,000円だった。

修正方針：共通のクーポン検証関数で正規化する。入力表示・確認API・予約APIで同じコードを扱う。

**5. P2 — 別種ツアーの集合場所を流用する**

管理側 `adminFindOldComponentForRole_` は、変更後のツアー種別に対応する既存予定がなければ先頭予定を返す（`Code.gs:1492`）。`adminBuildChangedRows_` がそこから開催場所とスタッフをコピーする（`:1535`）。

S3の開催場所が「ナイトツアー（遺跡）」である予約をC1へ変更すると、新設される海亀予定にも「ナイトツアー（遺跡）」が入った。場所が空欄ではないため、管理画面の未設定検出も通過する。

修正方針：対応する種別の予定がない場合、集合場所は空欄として新たに設定を求める。担当者の継承も種別に応じて決める。

**6. P2 — LINEプレビュー後の誤った競合判定**

`adminUpdateBooking` は更新後の予約とバージョンを `Code.gs:860` で取得し、その後 `adminCreatePendingLine_` がU列へ送信待ち表示を書き込む（`:3741`）。U列は予約バージョンの計算対象（`:2558`）なので、返却したバージョンがすぐ古くなる。

ステータスを確定へ変更し、LINEプレビューを「送信しない」で閉じ、そのままスタッフを変更すると、他の人が編集していなくても「別の画面で更新されています」と拒否された。`App.html:1550` 付近のプレビュー送信・キャンセル処理でも予約バージョンを同期していない。

修正方針：送信待ち列も更新した後の予約を返し、送信・取消後も画面上のバージョンを更新する。

**7. P2 — 長い日本語LINEメッセージを保存できない**

`adminPrepareCustomLine` は4,500文字まで許可する（`Code.gs:1873`）。しかし本文を `expectedValue` と `message` に二重格納して、1つのScript PropertyへJSON保存する（`:1899`、`:3753`）。

日本語1,600文字の入力でJSONが9,927バイトになった。[Google公式のProperties1値あたり9KB制限](https://developers.google.com/apps-script/guides/services/quotas)を適用したモックでは、プレビューの保存に失敗した。LINEへの送信前に失敗する。

修正方針：本文の重複をなくし、保存JSONのUTF-8バイト数でも制限する。長文を保持する場合は保存先を分ける。

**8. P2 — 滞在時間を移動先ページへ誤計上**

`DetailedAnalytics` はページ移動時のeffect cleanupで前ページの滞在時間を送信する（`components/detailed-analytics.tsx:100`）。一方、`buildDetailedEvent` は送信時点の `window.location.pathname` を読む（`lib/detailed-analytics.ts:72`）。その時点ではURLが次のページになっている。

ローカルブラウザで `/blog` を閲覧して「ご予約」リンクから `/book` へ移動したところ、ブログの滞在17秒が `page_engagement, page_path:/book` として送信された。ブログでのスクロールも `/book` の `scroll_depth` になった。計測リクエストはブラウザ内で捕捉し、外部へ転送していない。

修正方針：滞在を計測し始めたページのパスを保持し、cleanupで送るイベントのページ情報に明示的に使用する。

**9. P2 — 存在しない日付がAPIを通る**

予約日について、`YYYY-MM-DD` 形式と今日以降の文字列比較しか行っていない（`app/api/booking/route.ts:291`）。月日が実在するかは検証していない。

有効な参加者とモックLINE認証で、`2026-12-32`、`2026-13-01`、`2027-02-30` を送ると、すべてGASへの転送まで進み、モック保存成功時はAPIが200を返した。通常の日付選択UIでは入力しにくいが、API自身は不正日付を防げない。

修正方針：年月日を分解して実在日を検証し、日付変換後に元の年月日と一致することを確認する。GAS実サービスの保存結果はこのケースでは確認していない。

**確認できた正常動作・範囲**

| 検査 | 結果 |
|---|---|
| Git管理下ファイル | 494ファイルを検査一覧へ記録 |
| TS／TSX／JS／MJS／GAS | 199ファイルの構文と静的画像参照を検査。エラーなし |
| JSON／設定例 | 10ファイルをパース。エラーなし |
| 画像 | 231ファイルをデコード。破損なし。ICO1ファイルのヘッダーも正常 |
| ブログ | 25記事のfrontmatter・画像・内部リンクを検査。必要項目あり |
| その他 | 文書・HTML等27ファイルの文字コードと競合マーカーを検査。CSS1ファイルをパース |
| 管理HTML／GAS | 現行Code.gs3本・TestMail.gs、App／Index内JS・Styles・manifestを追加確認 |
| `npm test` | 183件成功、失敗0、skip0 |
| `npm run lint` | エラー・警告なし |
| `npx tsc --noEmit --incremental false` | 成功 |
| `npm run build` | 完了。生成した本番ビルドをローカル起動して巡回 |
| APIのプラン・言語マトリクス | 15プラン×4言語＝60通り。受付26、想定どおり拒否34、想定外0 |
| ローカルHTTP巡回 | 98 URL。存在しないページ等の期待404を含め、想定外ステータス0 |
| 内部リンク | 表示HTMLの2,211か所を確認。遷移先エラー0 |
| 画面 | 日本語ホームのデスクトップ、日本語／英語／韓国語／繁体字の予約画面を幅390pxで確認。横はみ出し・空白画面・アプリ例外なし |

各ファイルで実施した機械検査は [検査一覧CSV](audit-2026-09-08-manifest.csv) に記録した。生成物・node_modules・Git内部・秘密情報は「全ファイル」のソースレビュー対象から除外した。すべての文章・画像について人手相当の意味判断を保証するものではなく、予約・料金・認証・計測・管理操作の処理を重点的にレビューした。

**依存関係・本番設定に関する追加確認事項**

`npm audit --omit=dev --json` はhighを7パッケージに報告した：`next`、`@next/third-parties`、`axios`、`form-data`、`js-yaml`、`nanoid`、`postcss`。これは依存関係レベルの検出件数であり、7種類の攻撃が本サイトで成立することを実証した数ではない。

使用中のNext.jsは14.2.35で、[公式RSCキャッシュ汚染の対象範囲](https://github.com/vercel/next.js/security/advisories/GHSA-wfc6-r584-vfw7)と[Middlewareリダイレクトのキャッシュ汚染の対象範囲](https://github.com/vercel/next.js/security/advisories/GHSA-3g8h-86w9-wvmq)にも入る。実際の影響にはCDN等の設定条件がある。互換性を検証した上で依存関係を更新する必要がある。今回の検査では依存関係を変更していない。

Vercel CLIにも更新通知（54.9.1 → 59.11.7）が出ている。互換性改善のため `npm i -g vercel@latest` での更新を強く推奨する。CLI自体の更新は実施していない。

- 管理GASの `adminSetMyEmailAsAdmin()`（`Code.gs:280`）は認証確認なしで許可メール一覧を置換する。非許可ユーザーが管理デプロイへアクセスでき、ActiveUserメールが取得できる構成なら権限取得につながる。現在の公開設定は未確認。公開関数の扱いは[Google公式](https://developers.google.com/apps-script/guides/html/communication#private_functions)、メール取得条件は[Session公式](https://developers.google.com/apps-script/reference/base/session#getActiveUser())を参照。
- 予約受付GAS `doPost` に共有秘密・署名の検証がない。GAS URLへ直接POSTできる公開設定なら、Next.jsの料金・LINE・紹介Cookie検証を通らずに書き込める。URLへの実POSTや公開設定の確認はしていない。
- 両GASの `LATEST.md` は、紹介制度版 `2026.08.24-1` が本番未反映と記載している。ローカルと実際のデプロイの一致は未照合。
- 管理GASの行増加プラン変更・削除退避の容量不足は、既存 `LATEST.md` に未修正と記載。今回は実シートで再確認していない。モックのグリッド境界だけで検出した追加候補は、上記9件に含めていない。
- APIへJSONの `null` を送ると、予約APIは内部のTypeErrorを含む500、計測APIは捕捉されない例外になる。通常のフォーム入力では送られないが、入口のオブジェクト型検証も改善余地がある。

**再現資料**

検査中のログ・スクリプトは `/tmp/umigame-audit-20260908/` にある（一時領域）。`files.json`、`crawl.json`、`tests.log`、`lint.log`、`api-probes.json`、`gas-probes.json`、`plan-matrix.json`、`engagement-browser-events.json`、画面キャプチャを保存した。

外部サービスへ接続しないAPI再現コマンド：

```sh
node --import ./scripts/test-alias-hooks.mjs /tmp/umigame-audit-20260908/api-probes.mjs
node --import ./scripts/test-alias-hooks.mjs /tmp/umigame-audit-20260908/plan-matrix.mjs
node /tmp/umigame-apps-script-audit-20260908.mjs
```

GASの結果には構成依存リスク・非確定候補も含まれるため、`confirmation` 欄と本報告の区分を合わせて読む。ライブのGoogleサービスに対する同時実行・LINEログイン往復・実機Safari／Androidでの予約完了は検証していない。
