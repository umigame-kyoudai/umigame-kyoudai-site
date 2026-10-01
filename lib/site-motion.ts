// トップページ（日本語）のアニメーションの一括スイッチ。
// - enabled: false にすると、オープニング・ヒーロー演出・スクロール表示がすべて止まり、元の見た目に戻る。
// - opening: false にすると、オープニング（入場時の演出）だけを止める。
// 実装は components/motion/ にまとまっている。
export const SITE_MOTION = {
  enabled: true,
  opening: true,
} as const
