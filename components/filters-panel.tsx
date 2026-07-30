'use client'

import { useState, useCallback } from 'react'

export interface Filters {
  worker: string
  bookmaker: string
  sport: string
  status: string
  dateFrom: string
  dateTo: string
  search: string
}

interface WorkerOption {
  id: string
  username: string
}

interface FiltersPanelProps {
  workers?: WorkerOption[]
  bookmakers: string[]
  sports: string[]
  onChange: (filters: Filters) => void
}

const initialFilters: Filters = {
  worker: '',
  bookmaker: '',
  sport: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  search: '',
}

export default function FiltersPanel({ workers, bookmakers, sports, onChange }: FiltersPanelProps) {
  const [filters, setFilters] = useState<Filters>(initialFilters)

  const update = useCallback(
    (key: keyof Filters, value: string) => {
      const next = { ...filters, [key]: value }
      setFilters(next)
      onChange(next)
    },
    [filters, onChange]
  )

  const reset = useCallback(() => {
    setFilters(initialFilters)
    onChange(initialFilters)
  }, [onChange])

  const inputClass = 'w-full px-3 py-2 rounded-lg input-dark text-sm'

  const hasFilters = Object.values(filters).some((v) => v !== '')

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Фильтры</h3>
        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            Сбросить
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <input
          type="search"
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          className={inputClass + ' col-span-full'}
          placeholder="Поиск по матчу, рынку, конторе, счету..."
        />
        {workers && workers.length > 0 && (
          <select
            value={filters.worker}
            onChange={(e) => update('worker', e.target.value)}
            className={inputClass}
          >
            <option value="">Все работники</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.username}
              </option>
            ))}
          </select>
        )}
        <select
          value={filters.bookmaker}
          onChange={(e) => update('bookmaker', e.target.value)}
          className={inputClass}
        >
          <option value="">Все конторы</option>
          {bookmakers.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={filters.sport}
          onChange={(e) => update('sport', e.target.value)}
          className={inputClass}
        >
          <option value="">Все виды спорта</option>
          {sports.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => update('status', e.target.value)}
          className={inputClass}
        >
          <option value="">Все статусы</option>
          <option value="pending">В игре</option>
          <option value="settled">Завершённые</option>
        </select>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update('dateFrom', e.target.value)}
          className={inputClass}
          placeholder="С даты"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => update('dateTo', e.target.value)}
          className={inputClass}
          placeholder="По дату"
        />
      </div>
    </div>
  )
}
