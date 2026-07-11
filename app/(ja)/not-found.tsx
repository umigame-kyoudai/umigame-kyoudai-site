import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Compass } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-emerald-50 flex items-center justify-center px-5">
      <div className="text-center">
        <div className="text-teal-600 mb-6">
          <Compass className="h-24 w-24 mx-auto" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">ページが見つかりません</h1>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              ホームに戻る
            </Button>
          </Link>
          <Link href="/plans">
            <Button variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50 w-full sm:w-auto bg-transparent">
              ツアープランを見る
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
