'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Account, Profile, SurebetWithLegs } from '@/lib/types'
import { useSurebetJournal } from '@/lib/use-surebet-journal'
import { hasPendingLegs } from '@/lib/calc'
import { PERIOD_LABELS, SurebetWindowPeriod } from '@/lib/surebets-window'
import { CurrencyProvider } from './currency-context'
import SurebetCard from './surebet-card'
import FiltersPanel from './filters-panel'
import CsvExport from './csv-export'
import CurrencySelect from './currency-select'
import NotificationBell from './notification-bell'

interface JournalPageProps {
  initialProfile: Profile | null
  initialSurebets: SurebetWithLegs[]
  initialUsernames?: Record<string, string>
  initialProfiles?: Profile[]
  initialAccounts?: Account[]
}

export default function JournalPage({
  initialProfile,
  initialSurebets,
  initialUsernames = {},
  initialProfiles = [],
  initialAccounts = [],
}: JournalPageProps) {
  const [profile] = useState<Profile | null>(initialProfile)
  const [accounts] = useState<Account[]>(initialAccounts)
  const router = useRouter()
  const supabase = createClient()

  const isAdmin = profile?.role === 'admin'

  const {
    usernames,
    loading,
    searching,
    error,
    filters,
    setFilters,
    fetchSurebets,
    filteredSurebets,
    bookmakerOptions,
    sportOptions,
    workerOptions,
    period,
    setPeriod,
  } = useSurebetJournal({
    initialSurebets,
    initialUsernames,
    initialProfiles,
    accounts,
    isAdmin,
  })

  const [activeTab, setActiveTab] = useState<'current' | 'settled'>('current')

  const currentSurebets = useMemo(
    () => filteredSurebets.filter((s) => hasPendingLegs(s)),
    [filteredSurebets]
  )
  const settledSurebets = useMemo(
    () => filteredSurebets.filter((s) => !hasPendingLegs(s)),
    [filteredSurebets]
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <CurrencyProvider>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Link href="/dashboard" className="text-sm text-cyan-300 hover:underline">
                ← Назад на дашборд
              </Link>
              <h1 className="text-3xl font-bold text-gradient mt-1">Журнал вилок</h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <CurrencySelect />
              {isAdmin && <NotificationBell />}
              <button
                onClick={() => fetchSurebets()}
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

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-gray-400">
              {activeTab === 'current'
                ? `Текущих вилок: ${currentSurebets.length}`
                : `Рассчитанных вилок: ${settledSurebets.length}`}
            </p>
            <CsvExport surebets={activeTab === 'current' ? currentSurebets : settledSurebets} usernames={usernames} filename={activeTab === 'current' ? 'current-surebets' : 'settled-surebets'} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Период:</span>
            {(['week', 'twoWeeks', 'month', 'all'] as SurebetWindowPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  period === p
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'glass text-gray-400 hover:border-cyan-400/40'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
            <span className="text-xs text-gray-500">
              (незакрытые вилки видны всегда, независимо от периода)
            </span>
          </div>

          <FiltersPanel
            workers={isAdmin ? workerOptions : undefined}
            bookmakers={bookmakerOptions}
            sports={sportOptions}
            onChange={setFilters}
          />
          {searching && <p className="text-xs text-gray-500">Поиск...</p>}

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'current'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'glass text-gray-400 hover:border-cyan-400/40'
              }`}
            >
              Текущие ({currentSurebets.length})
            </button>
            <button
              onClick={() => setActiveTab('settled')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'settled'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                  : 'glass text-gray-400 hover:border-green-400/40'
              }`}
            >
              Рассчитанные ({settledSurebets.length})
            </button>
          </div>

          <div className="space-y-4">
            {loading && currentSurebets.length === 0 && settledSurebets.length === 0 ? (
              <p className="text-gray-400">Загрузка...</p>
            ) : (activeTab === 'current' ? currentSurebets : settledSurebets).length === 0 ? (
              <p className="text-gray-500">
                {activeTab === 'current'
                  ? 'Нет текущих вилок.'
                  : 'Нет рассчитанных вилок.'}
              </p>
            ) : (
              (activeTab === 'current' ? currentSurebets : settledSurebets).map((surebet) => (
                <SurebetCard
                  key={surebet.id}
                  surebet={surebet}
                  isAdmin={isAdmin}
                  username={usernames[surebet.user_id]}
                  accounts={accounts}
                  onUpdate={fetchSurebets}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </CurrencyProvider>
  )
}
