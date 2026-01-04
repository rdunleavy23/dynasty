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
 */

import type { PositionalState, PositionalInputs, PositionalNeedsMap, RosterCountsMap } from '@/types'

/**
 * Classify positional state for a single position
 *
 * Heuristics (tunable):
 * - DESPERATE: 3+ waiver adds in last 21 days OR (thin bench AND recent adds)
 * - THIN: Bench depth < 2 (excluding desperate case)
 * - HOARDING: Bench depth >= 5
 * - STABLE: Everything else
 *
 * @param inputs - Position-specific roster and waiver data
 * @returns Positional state classification
 */
export function classifyPositionState(inputs: PositionalInputs): PositionalState {
  const { position, starters, bench, waiverAdds21d } = inputs

  // DESPERATE: High waiver activity signals urgent need
  if (waiverAdds21d >= 3) {
    return 'DESPERATE'
  }

  // Also DESPERATE: Thin + some recent adds
  if (bench < 2 && waiverAdds21d >= 2) {
    return 'DESPERATE'
  }

  // THIN: Low bench depth
  // Position-specific thresholds:
  // - QB: typically start 1-2, thin if bench < 1
  // - RB/WR: start 2-3, thin if bench < 2
  // - TE: start 1-2, thin if bench < 1
  const thinThreshold = position === 'QB' || position === 'TE' ? 1 : 2

  if (bench < thinThreshold) {
    return 'THIN'
  }

  // HOARDING: Deep bench indicates surplus
  // Position-specific thresholds:
  // - QB/TE: hoarding if bench >= 3 (rare in dynasty to need this many)
  // - RB/WR: hoarding if bench >= 5
  const hoardingThreshold = position === 'QB' || position === 'TE' ? 3 : 5

  if (bench >= hoardingThreshold) {
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
 * @returns Positional needs map
 */
export function buildPositionalProfile(
  rosterCounts: RosterCountsMap,
  waiverAddsByPosition: Record<string, number>
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
    })
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
      return 'bg-red-100 text-red-800 border-red-300'
    case 'THIN':
      return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'STABLE':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'HOARDING':
      return 'bg-purple-100 text-purple-800 border-purple-300'
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
