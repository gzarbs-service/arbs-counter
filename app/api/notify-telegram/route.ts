import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured' }, { status: 500 })
  }

  try {
    const { text } = await request.json()
    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 })
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json({ error: 'Telegram API error: ' + body }, { status: 502 })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
