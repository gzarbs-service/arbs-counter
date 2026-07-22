'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, SurebetWithLegs } from '@/lib/types'
import { CurrencyProvider } from './currency-context'
import StatsPanel from './stats-panel'
import SurebetForm from './surebet-form'
import SurebetCard from './surebet-card'
import AdminPanel from './admin-panel'
import CurrencySelect from './currency-select'

interface DashboardAppProps {
  initialProfile: Profile | null
  initialSurebets: SurebetWithLegs[]
  initialUsernames?: Record<string, string>
  initialProfiles?: Profile[]
}

export default function DashboardApp({
  initialProfile,
  initialSurebets,
  initialUsernames = {},
  initialProfiles = [],
}: DashboardAppProps) {
  const [profile] = useState<Profile | null>(initialProfile)
  const [surebets, setSurebets] = useState<SurebetWithLegs[]>(initialSurebets)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const [usernames, setUsernames] = useState<Record<string, string>>(initialUsernames)
  const router = useRouter()
  const supabase = createClient()

  const isAdmin = profile?.role === 'admin'

  const fetchSurebets = useCallback(async () => {
    setLoading(true)
    setError('')

    let userId: string | null = null
    if (!isAdmin) {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null
    }

    let builder = supabase
      .from('surebets')
      .select('*, legs(*)')
      .order('created_at', { ascending: false })

    if (!isAdmin && userId) {
      builder = builder.eq('user_id', userId)
    }

    const { data, error: sbError } = await builder
    if (sbError) {
      setError('Ошибка загрузки вилок: ' + sbError.message)
      setLoading(false)
      return
    }

    const surebetsData = (data as unknown as SurebetWithLegs[]) || []
    setSurebets(surebetsData)

    if (isAdmin) {
      const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('id, username')
      if (!profilesError && profilesData) {
        const map: Record<string, string> = {}
        profilesData.forEach((p: { id: string; username: string }) => {
          map[p.id] = p.username
        })
        setUsernames(map)
      }
    }

    setLoading(false)
  }, [isAdmin, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <CurrencyProvider>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gradient">Учёт вилок GZ</h1>
              <p className="text-sm text-gray-400 mt-1">
                {profile ? `${profile.username} · ${profile.role === 'admin' ? 'Администратор' : 'Работник'}` : 'Загрузка...'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <CurrencySelect />
              {isAdmin && (
                <button
                  onClick={() => setShowAdmin(!showAdmin)}
                  className="px-4 py-2 rounded-lg glass hover:border-purple-400/40 transition text-sm font-medium"
                >
                  {showAdmin ? 'Скрыть админку' : 'Админ-панель'}
                </button>
              )}
              <button
                onClick={fetchSurebets}
                className="px-4 py-2 rounded-lg glass hover:border-cyan-400/40 transition text-sm font-medium"
              >
                Обновить
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg glass hover:border-red-400/40 transition text-sm font-medium text-red-300"
              >
                Выйти
              </button>
            </div>
          </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <StatsPanel surebets={surebets} />

        {/* Form */}
        <SurebetForm onCreated={fetchSurebets} />

        {/* Journal */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Журнал вилок</h2>
          {loading ? (
            <p className="text-gray-400">Загрузка...</p>
          ) : surebets.length === 0 ? (
            <p className="text-gray-500">Пока нет вилок. Создайте первую выше.</p>
          ) : (
            surebets.map((surebet) => (
              <SurebetCard
                key={surebet.id}
                surebet={surebet}
                isAdmin={isAdmin}
                username={usernames[surebet.user_id]}
                onUpdate={fetchSurebets}
              />
            ))
          )}
        </div>

        {/* Admin panel */}
        {isAdmin && showAdmin && (
          <div className="pt-6">
            <AdminPanel initialUsers={initialProfiles} />
          </div>
        )}
      </div>
    </div>
  </CurrencyProvider>
  )
}
