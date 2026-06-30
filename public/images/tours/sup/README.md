# サンセットSUP画像

サンセットSUPプラン（S4）で使う実写の宣材写真。

## 命名規則
`sunset-sup-<内容>-<連番>.webp`（長辺1920px / WebP q82 に最適化済み）

## 横位置（カルーセル・カバー用）
詳細ページのヒーローやプランカードは `object-cover` の固定アスペクトで上下が切れるため、
カバー（先頭）とカルーセルには横位置のみを使う（`lib/tour-assets.ts` の `sup`）。

- `sunset-sup-group-hands-raised-001.webp`: グループが手を上げて喜ぶ（カバー）
- `sunset-sup-group-hands-raised-002.webp`: グループ万歳・別カット
- `sunset-sup-solo-paddling-001.webp`: ソロで夕凪をこぐシルエット
- `sunset-sup-solo-arm-raised-001.webp`: ソロ・片手を上げて
- `sunset-sup-solo-arms-raised-001.webp`: ソロ・両手を上げて

## 縦位置（ギャラリー用）
`/gallery` はライトボックスで全体表示されるため縦位置OK（`lib/gallery-images.ts`）。

- `sunset-sup-solo-standing-001.webp`: 夕日の光の道を立ちこぎ
- `sunset-sup-group-aerial-001.webp`: グループの空撮（ドローン）
- `sunset-sup-solo-horizon-001.webp`: 水平線に沈む夕日
- `sunset-sup-family-child-001.webp`: 親子の笑顔
- `sunset-sup-family-child-002.webp`: 親子の笑顔・別カット（予備）

## 旧素材（未使用）
`sunset-sup-tandem-paddling-001.jpg` / `sunset-sup-two-paddles-raised-002.jpg` /
`sunset-sup-solo-sun-horizon-002.jpg` / `sup-01〜06.webp` は現在どこからも参照していない。
