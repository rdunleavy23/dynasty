/**
 * Positional needs and roster analysis
 *
 * Classifies each position (QB, RB, WR, TE) as:
 * - DESPERATE: Urgent need, actively adding via waivers
 * - THIN: Below average depth
 * - STABLE: Adequate depth for the roster
 * - HOARDING: Above average depth, surplus
 *
 * Uses roster counts + recent waiver activity to infer needs.
 * Dynamically adjusts thresholds based on league configuration.
 */

import type { PositionalState, PositionalInputs, PositionalNeedsMap, RosterCountsMap } from '@/types'
import type { LeagueConfig } from '@/lib/league-config'
import { getPositionalThresholds } from '@/lib/league-config'

/**
 * Classify positional state for a single position
 *
 * Dynamically adjusts thresholds based on league configuration:
 * - DESPERATE: High waiver activity for position (scaled by scarcity)
 * - THIN: Below recommended depth for league settings
 * - HOARDING: Well above recommended depth
 * - STABLE: Everything else
 *
 * @param inputs - Position-specific roster and waiver data
 * @param leagueConfig - Optional league configuration for dynamic thresholds
 * @returns Positional state classification
 */
export function classifyPositionState(
  inputs: PositionalInputs,
  leagueConfig?: LeagueConfig
): PositionalState {
  const { position, starters, bench, waiverAdds21d } = inputs
  const totalPlayers = starters + bench

  // Get thresholds (dynamic if config provided, otherwise use defaults)
  let desperateAdds: number
  let thinBenchCount: number
  let hoardingBenchCount: number

  if (leagueConfig && (position === 'QB' || position === 'RB' || position === 'WR' || position === 'TE')) {
    const thresholds = getPositionalThresholds(position, leagueConfig)
    desperateAdds = thresholds.desperateAdds
    thinBenchCount = thresholds.thinBenchCount
    hoardingBenchCount = thresholds.hoardingBenchCount
  } else {
    // Default thresholds (backward compatible)
    desperateAdds = 3
    thinBenchCount = position === 'QB' || position === 'TE' ? 2 : 4
    hoardingBenchCount = position === 'QB' || position === 'TE' ? 3 : 6
  }

  // DESPERATE: High waiver activity signals urgent need
  if (waiverAdds21d >= desperateAdds) {
    return 'DESPERATE'
  }

  // Also DESPERATE: Very thin + some recent adds
  if (totalPlayers < thinBenchCount - 1 && waiverAdds21d >= 2) {
    return 'DESPERATE'
  }

  // THIN: Below recommended depth
  if (totalPlayers < thinBenchCount) {
    return 'THIN'
  }

  // HOARDING: Deep bench indicates surplus
  if (totalPlayers >= hoardingBenchCount) {
    return 'HOARDING'
  }

  // STABLE: Default
  return 'STABLE'
}

/**
 * Build complete positional profile for a team
 *
 * @param rosterCounts - Map of position -> {starters, bench}
 * @param waiverAddsByPosition - Map of position -> count of adds in last 21 days
 * @param leagueConfig - Optional league configuration for dynamic thresholds
 * @returns Positional needs map
 */
export function buildPositionalProfile(
  rosterCounts: RosterCountsMap,
  waiverAddsByPosition: Record<string, number>,
  leagueConfig?: LeagueConfig
): PositionalNeedsMap {
  const positions = ['QB', 'RB', 'WR', 'TE'] as const
  const needsMap: PositionalNeedsMap = {}

  for (const position of positions) {
    const counts = rosterCounts[position] || { starters: 0, bench: 0 }
    const waiverAdds21d = waiverAddsByPosition[position] || 0

    needsMap[position] = classifyPositionState({
      position,
      starters: counts.starters,
      bench: counts.bench,
      waiverAdds21d,
    }, leagueConfig)
  }

  return needsMap
}

/**
 * Count roster composition by position
 *
 * @param players - Array of player objects with position and isStarter flag
 * @returns Map of position -> {starters, bench}
 */
export function countRosterByPosition(
  players: Array<{ position: string; isStarter: boolean }>
): RosterCountsMap {
  const counts: RosterCountsMap = {}

  // Initialize positions
  const positions = ['QB', 'RB', 'WR', 'TE']
  for (const pos of positions) {
    counts[pos] = { starters: 0, bench: 0 }
  }

  // Count players
  for (const player of players) {
    const pos = player.position
    if (!counts[pos]) {
      counts[pos] = { starters: 0, bench: 0 }
    }

    if (player.isStarter) {
      counts[pos].starters++
    } else {
      counts[pos].bench++
    }
  }

  return counts
}

/**
 * Get emoji for positional state (for UI)
 */
export function getPositionalStateEmoji(state: PositionalState): string {
  switch (state) {
    case 'DESPERATE':
      return '🚨'
    case 'THIN':
      return '⚠️'
    case 'STABLE':
      return '✅'
    case 'HOARDING':
      return '📦'
  }
}

/**
 * Get color classes for positional state (Tailwind)
 */
export function getPositionalStateColor(state: PositionalState): string {
  switch (state) {
    case 'DESPERATE':
      return 'bg-desperate-50 text-desperate-700 border-desperate-100'
    case 'THIN':
      return 'bg-thin-50 text-thin-700 border-thin-100'
    case 'STABLE':
      return 'bg-stable-50 text-stable-700 border-stable-100'
    case 'HOARDING':
      return 'bg-hoarding-50 text-hoarding-700 border-hoarding-100'
  }
}

/**
 * Get human-readable description of positional state
 */
export function getPositionalStateDescription(state: PositionalState, position: string): string {
  switch (state) {
    case 'DESPERATE':
      return `Urgently needs ${position}s – actively adding via waivers`
    case 'THIN':
      return `Thin at ${position} – could use depth`
    case 'STABLE':
      return `Solid ${position} depth`
    case 'HOARDING':
      return `Surplus of ${position}s – potential trade pieces`
  }
}
