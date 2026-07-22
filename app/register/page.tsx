import Link from 'next/link'
import RegisterForm from '@/components/register-form'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gradient">Учёт вилок GZ</h1>
          <p className="text-sm text-gray-400 mt-2">Создайте аккаунт</p>
          <p className="text-xs text-cyan-400 mt-1">Первый зарегистрированный пользователь станет администратором</p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-gray-400">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-cyan-400 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}
