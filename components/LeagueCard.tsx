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
  return (
    <Link href={`/leagues/${league.id}`}>
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5 hover:shadow-lg hover:border-primary-300 transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{league.name}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{league.season}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{league._count.teams} teams</span>
              </div>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
            {league.platform}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw className="w-4 h-4" />
          {league.lastSyncAt ? (
            <span>
              Synced {formatDistanceToNow(new Date(league.lastSyncAt), { addSuffix: true })}
            </span>
          ) : (
            <span className="text-orange-600 font-medium">Not synced yet</span>
          )}
        </div>
      </div>
    </Link>
  )
}
