export const JA_SITE_LINKS = [
  { href: "/", label: "ホーム", desktopLabel: "ホーム", showInDesktop: true },
  { href: "/plans", label: "ツアープラン一覧", desktopLabel: "プラン", showInDesktop: true },
  { href: "/book", label: "ご予約", desktopLabel: "ご予約", showInDesktop: false },
  {
    href: "/miyakojima-sea-turtle",
    label: "宮古島ウミガメガイド",
    desktopLabel: "ウミガメガイド",
    showInDesktop: true,
  },
  { href: "/staff", label: "スタッフ紹介", desktopLabel: "スタッフ", showInDesktop: true },
  { href: "/gallery", label: "ギャラリー", desktopLabel: "ギャラリー", showInDesktop: true },
  { href: "/blog", label: "ブログ", desktopLabel: "ブログ", showInDesktop: true },
  { href: "/faq", label: "よくある質問", desktopLabel: "よくある質問", showInDesktop: true },
  { href: "/safety", label: "安全への取り組み", desktopLabel: "安全への取り組み", showInDesktop: false },
  { href: "/access", label: "集合場所・アクセス", desktopLabel: "集合場所・アクセス", showInDesktop: false },
] as const

export const JA_DESKTOP_NAV_ITEMS = JA_SITE_LINKS.filter((item) => item.showInDesktop).map((item) => ({
  href: item.href,
  label: item.desktopLabel,
}))
