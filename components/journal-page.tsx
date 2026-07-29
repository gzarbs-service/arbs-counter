'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Account, Profile, SurebetWithLegs } from '@/lib/types'
import { useSurebetJournal } from '@/lib/use-surebet-journal'
import { CurrencyProvider } from './currency-context'
import SurebetCard from './surebet-card'
import FiltersPanel from './filters-panel'
import CsvExport from './csv-export'
import CurrencySelect from './currency-select'

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
    error,
    filters,
    setFilters,
    fetchSurebets,
    filteredSurebets,
    bookmakerOptions,
    sportOptions,
    workerOptions,
  } = useSurebetJournal({
    initialSurebets,
    initialUsernames,
    initialProfiles,
    accounts,
    isAdmin,
  })

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

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-gray-400">Найдено вилок: {filteredSurebets.length}</p>
            <CsvExport surebets={filteredSurebets} usernames={usernames} filename="surebets" />
          </div>

          <FiltersPanel
            workers={isAdmin ? workerOptions : undefined}
            bookmakers={bookmakerOptions}
            sports={sportOptions}
            onChange={setFilters}
          />

          <div className="space-y-4">
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
        </div>
      </div>
    </CurrencyProvider>
  )
}
