'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Account, Profile, SurebetWithLegs } from '@/lib/types'
import { Filters } from '@/components/filters-panel'

const SEARCH_DEBOUNCE_MS = 300
// Supabase's `.or()` filter syntax uses commas and parentheses as
// structural characters, so they're stripped from free-text search input
// to avoid breaking the generated filter expression.
function sanitizeSearchTerm(value: string): string {
  return value.replace(/[,()%]/g, ' ').trim()
}

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

  // Free-text search is debounced and executed against Supabase directly
  // (rather than filtering the already-loaded `surebets` array in memory),
  // so it keeps working correctly once the journal starts loading only a
  // recent window of data instead of the entire history.
  const [searchResults, setSearchResults] = useState<SurebetWithLegs[] | null>(null)
  const [searching, setSearching] = useState(false)
  const searchRequestId = useRef(0)

  useEffect(() => {
    const term = sanitizeSearchTerm(filters.search)
    if (!term) {
      setSearchResults(null)
      setSearching(false)
      return
    }

    const requestId = ++searchRequestId.current
    const handle = setTimeout(async () => {
      setSearching(true)

      let matchingUserIds: string[] = []
      if (isAdmin) {
        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', `%${term}%`)
        matchingUserIds = (matchedProfiles || []).map((p: { id: string }) => p.id)
      }

      const { data: matchedLegs } = await supabase
        .from('legs')
        .select('surebet_id')
        .or(`bookmaker.ilike.%${term}%,market.ilike.%${term}%,account.ilike.%${term}%`)
        .limit(500)
      const legSurebetIds = Array.from(
        new Set((matchedLegs || []).map((l: { surebet_id: string }) => l.surebet_id))
      )

      const orParts = [
        `match_name.ilike.%${term}%`,
        `sport.ilike.%${term}%`,
        `comment.ilike.%${term}%`,
      ]
      if (matchingUserIds.length > 0) {
        orParts.push(`user_id.in.(${matchingUserIds.join(',')})`)
      }
      if (legSurebetIds.length > 0) {
        orParts.push(`id.in.(${legSurebetIds.join(',')})`)
      }

      let builder = supabase
        .from('surebets')
        .select('*, legs(*)')
        .order('created_at', { ascending: false })
        .limit(200)
        .or(orParts.join(','))

      if (!isAdmin) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) builder = builder.eq('user_id', user.id)
      }

      const { data, error: searchError } = await builder

      // Ignore stale responses if the user kept typing.
      if (requestId !== searchRequestId.current) return

      if (searchError) {
        setError('Ошибка поиска: ' + searchError.message)
        setSearchResults([])
      } else {
        setSearchResults((data as unknown as SurebetWithLegs[]) || [])
      }
      setSearching(false)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(handle)
  }, [filters.search, isAdmin, supabase])

  const filteredSurebets = useMemo(() => {
    const source = searchResults ?? surebets
    return source.filter((s) => {
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
  }, [surebets, searchResults, filters])

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
    searching,
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
