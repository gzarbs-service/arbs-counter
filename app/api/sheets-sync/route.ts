import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL

  if (!webhookUrl) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_WEBHOOK_URL is not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()

    // Apps Script's /exec endpoint redirects internally; sending Content-Type:
    // application/json breaks that redirect (405/"Page Not Found"). Sending as
    // text/plain avoids this while still letting the script JSON.parse the body.
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: 'Google Sheets webhook failed: ' + text }, { status: 502 })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
