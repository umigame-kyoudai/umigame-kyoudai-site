# ギャラリー画像の追加方法

ギャラリー写真の一覧は **`lib/data/images.ts`** で一元管理しています。
このフォルダは、ギャラリー用の画像ファイルを置く場所です。

## 手順

1. **画像をここに置く**
   カテゴリごとのサブフォルダに入れます。
   ```
   public/images/gallery/turtle/turtle-007-couple.webp
   public/images/gallery/night/night-016-stick-insect.webp
   ```
   - 形式: **WebP** 推奨（横幅 1200px 以上）
   - ファイル名: `カテゴリ-連番-キーワード.webp`

2. **`lib/data/images.ts` の `galleryImages` 配列に1行追加**
   ```ts
   {
     id: "turtle-018",
     src: "/images/gallery/turtle/turtle-007-couple.webp",
     category: "turtle",
     title: "カップルで海亀体験",
     alt: "カップルでウミガメと泳ぐ様子",
     order: 310,
     planType: "S1", // 任意
   },
   ```

3. **トップページにも出したい写真**は `featured: true` を付ける
   （トップの Gallery セクションは featured の写真だけを表示します）

4. **表示順は `order`（昇順・小さいほど先頭）**
   10刻みで採番しているので、間に挿し込むときは中間値（例: 105）を使うと楽です。

## カテゴリ

`snorkel` / `turtle` / `family` / `night` / `sup` / `sunset` / `boat` / `private` / `other`

表示用の日本語ラベルは `lib/data/images.ts` の `GALLERY_CATEGORY_LABELS` で定義しています。
`/gallery` のフィルタボタンは「実際に画像が存在するカテゴリ」だけ自動で表示されます。
