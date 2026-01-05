/**
 * Smart trade idea generation
 *
 * Generates contextual trade suggestions based on:
 * - Team strategies (rebuild vs contend)
 * - Positional needs (desperate vs hoarding)
 * - League context
 *
 * v1: Simple complementary needs matching
 * Future: Could add player values, trade fairness, historical acceptance rates
 */

import { prisma } from '@/lib/db'
import { deserializeJson } from '@/lib/utils/json-helpers'
import type { TradeIdea, PositionalState, StrategyLabel, PositionalNeedsMap } from '@/types'

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
  if (!myTeamId || !leagueId) {
    throw new Error('Invalid input: myTeamId and leagueId are required')
  }
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

  const myNeeds = deserializeJson(myTeam.positionalProfile.positionalNeeds) as PositionalNeedsMap || {}
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
    if (!otherTeam.positionalProfile || !otherTeam.positionalProfile.positionalNeeds) continue

    const theirNeeds = deserializeJson(otherTeam.positionalProfile.positionalNeeds) as PositionalNeedsMap || {}

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
              { ...myTeam, strategyLabel: myTeam.strategyLabel as StrategyLabel | null },
              { ...otherTeam, strategyLabel: otherTeam.strategyLabel as StrategyLabel | null },
              myGivePos,
              theirPos,
              theirNeed,
              myNeeds[theirPos]
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
                { ...myTeam, strategyLabel: myTeam.strategyLabel as StrategyLabel | null },
                { ...otherTeam, strategyLabel: otherTeam.strategyLabel as StrategyLabel | null },
                myGivePos,
                myNeedPos,
                theirNeed,
                myNeeds[myNeedPos],
                true // Less confident since it's not mutual surplus
              )
              ideas.push(idea)
            }
          }
        }
      }
    }
  }

  // Sort by confidence (highest first) and filter out invalid ideas
  const validIdeas = ideas.filter(idea =>
    idea.confidence > 0 &&
    idea.targetTeamId &&
    idea.targetTeamName &&
    idea.suggestedGivePosition &&
    idea.suggestedGetPosition
  )

  validIdeas.sort((a, b) => b.confidence - a.confidence)

  // Return top 10
  return validIdeas.slice(0, 10)
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
  lesserConfidence = false
): TradeIdea {
  const otherTeamName = otherTeam.teamName || otherTeam.displayName

  // Build rationale
  let rationale = `${otherTeamName} is ${theirNeedState.toLowerCase()} at ${myGivePos}`

  if (!lesserConfidence) {
    rationale += ` and has surplus ${myGetPos}s. You're ${myNeedState.toLowerCase()} at ${myGetPos} and have surplus ${myGivePos}s.`
  } else {
    rationale += `. You have surplus ${myGivePos}s and need ${myGetPos}s.`
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
