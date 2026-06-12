"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RotateCcw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[App Error]", error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-emerald-50 flex items-center justify-center px-5">
      <div className="text-center">
        <div className="text-amber-500 mb-6">
          <AlertTriangle className="h-24 w-24 mx-auto" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">エラーが発生しました</h1>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          申し訳ありません。一時的な問題が発生しました。再読み込みしても解決しない場合は、お電話（080-5344-2439）またはLINEでお気軽にご連絡ください。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto">
            <RotateCcw className="h-4 w-4 mr-2" />
            再読み込み
          </Button>
          <Link href="/">
            <Button variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50 w-full sm:w-auto bg-transparent">
              ホームに戻る
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
