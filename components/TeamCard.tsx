/**
 * TeamCard Component - Notion-inspired design
 *
 * Beautiful, modern team intelligence card with:
 * - Smooth hover animations
 * - Semantic colors for strategy and positions
 * - Clean typography and spacing
 * - Professional polish
 */

'use client'

import { getStrategyEmoji, getStrategyColor } from '@/lib/analysis/strategy'
import { getPositionalStateEmoji, getPositionalStateColor } from '@/lib/analysis/positions'
import type { TeamCard as TeamCardType } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { Activity, TrendingUp } from 'lucide-react'

interface TeamCardProps {
  team: TeamCardType
  onClick?: () => void
}

function getPositionStateDescription(state: string): string {
  switch (state) {
    case 'DESPERATE':
      return 'Actively seeking players at this position'
    case 'THIN':
      return 'Could use depth at this position'
    case 'STABLE':
      return 'Good depth at this position'
    case 'HOARDING':
      return 'Stacked at this position, likely trading'
    default:
      return ''
  }
}

function getStrategyDescription(strategy: string): string {
  switch (strategy) {
    case 'REBUILD':
      return 'Targeting young players & future picks - building for the future'
    case 'CONTEND':
      return 'Adding veterans & proven players - pushing for a championship'
    case 'TINKER':
      return 'High activity without clear direction - exploring options'
    case 'INACTIVE':
      return 'Little to no recent activity - may be checked out'
    case 'PENDING':
      return 'League is pre-draft - strategy will be determined after draft and season begins'
    default:
      return ''
  }
}

export function TeamCard({ team, onClick }: TeamCardProps) {
  const displayName = team.teamName || team.displayName
  const hasRecentActivity = team.daysSinceActivity !== null && team.daysSinceActivity < 7

  return (
    <div
      className="group bg-white rounded-xl shadow-soft hover:shadow-soft-lg border border-gray-100 hover:border-gray-200 p-6 transition-all duration-200 cursor-pointer animate-fade-in"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
            {displayName}
          </h3>
          {team.teamName && (
            <p className="text-sm text-gray-500 mt-0.5">{team.displayName}</p>
          )}
        </div>

        {/* Strategy Badge */}
        {team.strategyLabel && (
          <div
            className={`ml-3 px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 whitespace-nowrap ${getStrategyColor(team.strategyLabel)} cursor-help`}
            title={getStrategyDescription(team.strategyLabel)}
          >
            <span className="text-base leading-none">{getStrategyEmoji(team.strategyLabel)}</span>
            <span className="font-semibold">{team.strategyLabel}</span>
          </div>
        )}
      </div>

      {/* Activity Status */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {hasRecentActivity ? (
            <Activity className="w-4 h-4 text-green-500" />
          ) : (
            <Activity className="w-4 h-4 text-gray-400" />
          )}
          {team.lastActivityAt ? (
            <span className={`text-sm ${hasRecentActivity ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
              {formatDistanceToNow(new Date(team.lastActivityAt), { addSuffix: true })}
            </span>
          ) : (
            <span className="text-sm text-gray-400 italic">No recent activity</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>
            {team.last30dAdds} adds · {team.last30dDrops} drops
          </span>
        </div>
      </div>

      {/* Positional Needs */}
      <div className="mb-4">
        <h4 className="text-2xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Positional Status
        </h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(team.positionalNeeds).map(([position, state]) => (
            <div
              key={position}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${getPositionalStateColor(state)} cursor-help`}
              title={`${position}: ${state} - ${getPositionStateDescription(state)}`}
            >
              <span className="text-sm leading-none">{getPositionalStateEmoji(state)}</span>
              <span className="font-semibold">{position}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Explanation */}
      <div className="pt-4 border-t border-gray-50">
        <p className="text-sm text-gray-700 leading-relaxed">
          {team.strategyReason}
        </p>
      </div>

      {/* Hover Indicator */}
      <div className="mt-4 flex items-center gap-2 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs font-medium">View Details</span>
        <svg
          className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}
