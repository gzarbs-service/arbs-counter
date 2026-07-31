'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'

interface AdminPanelProps {
  initialUsers?: Profile[]
  embedded?: boolean
}

export default function AdminPanel({ initialUsers = [], embedded = false }: AdminPanelProps) {
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setLoading(false)
    if (error) {
      alert('Ошибка загрузки пользователей: ' + error.message)
      return
    }
    setUsers(data || [])
  }, [supabase])

  const toggleRole = async (user: Profile) => {
    const newRole = user.role === 'admin' ? 'worker' : 'admin'
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', user.id)
      .select()
    if (error) {
      alert('Ошибка обновления роли: ' + error.message)
      return
    }
    if (!data || data.length === 0) {
      alert('Не удалось обновить роль. Проверь политику RLS в Supabase: админ должен иметь право на обновление всех профилей.')
      return
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)))
  }

  const content = (
    <>
      <div className="flex items-center justify-between">
        {!embedded && <h2 className="text-xl font-semibold text-cyan-400">Панель администратора</h2>}
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-4 py-2 rounded-lg glass text-sm hover:border-cyan-400/40 transition"
        >
          Обновить
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-400 border-b border-white/10">
            <tr>
              <th className="py-2">Логин</th>
              <th className="py-2">Роль</th>
              <th className="py-2">Дата регистрации</th>
              <th className="py-2">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="py-3">{user.username}</td>
                <td className="py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      user.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {user.role === 'admin' ? 'Администратор' : 'Работник'}
                  </span>
                </td>
                <td className="py-3 text-gray-400">
                  {new Date(user.created_at).toLocaleDateString('ru-RU')}
                </td>
                <td className="py-3">
                  <button
                    onClick={() => toggleRole(user)}
                    className="text-cyan-400 hover:underline text-xs"
                  >
                    {user.role === 'admin' ? 'Сделать работником' : 'Сделать админом'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-gray-500 text-center">
                  Нет пользователей
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )

  if (embedded) return <div className="space-y-4">{content}</div>

  return <div className="glass rounded-2xl p-6 space-y-4">{content}</div>
}
