import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL

  if (!webhookUrl) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_WEBHOOK_URL is not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()

    // Apps Script's /exec endpoint responds to POST with a 302 redirect to an
    // internal googleusercontent.com URL. That redirect target must be
    // requested with GET (not POST) or it returns a generic Drive
    // "Page Not Found" error. We handle the redirect manually to guarantee this.
    const firstResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'manual',
    })

    let finalResponse = firstResponse
    const location = firstResponse.headers.get('location')

    if (firstResponse.status >= 300 && firstResponse.status < 400 && location) {
      finalResponse = await fetch(location, { method: 'GET', redirect: 'follow' })
    }

    if (!finalResponse.ok) {
      const text = await finalResponse.text()
      return NextResponse.json({ error: 'Google Sheets webhook failed: ' + text }, { status: 502 })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
