"use client"

const COPY = {
  ja: { label: "最初に何で海亀兄弟を知りましたか？（任意）", hint: "LINEに登録する前に知ったきっかけをお選びください。", empty: "選択してください", search: "Google検索", maps: "Googleマップ", friend: "知人・家族の紹介", repeat: "以前利用した", line: "LINEでの紹介・配信", flyer: "チラシ・名刺", other: "その他", unknown: "覚えていない" },
  en: { label: "How did you first hear about us? (Optional)", hint: "Please choose how you found us before adding us on LINE.", empty: "Please select", search: "Google Search", maps: "Google Maps", friend: "Friends or family", repeat: "I have booked before", line: "A LINE recommendation or message", flyer: "Flyer or business card", other: "Other", unknown: "I don't remember" },
  ko: { label: "처음 저희를 어떻게 알게 되셨나요? (선택)", hint: "LINE 친구 추가 전에 알게 된 경로를 선택해 주세요.", empty: "선택해 주세요", search: "Google 검색", maps: "Google 지도", friend: "지인·가족 소개", repeat: "이전에 이용했어요", line: "LINE 추천·메시지", flyer: "전단지·명함", other: "기타", unknown: "기억나지 않아요" },
  "zh-tw": { label: "您最初是如何得知我們的？（選填）", hint: "請選擇加入 LINE 好友之前得知我們的管道。", empty: "請選擇", search: "Google 搜尋", maps: "Google 地圖", friend: "親友介紹", repeat: "曾經參加過", line: "LINE 推薦或訊息", flyer: "傳單或名片", other: "其他", unknown: "不記得了" },
}

export function DiscoverySourceField({ locale = "ja", value, onChange }: {
  locale?: keyof typeof COPY; value: string; onChange: (value: string) => void
}) {
  const t = COPY[locale]
  const options = [
    ["google_search", t.search], ["gbp", t.maps], ["instagram", "Instagram"], ["youtube", "YouTube"],
    ["tiktok", "TikTok"], ["facebook", "Facebook"], ["threads", "Threads"], ["x", "X"],
    ["chatgpt", "ChatGPT"], ["claude", "Claude"], ["gemini", "Gemini"], ["perplexity", "Perplexity"],
    ["copilot", "Copilot"], ["grok", "Grok"], ["deepseek", "DeepSeek"],
    ["friend", t.friend], ["repeat", t.repeat], ["line", t.line], ["flyer", t.flyer], ["other", t.other], ["unknown", t.unknown],
  ]
  return <div className="sm:col-span-2">
    <label htmlFor="discovery-source" className="mb-2 block text-sm font-medium text-gray-700">{t.label}</label>
    <select id="discovery-source" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby="discovery-source-hint"
      className="min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-base text-gray-900 focus:border-emerald-500 focus:outline-emerald-500">
      <option value="">{t.empty}</option>
      {options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
    <p id="discovery-source-hint" className="mt-2 text-sm text-gray-600">{t.hint}</p>
  </div>
}
