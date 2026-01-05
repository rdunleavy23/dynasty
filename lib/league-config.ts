/**
 * League configuration parser and utilities
 *
 * Parses Sleeper league settings to derive:
 * - Starting lineup requirements
 * - Roster depth needs
 * - Position scarcity multipliers
 * - Scoring format (PPR, superflex, etc.)
 */

export interface LeagueConfig {
  numTeams: number
  rosterSize: number
  taxiSlots: number
  reserveSlots: number

  // Parsed from rosterPositions array
  starters: {
    QB: number
    RB: number
    WR: number
    TE: number
    FLEX: number      // RB/WR/TE
    SUPERFLEX: number // QB/RB/WR/TE
    WRRB_FLEX: number // WR/RB only
    REC_FLEX: number  // WR/TE only
  }

  benchSlots: number

  // Scoring format detection
  scoringFormat: {
    ppr: number          // 0 = standard, 0.5 = half PPR, 1 = full PPR
    isPPR: boolean
    isSuperflex: boolean
    isTEPremium: boolean // TE get bonus points
  }

  // Derived positional requirements
  positionalNeeds: {
    QB: PositionalRequirement
    RB: PositionalRequirement
    WR: PositionalRequirement
    TE: PositionalRequirement
  }
}

export interface PositionalRequirement {
  minStarters: number       // Minimum starters at this position
  maxStarters: number       // Maximum starters (including flex)
  recommendedDepth: number  // Recommended total roster spots
  scarcityMultiplier: number // 1.0 = normal, >1 = more scarce
}

/**
 * Parse Sleeper league configuration
 */
export function parseLeagueConfig(league: {
  numTeams: number
  rosterPositions?: string[] | null
  scoringSettings?: Record<string, number> | null
  rosterSize?: number | null
  taxiSlots?: number
  reserveSlots?: number
}): LeagueConfig {
  const positions = league.rosterPositions || []
  const scoring = league.scoringSettings || {}

  // Count starting positions
  const starters = {
    QB: positions.filter(p => p === 'QB').length,
    RB: positions.filter(p => p === 'RB').length,
    WR: positions.filter(p => p === 'WR').length,
    TE: positions.filter(p => p === 'TE').length,
    FLEX: positions.filter(p => p === 'FLEX').length,
    SUPERFLEX: positions.filter(p => p === 'SUPER_FLEX' || p === 'WRRB_FLEX').length,
    WRRB_FLEX: positions.filter(p => p === 'WRRB_FLEX').length,
    REC_FLEX: positions.filter(p => p === 'REC_FLEX').length,
  }

  const benchSlots = positions.filter(p => p === 'BN').length
  const totalRosterSize = league.rosterSize || positions.length || 20

  // Detect scoring format
  const pprValue = scoring.rec || 0
  const tePremium = (scoring.bonus_rec_te || 0) > 0

  const scoringFormat = {
    ppr: pprValue,
    isPPR: pprValue >= 0.5,
    isSuperflex: starters.SUPERFLEX > 0,
    isTEPremium: tePremium,
  }

  // Calculate positional requirements
  const positionalNeeds = {
    QB: calculateQBRequirement(starters, scoringFormat, league.numTeams),
    RB: calculateRBRequirement(starters, scoringFormat, league.numTeams),
    WR: calculateWRRequirement(starters, scoringFormat, league.numTeams),
    TE: calculateTERequirement(starters, scoringFormat, league.numTeams),
  }

  return {
    numTeams: league.numTeams,
    rosterSize: totalRosterSize,
    taxiSlots: league.taxiSlots || 0,
    reserveSlots: league.reserveSlots || 0,
    starters,
    benchSlots,
    scoringFormat,
    positionalNeeds,
  }
}

/**
 * Calculate QB requirements based on league settings
 */
function calculateQBRequirement(
  starters: LeagueConfig['starters'],
  scoring: LeagueConfig['scoringFormat'],
  numTeams: number
): PositionalRequirement {
  const minStarters = starters.QB
  const maxStarters = starters.QB + (scoring.isSuperflex ? starters.SUPERFLEX : 0)

  // Superflex leagues need much deeper QB depth
  const recommendedDepth = scoring.isSuperflex ? maxStarters + 1 : minStarters + 1

  // QB scarcity increases in superflex
  const scarcityMultiplier = scoring.isSuperflex ? 1.8 : 1.0

  return {
    minStarters,
    maxStarters,
    recommendedDepth,
    scarcityMultiplier,
  }
}

/**
 * Calculate RB requirements
 */
function calculateRBRequirement(
  starters: LeagueConfig['starters'],
  scoring: LeagueConfig['scoringFormat'],
  numTeams: number
): PositionalRequirement {
  const minStarters = starters.RB
  const flexCount = starters.FLEX + starters.WRRB_FLEX + (scoring.isSuperflex ? starters.SUPERFLEX : 0)

  // Assume RBs fill ~60% of flex spots in standard, ~50% in PPR
  const expectedFlexRBs = Math.floor(flexCount * (scoring.isPPR ? 0.5 : 0.6))
  const maxStarters = minStarters + expectedFlexRBs

  // RB depth should be ~2x starters due to injury risk
  const recommendedDepth = Math.max(maxStarters * 2, minStarters + 4)

  // RB scarcity is higher in larger leagues
  const scarcityMultiplier = numTeams >= 14 ? 1.3 : numTeams >= 12 ? 1.1 : 1.0

  return {
    minStarters,
    maxStarters,
    recommendedDepth,
    scarcityMultiplier,
  }
}

/**
 * Calculate WR requirements
 */
function calculateWRRequirement(
  starters: LeagueConfig['starters'],
  scoring: LeagueConfig['scoringFormat'],
  numTeams: number
): PositionalRequirement {
  const minStarters = starters.WR
  const flexCount = starters.FLEX + starters.WRRB_FLEX + starters.REC_FLEX + (scoring.isSuperflex ? starters.SUPERFLEX : 0)

  // WRs fill more flex in PPR, less in standard
  const expectedFlexWRs = Math.floor(flexCount * (scoring.isPPR ? 0.7 : 0.4))
  const maxStarters = minStarters + expectedFlexWRs

  // WR depth: ~1.5x starters (less injury risk than RB)
  const recommendedDepth = Math.max(Math.floor(maxStarters * 1.5), minStarters + 3)

  // WR scarcity is lower than RB
  const scarcityMultiplier = scoring.isPPR ? 0.9 : 1.0

  return {
    minStarters,
    maxStarters,
    recommendedDepth,
    scarcityMultiplier,
  }
}

/**
 * Calculate TE requirements
 */
function calculateTERequirement(
  starters: LeagueConfig['starters'],
  scoring: LeagueConfig['scoringFormat'],
  numTeams: number
): PositionalRequirement {
  const minStarters = starters.TE
  const flexCount = starters.FLEX + starters.REC_FLEX + (scoring.isSuperflex ? starters.SUPERFLEX : 0)

  // TEs rarely fill flex except in TE premium
  const expectedFlexTEs = scoring.isTEPremium ? Math.floor(flexCount * 0.2) : 0
  const maxStarters = minStarters + expectedFlexTEs

  // TE depth: start + 1 backup unless TE premium
  const recommendedDepth = scoring.isTEPremium ? maxStarters + 2 : minStarters + 1

  // TE scarcity increases with TE premium scoring
  const scarcityMultiplier = scoring.isTEPremium ? 1.4 : 1.0

  return {
    minStarters,
    maxStarters,
    recommendedDepth,
    scarcityMultiplier,
  }
}

/**
 * Get dynamic thresholds for positional state classification
 *
 * Returns thresholds adjusted for league configuration
 */
export function getPositionalThresholds(
  position: 'QB' | 'RB' | 'WR' | 'TE',
  config: LeagueConfig
): {
  desperateAdds: number    // Waiver adds indicating desperation
  thinBenchCount: number   // Total players for "thin" designation
  hoardingBenchCount: number // Total players for "hoarding" designation
} {
  const needs = config.positionalNeeds[position]

  return {
    // Desperate: 3+ adds at position in 21 days (scaled by scarcity)
    desperateAdds: Math.floor(3 * needs.scarcityMultiplier),

    // Thin: Below recommended depth
    thinBenchCount: needs.recommendedDepth,

    // Hoarding: 150% of recommended depth
    hoardingBenchCount: Math.ceil(needs.recommendedDepth * 1.5),
  }
}

/**
 * Check if a position can fill a flex spot
 */
export function canFillFlex(
  position: string,
  flexType: 'FLEX' | 'SUPERFLEX' | 'WRRB_FLEX' | 'REC_FLEX'
): boolean {
  const flexMappings = {
    FLEX: ['RB', 'WR', 'TE'],
    SUPERFLEX: ['QB', 'RB', 'WR', 'TE'],
    WRRB_FLEX: ['RB', 'WR'],
    REC_FLEX: ['WR', 'TE'],
  }

  return flexMappings[flexType]?.includes(position) || false
}

/**
 * Calculate trade value multiplier based on league settings
 *
 * Positions increase in value based on scarcity and starting requirements
 */
export function getPositionValueMultiplier(
  position: 'QB' | 'RB' | 'WR' | 'TE',
  config: LeagueConfig
): number {
  const needs = config.positionalNeeds[position]

  // Base multiplier is scarcity
  let multiplier = needs.scarcityMultiplier

  // Adjust for number of starters required
  if (needs.maxStarters >= 3) {
    multiplier *= 1.2 // High demand positions worth more
  } else if (needs.maxStarters <= 1) {
    multiplier *= 0.8 // Low demand positions worth less
  }

  return multiplier
}

/**
 * Format league configuration for display
 */
export function formatLeagueConfig(config: LeagueConfig): string {
  const { starters, scoringFormat } = config

  const parts: string[] = []

  // Scoring format
  if (scoringFormat.isPPR) {
    parts.push(scoringFormat.ppr === 1 ? 'PPR' : 'Half PPR')
  } else {
    parts.push('Standard')
  }

  // Special formats
  if (scoringFormat.isSuperflex) parts.push('Superflex')
  if (scoringFormat.isTEPremium) parts.push('TE Premium')

  // Roster format
  const rosterFormat = [
    starters.QB && `${starters.QB}QB`,
    starters.RB && `${starters.RB}RB`,
    starters.WR && `${starters.WR}WR`,
    starters.TE && `${starters.TE}TE`,
    starters.FLEX && `${starters.FLEX}FLEX`,
  ].filter(Boolean).join('/')

  parts.push(rosterFormat)

  return parts.join(' • ')
}
