import { NextResponse } from 'next/server'
import { messagingApi } from '@line/bot-sdk'

const { MessagingApiClient } = messagingApi

interface NotifyRequest {
  lineUserId: string
  customMessage: string
  retryKey?: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  let retryKey: string | undefined

  try {
    const notifySecret = process.env.LINE_NOTIFY_SECRET
    if (!notifySecret) {
      console.error('[LINE Notify] LINE_NOTIFY_SECRET が未設定のため通知を拒否')
      return NextResponse.json(
        { success: false, error: 'サーバー設定エラー' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${notifySecret}`) {
      return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 })
    }

    const body: NotifyRequest = await request.json()

    if (!body.lineUserId || !body.customMessage) {
      return NextResponse.json(
        { success: false, error: 'lineUserId と customMessage は必須です' },
        { status: 400 }
      )
    }

    if (typeof body.retryKey !== 'undefined') {
      if (
        typeof body.retryKey !== 'string' ||
        !UUID_PATTERN.test(body.retryKey)
      ) {
        return NextResponse.json(
          { success: false, error: 'retryKey の形式が不正です' },
          { status: 400 }
        )
      }

      retryKey = body.retryKey
    }

    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (!channelAccessToken) {
      console.error('[LINE Notify] LINE_CHANNEL_ACCESS_TOKEN が未設定')
      return NextResponse.json(
        { success: false, error: 'LINE設定エラー' },
        { status: 500 }
      )
    }

    const client = new MessagingApiClient({ channelAccessToken })

    await client.pushMessage(
      {
        to: body.lineUserId,
        messages: [{ type: 'text', text: body.customMessage }],
      },
      retryKey
    )

    return NextResponse.json({ success: true, message: '通知を送信しました' })
  } catch (error) {
    const status =
      typeof error === 'object' && error !== null
        ? Number(
            'status' in error
              ? error.status
              : 'statusCode' in error
                ? error.statusCode
                : 0
          )
        : 0

    // LINE側が同じリトライキーを受理済みの場合は、再送せず成功として扱う。
    if (retryKey && status === 409) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: '同じ通知はすでにLINEで受理されています',
      })
    }

    const msg = error instanceof Error ? error.message : String(error)
    console.error('[LINE Notify] Error:', msg)
    return NextResponse.json(
      { success: false, error: '通知の送信に失敗しました' },
      { status: 500 }
    )
  }
}
