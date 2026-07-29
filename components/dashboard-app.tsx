'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Account, Profile, SurebetWithLegs } from '@/lib/types'
import { useSurebetJournal } from '@/lib/use-surebet-journal'
import { CurrencyProvider } from './currency-context'
import StatsPanel from './stats-panel'
import SurebetForm from './surebet-form'
import SurebetCard from './surebet-card'
import AccountsPanel from './accounts-panel'
import AccountStatsDashboard from './account-stats-dashboard'
import AdminPanel from './admin-panel'
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
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [showAccountStats, setShowAccountStats] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isAdmin = profile?.role === 'admin'

  const {
    usernames,
    loading,
    error,
    fetchSurebets,
    filteredSurebets,
  } = useSurebetJournal({
    initialSurebets,
    initialUsernames,
    initialProfiles,
    accounts,
    isAdmin,
  })

  const accountsRef = useRef<HTMLDivElement>(null)
  const accountStatsRef = useRef<HTMLDivElement>(null)
  const adminRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showAccounts) {
      accountsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showAccounts])

  useEffect(() => {
    if (showAccountStats) {
      accountStatsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showAccountStats])

  useEffect(() => {
    if (showAdmin) {
      adminRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showAdmin])

  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

        {/* Journal (compact) */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">Журнал вилок</h2>
            <Link
              href="/dashboard/journal"
              className="px-4 py-2 rounded-lg glass hover:border-cyan-400/40 transition text-sm font-medium text-cyan-300"
            >
              Показать все →
            </Link>
          </div>
          {loading ? (
            <p className="text-gray-400">Загрузка...</p>
          ) : filteredSurebets.length === 0 ? (
            <p className="text-gray-500">Пока нет вилок.</p>
          ) : (
            filteredSurebets.slice(0, 5).map((surebet) => (
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
          <div className="pt-6" ref={accountsRef}>
            <AccountsPanel
              initialAccounts={accounts}
              onChange={setAccounts}
            />
          </div>
        )}

        {/* Account stats dashboard */}
        {showAccountStats && (
          <div className="pt-6" ref={accountStatsRef}>
            <AccountStatsDashboard accounts={accounts} surebets={filteredSurebets} />
          </div>
        )}

        {/* Admin panel */}
        {isAdmin && showAdmin && (
          <div className="pt-6" ref={adminRef}>
            <AdminPanel initialUsers={initialProfiles} />
          </div>
        )}
      </div>

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Наверх"
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full glass flex items-center justify-center text-cyan-400 hover:border-cyan-400/40 transition shadow-lg"
        >
          ↑
        </button>
      )}
    </div>
  </CurrencyProvider>
  )
}
