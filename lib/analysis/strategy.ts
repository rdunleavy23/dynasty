/**
 * Team strategy classification logic
 *
 * Classifies teams as REBUILD, CONTEND, TINKER, or INACTIVE based on:
 * - Transaction volume (activity level)
 * - Average age of players added vs dropped
 * - Days since last activity
 *
 * Heuristics are tunable - these are v1 defaults that work for most dynasty leagues.
 */

import type { StrategyLabel, StrategySignals, StrategyClassification } from '@/types'

/**
 * Classify team strategy based on behavioral signals
 *
 * Logic:
 * 1. INACTIVE: No moves in 21+ days OR zero moves in last 30 days
 * 2. REBUILD: Adding young players (avg age ≤ 24), dropping vets (avg age ≥ 26)
 * 3. CONTEND: Adding vets (avg age ≥ 26), dropping young players (avg age ≤ 24)
 * 4. TINKER: Mixed ages or moderate activity without clear pattern
 *
 * @param signals - Aggregated team behavior signals
 * @returns Classification with label, confidence score (0-1), and human-readable reason
 */
export function classifyTeamStrategy(signals: StrategySignals): StrategyClassification {
  const {
    totalMoves30d,
    avgAgeAdded30d,
    avgAgeDropped30d,
    rosterAvgAge,
    daysSinceLastActivity,
  } = signals

  // INACTIVE check (highest priority)
  // For pre-draft/offseason leagues, focus on transaction volume, not recency
  // (It's normal to have no activity during offseason)
  if (totalMoves30d === 0) {
    // No transactions in the analysis window (last 6 months of SEASON play)
    if (daysSinceLastActivity !== null && daysSinceLastActivity >= 180) {
      return {
        label: 'INACTIVE' as StrategyLabel,
        confidence: 0.9,
        reason: 'No activity in over 6 months – likely checked out or abandoned team.',
      }
    }
    return {
      label: 'INACTIVE' as StrategyLabel,
      confidence: 0.7,
      reason: 'Zero moves in recent season play – minimal engagement.',
    }
  }

  // Very low activity check
  if (totalMoves30d <= 2 && daysSinceLastActivity !== null && daysSinceLastActivity >= 240) {
    return {
      label: 'INACTIVE' as StrategyLabel,
      confidence: 0.8,
      reason: `Minimal activity (${totalMoves30d} moves) and ${Math.floor(daysSinceLastActivity / 30)} months since last transaction.`,
    }
  }

  // Not enough data for age-based classification
  if (avgAgeAdded30d === null || avgAgeDropped30d === null) {
    return {
      label: 'TINKER' as StrategyLabel,
      confidence: 0.5,
      reason: `${totalMoves30d} moves in 30 days, but not enough data to determine clear strategy.`,
    }
  }

  // REBUILD: Adding young, dropping old
  // Strong signal: adding avg ≤ 24, dropping avg ≥ 26
  if (avgAgeAdded30d <= 24 && avgAgeDropped30d >= 26) {
    const ageDiff = avgAgeDropped30d - avgAgeAdded30d
    const confidence = Math.min(0.7 + ageDiff * 0.05, 0.95)
    return {
      label: 'REBUILD' as StrategyLabel,
      confidence,
      reason: `Adding young players (avg age ${avgAgeAdded30d.toFixed(1)}) and dropping vets (avg age ${avgAgeDropped30d.toFixed(1)}) – rebuilding for the future.`,
    }
  }

  // Moderate rebuild: Adding young but not necessarily dropping old
  if (avgAgeAdded30d <= 23 && totalMoves30d >= 3) {
    return {
      label: 'REBUILD' as StrategyLabel,
      confidence: 0.65,
      reason: `Targeting young players (avg age ${avgAgeAdded30d.toFixed(1)}) – likely rebuilding.`,
    }
  }

  // CONTEND: Adding old, dropping young
  // Strong signal: adding avg ≥ 26, dropping avg ≤ 24
  if (avgAgeAdded30d >= 26 && avgAgeDropped30d <= 24) {
    const ageDiff = avgAgeAdded30d - avgAgeDropped30d
    const confidence = Math.min(0.7 + ageDiff * 0.05, 0.95)
    return {
      label: 'CONTEND' as StrategyLabel,
      confidence,
      reason: `Adding veterans (avg age ${avgAgeAdded30d.toFixed(1)}) and dropping youth (avg age ${avgAgeDropped30d.toFixed(1)}) – pushing for a championship.`,
    }
  }

  // Moderate contend: Adding vets
  if (avgAgeAdded30d >= 27 && totalMoves30d >= 3) {
    return {
      label: 'CONTEND' as StrategyLabel,
      confidence: 0.65,
      reason: `Targeting veteran players (avg age ${avgAgeAdded30d.toFixed(1)}) – likely competing now.`,
    }
  }

  // High activity tinker: Lots of moves but no clear age pattern
  if (totalMoves30d >= 8) {
    return {
      label: 'TINKER' as StrategyLabel,
      confidence: 0.7,
      reason: `High activity (${totalMoves30d} moves in 30 days) with mixed player ages – actively tinkering without clear direction.`,
    }
  }

  // Default: TINKER
  // Mixed ages, moderate activity, no clear pattern
  const avgAge = ((avgAgeAdded30d + avgAgeDropped30d) / 2).toFixed(1)
  return {
    label: 'TINKER' as StrategyLabel,
    confidence: 0.6,
    reason: `${totalMoves30d} moves with balanced age profile (avg ~${avgAge}) – making incremental adjustments.`,
  }
}

/**
 * Helper: Calculate days since a date
 */
export function daysSince(date: Date | null): number | null {
  if (!date) return null
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Helper: Get strategy label emoji for UI
 */
export function getStrategyEmoji(label: StrategyLabel | null): string {
  switch (label) {
    case 'REBUILD':
      return '🔨'
    case 'CONTEND':
      return '🏆'
    case 'TINKER':
      return '🔧'
    case 'INACTIVE':
      return '💤'
    case 'PENDING':
      return '⏳'
    default:
      return '❓'
  }
}

/**
 * Helper: Get strategy label color for UI (Tailwind classes)
 */
export function getStrategyColor(label: StrategyLabel | null): string {
  switch (label) {
    case 'REBUILD':
      return 'bg-rebuild-50 text-rebuild-700 border-rebuild-100'
    case 'CONTEND':
      return 'bg-contend-50 text-contend-700 border-contend-100'
    case 'TINKER':
      return 'bg-tinker-50 text-tinker-700 border-tinker-100'
    case 'INACTIVE':
      return 'bg-inactive-50 text-inactive-600 border-inactive-100'
    case 'PENDING':
      return 'bg-blue-50 text-blue-600 border-blue-100'
    default:
      return 'bg-gray-50 text-gray-500 border-gray-200'
  }
}
