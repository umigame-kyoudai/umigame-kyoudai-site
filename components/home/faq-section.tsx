"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "泳ぎが苦手でも参加できますか？",
    answer: "はい、もちろん参加いただけます！ライフジャケットを着用するので沈む心配はありません。浮き具もご用意しているので、泳ぎに自信がない方でもウミガメと一緒に泳ぐ感動を体験できます。",
  },
  {
    question: "何歳から参加できますか？",
    answer: "シュノーケルツアーは5歳から参加可能です。お子様用の器材も完備しておりますので、ご家族みんなで安心してお楽しみいただけます。",
  },
  {
    question: "雨の日でも開催しますか？",
    answer: "小雨程度であれば開催いたします。海の中に入ってしまえば雨はほとんど気になりません。ただし、台風や強風など安全が確保できない場合は中止とします。お支払いは当日・現地現金決済のため、中止の場合はキャンセル料も料金もかかりません。",
  },
  {
    question: "持ち物は何が必要ですか？",
    answer: "水着、タオル、日焼け止めがあればOKです。シュノーケル器材とライフジャケットは無料でレンタルいたします。",
  },
]

function FAQItem({ faq }: { faq: typeof faqs[0] }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-gray-900 font-semibold text-sm md:text-base pr-4 group-hover:text-emerald-600 transition-colors">
          {faq.question}
        </span>
        <div className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </div>
      </button>
      {isOpen && (
        <div className="overflow-hidden">
          <p className="text-gray-500 text-sm leading-relaxed pb-5">
            {faq.answer}
          </p>
        </div>
      )}
    </div>
  )
}

export function FAQSection() {
  return (
    <section className="py-12 sm:py-16 md:py-28 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-emerald-600 font-semibold text-sm tracking-widest uppercase mb-3">FAQ</p>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
            よくある<span className="text-emerald-600">質問</span>
          </h2>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
          {faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} />
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/faq"
            className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
          >
            すべてのFAQを見る →
          </Link>
        </div>
      </div>
    </section>
  )
}
