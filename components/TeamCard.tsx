/**
 * TeamCard Component
 *
 * Displays a single team's intelligence card with:
 * - Strategy label
 * - Last activity
 * - Positional needs
 * - Explanation
 */

'use client'

import { getStrategyEmoji, getStrategyColor } from '@/lib/analysis/strategy'
import { getPositionalStateEmoji, getPositionalStateColor } from '@/lib/analysis/positions'
import type { TeamCard as TeamCardType } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface TeamCardProps {
  team: TeamCardType
  onClick?: () => void
}

export function TeamCard({ team, onClick }: TeamCardProps) {
  const displayName = team.teamName || team.displayName

  return (
    <div
      className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
          {team.teamName && (
            <p className="text-sm text-gray-500">{team.displayName}</p>
          )}
        </div>

        {/* Strategy Badge */}
        {team.strategyLabel && (
          <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStrategyColor(team.strategyLabel)}`}>
            <span>{getStrategyEmoji(team.strategyLabel)}</span>
            <span>{team.strategyLabel}</span>
          </div>
        )}
      </div>

      {/* Last Activity */}
      <div className="mb-3">
        {team.lastActivityAt ? (
          <p className="text-sm text-gray-600">
            Last active:{' '}
            <span className="font-medium">
              {formatDistanceToNow(new Date(team.lastActivityAt), { addSuffix: true })}
            </span>
          </p>
        ) : (
          <p className="text-sm text-gray-500 italic">No recent activity</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {team.last30dAdds} adds, {team.last30dDrops} drops in last 30 days
        </p>
      </div>

      {/* Positional Needs */}
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(team.positionalNeeds).map(([position, state]) => (
          <div
            key={position}
            className={`px-2 py-1 rounded text-xs font-medium border ${getPositionalStateColor(state)}`}
          >
            {getPositionalStateEmoji(state)} {position}: {state}
          </div>
        ))}
      </div>

      {/* Strategy Reason */}
      <div className="pt-3 border-t border-gray-100">
        <p className="text-sm text-gray-700">{team.strategyReason}</p>
      </div>
    </div>
  )
}
