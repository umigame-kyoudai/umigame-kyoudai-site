// ロケール → 辞書の解決。ページテンプレート・国際版予約フォームはここだけを見る。
// 辞書の中身は en.ts / ko.ts / zh-tw.ts、型は types.ts。

import type { IntlLocale } from "./locales"
import type { IntlDict } from "./types"
import { EN_DICT } from "./en"
import { KO_DICT } from "./ko"
import { ZH_TW_DICT } from "./zh-tw"

const DICTS: Record<IntlLocale, IntlDict> = {
  en: EN_DICT,
  ko: KO_DICT,
  "zh-tw": ZH_TW_DICT,
}

export function getDict(locale: IntlLocale): IntlDict {
  return DICTS[locale]
}
