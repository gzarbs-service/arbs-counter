'use client'

import { useCallback, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Account, Profile, SurebetWithLegs } from '@/lib/types'
import { Filters } from '@/components/filters-panel'

interface UseSurebetJournalArgs {
  initialSurebets: SurebetWithLegs[]
  initialUsernames?: Record<string, string>
  initialProfiles?: Profile[]
  accounts: Account[]
  isAdmin: boolean
}

export function useSurebetJournal({
  initialSurebets,
  initialUsernames = {},
  initialProfiles = [],
  accounts,
  isAdmin,
}: UseSurebetJournalArgs) {
  const supabase = createClient()

  const [surebets, setSurebets] = useState<SurebetWithLegs[]>(initialSurebets)
  const [usernames, setUsernames] = useState<Record<string, string>>(initialUsernames)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<Filters>({
    worker: '',
    bookmaker: '',
    sport: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  })

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
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const haystack = [
          s.match_name,
          s.sport,
          s.comment,
          usernames[s.user_id],
          ...s.legs.flatMap((l) => [l.bookmaker, l.market, l.account]),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
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

  return {
    surebets,
    setSurebets,
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
  }
}
