/**
 * Draft capital analysis
 *
 * Analyzes draft pick ownership and trading patterns:
 * - Teams accumulating picks = REBUILD signal
 * - Teams trading away picks = CONTEND signal
 * - Pick value calculation (earlier rounds > later rounds)
 * - Future draft capital strength
 */

/**
 * Calculate the value of a draft pick
 * Uses a simplified pick value chart
 *
 * 1st round picks: 100-50 points (declining)
 * 2nd round: 50-25 points
 * 3rd round: 25-10 points
 * 4th+ round: 5-1 points
 */
export function calculatePickValue(round: number, pickNumber?: number): number {
  switch (round) {
    case 1:
      // 1.01 = 100, 1.12 = 50 (for 12 team league)
      if (pickNumber) {
        return Math.max(100 - (pickNumber - 1) * 4, 50)
      }
      return 75 // Average first round pick

    case 2:
      if (pickNumber) {
        return Math.max(50 - (pickNumber - 13) * 2, 25)
      }
      return 37.5

    case 3:
      return 15

    case 4:
      return 8

    default:
      return 3
  }
}

/**
 * Calculate total draft capital for a team
 * Returns breakdown by year and total value
 */
export function calculateDraftCapital(picks: Array<{
  season: number
  round: number
  pickNumber?: number
}>): {
  totalValue: number
  byYear: Record<number, {
    count: number
    value: number
    picks: Array<{ round: number; value: number }>
  }>
  next3YearsValue: number
} {
  const currentYear = new Date().getFullYear()
  const byYear: Record<number, {
    count: number
    value: number
    picks: Array<{ round: number; value: number }>
  }> = {}

  let totalValue = 0
  let next3YearsValue = 0

  for (const pick of picks) {
    const value = calculatePickValue(pick.round, pick.pickNumber)
    totalValue += value

    if (pick.season <= currentYear + 3) {
      next3YearsValue += value
    }

    if (!byYear[pick.season]) {
      byYear[pick.season] = {
        count: 0,
        value: 0,
        picks: [],
      }
    }

    byYear[pick.season].count++
    byYear[pick.season].value += value
    byYear[pick.season].picks.push({
      round: pick.round,
      value,
    })
  }

  return {
    totalValue,
    byYear,
    next3YearsValue,
  }
}

/**
 * Compare draft capital to league average
 * Determines if team has excess or deficit picks
 */
export function compareDraftCapitalToAverage(
  teamCapital: number,
  leagueAverage: number
): 'abundant' | 'above-average' | 'average' | 'below-average' | 'depleted' {
  const ratio = teamCapital / leagueAverage

  if (ratio >= 1.5) return 'abundant'      // 50%+ more picks
  if (ratio >= 1.2) return 'above-average' // 20%+ more picks
  if (ratio >= 0.8) return 'average'       // Within 20% of average
  if (ratio >= 0.5) return 'below-average' // 20%+ fewer picks
  return 'depleted'                         // 50%+ fewer picks
}

/**
 * Analyze draft pick trading patterns
 * Determines if team is buying or selling future
 */
export function analyzeDraftPickTrading(
  originalPicks: Array<{ season: number; round: number }>,
  currentPicks: Array<{ season: number; round: number }>,
  currentYear: number
): {
  picksGained: number
  picksLost: number
  futurePicksGained: number  // Next 2 years
  futurePicksLost: number
  earlyPicksGained: number   // 1st-2nd round
  earlyPicksLost: number
  pattern: 'accumulating' | 'balanced' | 'selling'
  strength: 'strong' | 'moderate' | 'weak'
} {
  // Count future picks (next 2 years)
  const futureThreshold = currentYear + 2

  const currentFuture = currentPicks.filter(p => p.season <= futureThreshold && p.season > currentYear)
  const originalFuture = originalPicks.filter(p => p.season <= futureThreshold && p.season > currentYear)

  const futurePicksGained = currentFuture.length - originalFuture.length
  const futurePicksLost = futurePicksGained < 0 ? Math.abs(futurePicksGained) : 0

  // Count early round picks (1st-2nd)
  const currentEarly = currentPicks.filter(p => p.round <= 2)
  const originalEarly = originalPicks.filter(p => p.round <= 2)

  const earlyPicksGained = currentEarly.length - originalEarly.length
  const earlyPicksLost = earlyPicksGained < 0 ? Math.abs(earlyPicksGained) : 0

  const picksGained = currentPicks.length - originalPicks.length
  const picksLost = picksGained < 0 ? Math.abs(picksGained) : 0

  // Determine pattern
  let pattern: 'accumulating' | 'balanced' | 'selling'
  if (futurePicksGained >= 2 || earlyPicksGained >= 1) {
    pattern = 'accumulating'
  } else if (futurePicksLost >= 2 || earlyPicksLost >= 1) {
    pattern = 'selling'
  } else {
    pattern = 'balanced'
  }

  // Determine strength
  let strength: 'strong' | 'moderate' | 'weak'
  if (pattern === 'accumulating') {
    strength = futurePicksGained >= 3 ? 'strong' : 'moderate'
  } else if (pattern === 'selling') {
    strength = futurePicksLost >= 3 ? 'strong' : 'moderate'
  } else {
    strength = 'weak'
  }

  return {
    picksGained: Math.max(picksGained, 0),
    picksLost,
    futurePicksGained: Math.max(futurePicksGained, 0),
    futurePicksLost,
    earlyPicksGained: Math.max(earlyPicksGained, 0),
    earlyPicksLost,
    pattern,
    strength,
  }
}

/**
 * Generate draft capital description for UI
 */
export function describeDraftCapital(
  capital: {
    totalValue: number
    next3YearsValue: number
  },
  comparison: 'abundant' | 'above-average' | 'average' | 'below-average' | 'depleted',
  tradingPattern?: {
    pattern: 'accumulating' | 'balanced' | 'selling'
    strength: 'strong' | 'moderate' | 'weak'
  }
): string {
  const descriptions: Record<typeof comparison, string> = {
    abundant: 'Loaded with draft capital – strong rebuild foundation',
    'above-average': 'Above average draft picks – good flexibility',
    average: 'Standard draft capital',
    'below-average': 'Below average picks – traded for win-now',
    depleted: 'Minimal draft capital – all-in on current roster',
  }

  let desc = descriptions[comparison]

  if (tradingPattern) {
    if (tradingPattern.pattern === 'accumulating' && tradingPattern.strength === 'strong') {
      desc += '. Aggressively acquiring future picks.'
    } else if (tradingPattern.pattern === 'selling' && tradingPattern.strength === 'strong') {
      desc += '. Aggressively trading picks for talent.'
    }
  }

  return desc
}

/**
 * Calculate league average draft capital
 */
export function calculateLeagueAverageDraftCapital(
  allTeamPicks: Array<Array<{ season: number; round: number }>>
): number {
  const totalValues = allTeamPicks.map(teamPicks =>
    calculateDraftCapital(teamPicks).totalValue
  )

  return totalValues.reduce((sum, val) => sum + val, 0) / totalValues.length
}
