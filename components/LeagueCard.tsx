/**
 * LeagueCard Component
 *
 * Displays a league summary card for the dashboard
 */

'use client'

import { formatDistanceToNow } from 'date-fns'
import { Users, Calendar, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface LeagueCardProps {
  league: {
    id: string
    name: string
    season: number
    platform: string
    lastSyncAt: Date | null
    _count: {
      teams: number
    }
  }
}

export function LeagueCard({ league }: LeagueCardProps) {
  const isSynced = Boolean(league.lastSyncAt)

  return (
    <Link href={`/leagues/${league.id}`} className="group block">
      <div className="bg-white rounded-xl shadow-soft hover:shadow-soft-lg border border-gray-100 group-hover:border-primary-200 p-6 transition-all duration-200 animate-scale-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
              {league.name}
            </h3>
            <div className="flex items-center gap-4 mt-2.5">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{league.season}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Users className="w-4 h-4 text-gray-400" />
                <span>{league._count.teams} teams</span>
              </div>
            </div>
          </div>
          <div className="ml-3 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-xs font-semibold border border-primary-100">
            {league.platform}
          </div>
        </div>

        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${isSynced ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
          <RefreshCw className={`w-4 h-4 ${isSynced ? '' : 'animate-pulse'}`} />
          {league.lastSyncAt ? (
            <span className="font-medium">
              Synced {formatDistanceToNow(new Date(league.lastSyncAt), { addSuffix: true })}
            </span>
          ) : (
            <span className="font-semibold">Not synced yet – Click to sync</span>
          )}
        </div>
      </div>
    </Link>
  )
}
