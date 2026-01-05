/**
 * Smart trade idea generation
 *
 * Generates contextual trade suggestions based on:
 * - Team strategies (rebuild vs contend)
 * - Positional needs (desperate vs hoarding)
 * - League context (roster requirements, scoring format)
 *
 * Adjusts trade value recommendations based on league settings:
 * - Superflex leagues: QB value significantly higher
 * - PPR: WR value higher, RB value lower
 * - TE Premium: TE value significantly higher
 */

import { prisma } from '@/lib/db'
import type { TradeIdea, PositionalState, StrategyLabel } from '@/types'
import type { LeagueConfig } from '@/lib/league-config'
import { parseLeagueConfig, getPositionValueMultiplier } from '@/lib/league-config'

/**
 * Generate trade ideas for a specific team
 *
 * Logic:
 * 1. Find your team's surpluses (HOARDING positions)
 * 2. Find your team's needs (DESPERATE or THIN positions)
 * 3. For each other team, look for complementary needs
 * 4. Prioritize teams with compatible strategies
 * 5. Generate human-readable rationales
 *
 * @param myTeamId - The team requesting trade ideas
 * @param leagueId - The league context
 * @returns Array of trade ideas, sorted by confidence
 */
export async function generateTradeIdeas(
  myTeamId: string,
  leagueId: string
): Promise<TradeIdea[]> {
  // Get league configuration
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
  })

  const leagueConfig = league ? parseLeagueConfig({
    numTeams: league.numTeams,
    rosterPositions: league.rosterPositions as string[] | null,
    scoringSettings: league.scoringSettings as Record<string, number> | null,
    rosterSize: league.rosterSize,
    taxiSlots: league.taxiSlots,
    reserveSlots: league.reserveSlots,
  }) : undefined

  // Get my team with profiles
  const myTeam = await prisma.leagueTeam.findUnique({
    where: { id: myTeamId },
    include: {
      positionalProfile: true,
      waiverSummary: true,
    },
  })

  if (!myTeam) {
    throw new Error('Team not found')
  }

  // Get all other teams in league
  const otherTeams = await prisma.leagueTeam.findMany({
    where: {
      leagueId,
      id: { not: myTeamId },
    },
    include: {
      positionalProfile: true,
      waiverSummary: true,
    },
  })

  if (!myTeam.positionalProfile) {
    return []
  }

  const myNeeds = myTeam.positionalProfile.positionalNeeds as Record<string, PositionalState>
  const ideas: TradeIdea[] = []

  // Identify my surpluses and needs
  const mySurplus: string[] = []
  const myNeedsList: string[] = []

  for (const [position, state] of Object.entries(myNeeds)) {
    if (state === 'HOARDING') {
      mySurplus.push(position)
    }
    if (state === 'DESPERATE' || state === 'THIN') {
      myNeedsList.push(position)
    }
  }

  // For each other team, find complementary matches
  for (const otherTeam of otherTeams) {
    if (!otherTeam.positionalProfile) continue

    const theirNeeds = otherTeam.positionalProfile.positionalNeeds as Record<
      string,
      PositionalState
    >

    // Find positions where we have surplus and they have need
    for (const myGivePos of mySurplus) {
      const theirNeed = theirNeeds[myGivePos]
      if (theirNeed === 'DESPERATE' || theirNeed === 'THIN') {
        // They need what I have surplus of
        // Now find what they have surplus of that I need
        for (const [theirPos, theirState] of Object.entries(theirNeeds)) {
          if (theirState === 'HOARDING' && myNeedsList.includes(theirPos)) {
            // Match found!
            const idea = buildTradeIdea(
              myTeam,
              otherTeam,
              myGivePos,
              theirPos,
              theirNeed,
              myNeeds[theirPos],
              false,
              leagueConfig
            )
            ideas.push(idea)
          }
        }

        // Even if they don't have a surplus I need, still suggest if they're desperate
        if (theirNeed === 'DESPERATE') {
          // Suggest trading my surplus for any position I need
          for (const myNeedPos of myNeedsList) {
            if (myNeedPos !== myGivePos) {
              const idea = buildTradeIdea(
                myTeam,
                otherTeam,
                myGivePos,
                myNeedPos,
                theirNeed,
                myNeeds[myNeedPos],
                true, // Less confident since it's not mutual surplus
                leagueConfig
              )
              ideas.push(idea)
            }
          }
        }
      }
    }
  }

  // Sort by confidence (highest first)
  ideas.sort((a, b) => b.confidence - a.confidence)

  // Return top 10
  return ideas.slice(0, 10)
}

/**
 * Build a single trade idea with rationale
 */
function buildTradeIdea(
  myTeam: {
    id: string
    displayName: string
    strategyLabel: StrategyLabel | null
    teamName: string | null
  },
  otherTeam: {
    id: string
    displayName: string
    strategyLabel: StrategyLabel | null
    teamName: string | null
  },
  myGivePos: string,
  myGetPos: string,
  theirNeedState: PositionalState,
  myNeedState: PositionalState,
  lesserConfidence = false,
  leagueConfig?: LeagueConfig
): TradeIdea {
  const otherTeamName = otherTeam.teamName || otherTeam.displayName

  // Build rationale
  let rationale = `${otherTeamName} is ${theirNeedState.toLowerCase()} at ${myGivePos}`

  if (!lesserConfidence) {
    rationale += ` and has surplus ${myGetPos}s. You're ${myNeedState.toLowerCase()} at ${myGetPos} and have surplus ${myGivePos}s.`
  } else {
    rationale += `. You have surplus ${myGivePos}s and need ${myGetPos}s.`
  }

  // Add league-specific context
  if (leagueConfig) {
    const leagueContext = getLeagueTradeContext(myGivePos, myGetPos, leagueConfig)
    if (leagueContext) {
      rationale += ` ${leagueContext}`
    }
  }

  // Add strategy context
  if (otherTeam.strategyLabel) {
    const strategyContext = getStrategyTradeContext(
      myTeam.strategyLabel,
      otherTeam.strategyLabel
    )
    if (strategyContext) {
      rationale += ` ${strategyContext}`
    }
  }

  // Calculate confidence
  let confidence = 0.7

  // Boost confidence for mutual surplus/need
  if (!lesserConfidence) {
    confidence = 0.85
  }

  // Boost for desperate need
  if (theirNeedState === 'DESPERATE') {
    confidence += 0.1
  }

  // Adjust confidence based on position value in this league
  if (leagueConfig && (myGivePos === 'QB' || myGivePos === 'RB' || myGivePos === 'WR' || myGivePos === 'TE')) {
    const giveMultiplier = getPositionValueMultiplier(myGivePos as 'QB' | 'RB' | 'WR' | 'TE', leagueConfig)
    const getMultiplier = myGetPos === 'QB' || myGetPos === 'RB' || myGetPos === 'WR' || myGetPos === 'TE'
      ? getPositionValueMultiplier(myGetPos as 'QB' | 'RB' | 'WR' | 'TE', leagueConfig)
      : 1.0

    // If giving more valuable position, reduce confidence slightly
    if (giveMultiplier > getMultiplier * 1.2) {
      confidence *= 0.95
    }
    // If getting more valuable position, boost confidence
    if (getMultiplier > giveMultiplier * 1.2) {
      confidence *= 1.05
    }
  }

  // Cap at 0.95
  confidence = Math.min(confidence, 0.95)

  return {
    targetTeamId: otherTeam.id,
    targetTeamName: otherTeamName,
    suggestedGivePosition: myGivePos,
    suggestedGetPosition: myGetPos,
    rationale,
    confidence,
  }
}

/**
 * Add strategy-based context to trade rationale
 */
function getStrategyTradeContext(
  myStrategy: StrategyLabel | null,
  theirStrategy: StrategyLabel | null
): string | null {
  if (!myStrategy || !theirStrategy) return null

  // Contender trading with rebuilder
  if (myStrategy === 'CONTEND' && theirStrategy === 'REBUILD') {
    return 'They\'re rebuilding, so consider offering future picks or young players.'
  }

  if (myStrategy === 'REBUILD' && theirStrategy === 'CONTEND') {
    return 'They\'re contending, so ask for picks or young assets in return.'
  }

  // Both contending
  if (myStrategy === 'CONTEND' && theirStrategy === 'CONTEND') {
    return 'Both teams competing – focus on win-now pieces.'
  }

  // Both rebuilding
  if (myStrategy === 'REBUILD' && theirStrategy === 'REBUILD') {
    return 'Both rebuilding – could swap young players or picks.'
  }

  // Trading with inactive team
  if (theirStrategy === 'INACTIVE') {
    return 'Warning: Team appears inactive, may not respond to offers.'
  }

  return null
}

/**
 * Add league setting context to trade rationale
 */
function getLeagueTradeContext(
  givePos: string,
  getPos: string,
  config: LeagueConfig
): string | null {
  // Superflex QB trades
  if (config.scoringFormat.isSuperflex && (givePos === 'QB' || getPos === 'QB')) {
    if (givePos === 'QB') {
      return 'QB value is premium in superflex – ensure fair return.'
    }
    return 'QB highly valuable in superflex format.'
  }

  // TE Premium trades
  if (config.scoringFormat.isTEPremium && (givePos === 'TE' || getPos === 'TE')) {
    if (givePos === 'TE') {
      return 'TE premium scoring – TEs worth more in this league.'
    }
    return 'TE premium league – target top-tier TEs.'
  }

  // PPR WR value
  if (config.scoringFormat.isPPR && givePos === 'WR' && getPos === 'RB') {
    return 'WRs generally more valuable in PPR.'
  }

  if (config.scoringFormat.isPPR && givePos === 'RB' && getPos === 'WR') {
    return 'PPR format favors WRs – may need additional value.'
  }

  return null
}
