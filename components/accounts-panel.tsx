'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Account, Profile } from '@/lib/types'
import { operatorBadgeColor } from '@/lib/operator-badge'
import ComboboxInput from './combobox-input'

const BOOKMAKERS = ['Fezbet', 'N1bet', 'Stonevegas', 'Pinnacle', 'Bookmaker.xyz']

interface AccountsPanelProps {
  initialAccounts: Account[]
  onChange: (accounts: Account[]) => void
  embedded?: boolean
  isAdmin?: boolean
  workers?: Profile[]
}

export default function AccountsPanel({ initialAccounts, onChange, embedded = false, isAdmin = false, workers = [] }: AccountsPanelProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [bookmaker, setBookmaker] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [login, setLogin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [reassigning, setReassigning] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const workerName = (id: string) => workers.find((w) => w.id === id)?.username || 'Неизвестно'

  const refreshAccounts = useCallback(async () => {
    const { data, error } = await supabase.from('accounts').select('*').order('created_at', { ascending: false })
    if (!error && data) {
      const updated = data as Account[]
      setAccounts(updated)
      onChange(updated)
    }
  }, [onChange, supabase])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookmaker.trim() || !accountNumber.trim()) return
    if (isAdmin && !ownerId) {
      alert('Выберите оператора, за которым закрепить аккаунт')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { error } = await supabase.from('accounts').insert({
      user_id: isAdmin ? ownerId : user.id,
      bookmaker: bookmaker.trim(),
      account_number: accountNumber.trim(),
      login: login.trim() || null,
      email: email.trim() || null,
      password: password.trim() || null,
      is_active: true,
    })

    if (error) {
      alert('Ошибка добавления аккаунта: ' + error.message)
      setLoading(false)
      return
    }

    setBookmaker('')
    setAccountNumber('')
    setLogin('')
    setEmail('')
    setPassword('')
    setOwnerId('')
    await refreshAccounts()
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить аккаунт?')) return
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) {
      alert('Ошибка удаления: ' + error.message)
      return
    }
    await refreshAccounts()
  }

  const handleReassign = async (id: string) => {
    const newOwnerId = reassigning[id]
    if (!newOwnerId) return
    const { error } = await supabase.from('accounts').update({ user_id: newOwnerId }).eq('id', id)
    if (error) {
      alert('Ошибка переназначения: ' + error.message)
      return
    }
    setReassigning((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    await refreshAccounts()
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg input-dark text-sm'

  const content = (
    <>
      {!embedded && <h2 className="text-xl font-semibold text-cyan-400">Аккаунты в игре</h2>}

      {isAdmin && (
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Оператор</label>
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">Выберите оператора</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>{w.username}</option>
            ))}
          </select>
        </div>
        <ComboboxInput
          id="account-bookmaker-list"
          label="Букмекер"
          value={bookmaker}
          onChange={setBookmaker}
          options={BOOKMAKERS}
          placeholder="БК"
          required
          className={inputClass}
        />
        <div>
          <label className="block text-xs text-gray-400 mb-1">Номер аккаунта</label>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className={inputClass}
            placeholder="12345"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Логин</label>
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className={inputClass}
            placeholder="login123"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="email@example.com"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Пароль</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg btn-primary font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Добавляем...' : '+ Добавить аккаунт'}
        </button>
      </form>
      )}

      <div className="space-y-2">
        {accounts.length === 0 ? (
          <p className="text-gray-500 text-sm">Пока нет аккаунтов.</p>
        ) : (
          accounts.map((acc) => (
            <details
              key={acc.id}
              className="group glass rounded-xl p-3 text-sm"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="text-white">
                  {acc.bookmaker} <span className="text-gray-400">{acc.account_number}</span>
                  {isAdmin && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${operatorBadgeColor(acc.user_id)}`}>
                      {workerName(acc.user_id)}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 group-open:hidden">Подробнее</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(acc.id)
                      }}
                      className="text-xs text-red-400 hover:text-red-300 transition"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400">
                <div>
                  Оператор: <span className="text-white">{isAdmin ? workerName(acc.user_id) : ''}</span>
                </div>
                {acc.login && (
                  <div>
                    Логин: <span className="text-white">{acc.login}</span>
                  </div>
                )}
                {acc.email && (
                  <div>
                    Email: <span className="text-white">{acc.email}</span>
                  </div>
                )}
                {acc.password && (
                  <div>
                    Пароль: <span className="text-white">{acc.password}</span>
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="mt-3 flex items-center gap-2">
                  <select
                    value={reassigning[acc.id] ?? acc.user_id}
                    onChange={(e) => setReassigning((prev) => ({ ...prev, [acc.id]: e.target.value }))}
                    className={inputClass}
                  >
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>{w.username}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleReassign(acc.id)}
                    disabled={!reassigning[acc.id] || reassigning[acc.id] === acc.user_id}
                    className="px-3 py-2 rounded-lg glass hover:border-cyan-400/40 transition text-xs font-medium text-cyan-300 disabled:opacity-50 whitespace-nowrap"
                  >
                    Закрепить
                  </button>
                </div>
              )}
            </details>
          ))
        )}
      </div>
    </>
  )

  if (embedded) return <div className="space-y-6">{content}</div>

  return <div className="glass rounded-2xl p-6 space-y-6">{content}</div>
}
