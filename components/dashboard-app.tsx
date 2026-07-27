'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Account, Profile, SurebetWithLegs } from '@/lib/types'
import { CurrencyProvider } from './currency-context'
import StatsPanel from './stats-panel'
import SurebetForm from './surebet-form'
import SurebetCard from './surebet-card'
import AccountsPanel from './accounts-panel'
import AccountStatsDashboard from './account-stats-dashboard'
import AdminPanel from './admin-panel'
import FiltersPanel, { Filters } from './filters-panel'
import CsvExport from './csv-export'
import CurrencySelect from './currency-select'

interface DashboardAppProps {
  initialProfile: Profile | null
  initialSurebets: SurebetWithLegs[]
  initialUsernames?: Record<string, string>
  initialProfiles?: Profile[]
  initialAccounts?: Account[]
}

export default function DashboardApp({
  initialProfile,
  initialSurebets,
  initialUsernames = {},
  initialProfiles = [],
  initialAccounts = [],
}: DashboardAppProps) {
  const [profile] = useState<Profile | null>(initialProfile)
  const [surebets, setSurebets] = useState<SurebetWithLegs[]>(initialSurebets)
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [showAccountStats, setShowAccountStats] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    worker: '',
    bookmaker: '',
    sport: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  })
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

  const filteredSurebets = useMemo(() => {
    return surebets.filter((s) => {
      if (filters.worker && s.user_id !== filters.worker) return false
      if (filters.sport && s.sport !== filters.sport) return false
      if (filters.status && s.status !== filters.status) return false
      if (filters.bookmaker && !s.legs.some((l) => l.bookmaker === filters.bookmaker)) return false
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom)
        if (new Date(s.created_at) < from) return false
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo + 'T23:59:59.999Z')
        if (new Date(s.created_at) > to) return false
      }
      return true
    })
  }, [surebets, filters])

  const bookmakerOptions = useMemo(() => {
    const set = new Set<string>()
    accounts.forEach((a) => set.add(a.bookmaker))
    surebets.forEach((s) => s.legs.forEach((l) => set.add(l.bookmaker)))
    return Array.from(set).sort()
  }, [accounts, surebets])

  const sportOptions = useMemo(() => {
    const set = new Set<string>()
    surebets.forEach((s) => set.add(s.sport))
    return Array.from(set).sort()
  }, [surebets])

  const workerOptions = useMemo(() => {
    return initialProfiles.map((p) => ({ id: p.id, username: p.username }))
  }, [initialProfiles])

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
              <button
                onClick={() => setShowAccounts(!showAccounts)}
                className="px-4 py-2 rounded-lg glass hover:border-cyan-400/40 transition text-sm font-medium"
              >
                {showAccounts ? 'Скрыть аккаунты' : 'Аккаунты'}
              </button>
              <button
                onClick={() => setShowAccountStats(!showAccountStats)}
                className="px-4 py-2 rounded-lg glass hover:border-cyan-400/40 transition text-sm font-medium"
              >
                {showAccountStats ? 'Скрыть стату аккаунтов' : 'Статистика по аккаунтам'}
              </button>
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
        <StatsPanel surebets={filteredSurebets} />

        {/* Form */}
        <SurebetForm accounts={accounts} onCreated={fetchSurebets} />

        {/* Journal */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">Журнал вилок</h2>
            <CsvExport surebets={filteredSurebets} usernames={usernames} filename="surebets" />
          </div>
          <FiltersPanel
            workers={isAdmin ? workerOptions : undefined}
            bookmakers={bookmakerOptions}
            sports={sportOptions}
            onChange={setFilters}
          />
          {loading ? (
            <p className="text-gray-400">Загрузка...</p>
          ) : filteredSurebets.length === 0 ? (
            <p className="text-gray-500">Нет вилок по выбранным фильтрам.</p>
          ) : (
            filteredSurebets.map((surebet) => (
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

        {/* Accounts panel */}
        {showAccounts && (
          <div className="pt-6">
            <AccountsPanel
              initialAccounts={accounts}
              onChange={setAccounts}
            />
          </div>
        )}

        {/* Account stats dashboard */}
        {showAccountStats && (
          <div className="pt-6">
            <AccountStatsDashboard accounts={accounts} surebets={filteredSurebets} />
          </div>
        )}

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
