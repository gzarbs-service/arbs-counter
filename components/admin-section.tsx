'use client'

import { useState } from 'react'
import { Profile, SurebetWithLegs } from '@/lib/types'
import AdminPanel from './admin-panel'
import WorkerStatsPanel from './worker-stats-panel'

interface AdminSectionProps {
  initialUsers: Profile[]
  surebets: SurebetWithLegs[]
}

type Tab = 'users' | 'stats'

export default function AdminSection({ initialUsers, surebets }: AdminSectionProps) {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'users'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'glass text-gray-400 hover:border-cyan-400/40'
            }`}
          >
            Пользователи
          </button>
          <button
            onClick={() => setTab('stats')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'stats'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'glass text-gray-400 hover:border-purple-400/40'
            }`}
          >
            Статистика работников
          </button>
        </div>
      </div>

      {tab === 'users' ? (
        <AdminPanel initialUsers={initialUsers} embedded />
      ) : (
        <WorkerStatsPanel profiles={initialUsers} surebets={surebets} />
      )}
    </div>
  )
}
