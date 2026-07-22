import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'Логин и пароль обязательны. Пароль минимум 6 символов.' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    const { count, error: countError } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    const role = count === 0 ? 'admin' : 'worker'

    const email = `${username.toLowerCase().trim()}@company.local`

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, role },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      message: 'Пользователь создан',
      role,
      user: { id: data.user.id, username, role },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка сервера'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
