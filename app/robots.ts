import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /book は noindex（page metadata）。クロールは許可して noindex を読ませる。
        // 内部処理の API ルートのみクロール対象外にする。
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://www.umigamekyoudaimiyakojima.com/sitemap.xml",
  }
}
