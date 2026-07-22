import Link from 'next/link'
import LoginForm from '@/components/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gradient">Учёт вилок GZ</h1>
          <p className="text-sm text-gray-400 mt-2">Войдите в систему</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-gray-400">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-cyan-400 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  )
}
