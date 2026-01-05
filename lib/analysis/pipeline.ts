/**
 * Complete analysis pipeline
 *
 * Coordinates fetching data, running analysis, and persisting results.
 * This is the main entry point for recomputing league intelligence.
 */

import { prisma } from '@/lib/db'
import { getEnrichedRoster } from '@/lib/sleeper'
import { classifyTeamStrategy, daysSince } from './strategy'
import { buildPositionalProfile, countRosterByPosition } from './positions'
import { parseLeagueConfig } from '@/lib/league-config'
import type { StrategySignals, PositionalNeedsMap, RosterCountsMap } from '@/types'

/**
 * Recompute waiver summary for a team
 *
 * Aggregates waiver transactions from the last 30 days and calculates:
 * - Total adds/drops
 * - Adds/drops by position
 * - Average age of players added/dropped
 * - Activity trend
 */
export async function recomputeTeamWaiverSummary(teamId: string): Promise<void> {
  const team = await prisma.leagueTeam.findUnique({
    where: { id: teamId },
    include: {
      waiverTransactions: {
        where: {
          transactionDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: { transactionDate: 'desc' },
      },
    },
  })

  if (!team) throw new Error(`Team ${teamId} not found`)

  // Count adds and drops
  const adds = team.waiverTransactions.filter((t) => t.transactionType === 'ADD')
  const drops = team.waiverTransactions.filter((t) => t.transactionType === 'DROP')

  // Aggregate by position
  const addsByPosition: Record<string, number> = {}
  const dropsByPosition: Record<string, number> = {}

  for (const add of adds) {
    const pos = add.playerPosition
    addsByPosition[pos] = (addsByPosition[pos] || 0) + 1
  }

  for (const drop of drops) {
    const pos = drop.playerPosition
    dropsByPosition[pos] = (dropsByPosition[pos] || 0) + 1
  }

  // Calculate average ages
  const agesAdded = adds.map((t) => t.playerAge).filter((age): age is number => age !== null)
  const agesDropped = drops.map((t) => t.playerAge).filter((age): age is number => age !== null)

  const avgAgeAdded = agesAdded.length > 0
    ? agesAdded.reduce((sum, age) => sum + age, 0) / agesAdded.length
    : null

  const avgAgeDropped = agesDropped.length > 0
    ? agesDropped.reduce((sum, age) => sum + age, 0) / agesDropped.length
    : null

  // Determine activity trend (simplified for v1)
  const totalMoves = adds.length + drops.length
  let activityTrend: 'RISING' | 'FALLING' | 'STABLE' | 'INACTIVE' = 'STABLE'

  if (totalMoves === 0) {
    activityTrend = 'INACTIVE'
  } else if (totalMoves >= 10) {
    activityTrend = 'RISING'
  } else if (totalMoves <= 2) {
    activityTrend = 'FALLING'
  }

  // Upsert summary
  await prisma.teamWaiverSummary.upsert({
    where: { teamId },
    create: {
      teamId,
      leagueId: team.leagueId,
      last30dAdds: adds.length,
      last30dDrops: drops.length,
      addsByPosition,
      dropsByPosition,
      avgPlayerAgeAdded: avgAgeAdded,
      avgPlayerAgeDropped: avgAgeDropped,
      activityTrend,
    },
    update: {
      last30dAdds: adds.length,
      last30dDrops: drops.length,
      addsByPosition,
      dropsByPosition,
      avgPlayerAgeAdded: avgAgeAdded,
      avgPlayerAgeDropped: avgAgeDropped,
      activityTrend,
      updatedAt: new Date(),
    },
  })
}

/**
 * Recompute positional profile for a team
 *
 * Analyzes current roster + recent waiver adds to determine positional needs.
 * Note: This requires roster data to be available.
 */
export async function recomputeTeamPositionalProfile(
  teamId: string,
  enrichedRoster?: {
    players: Array<{ position: string; isStarter: boolean }>
  }
): Promise<void> {
  const team = await prisma.leagueTeam.findUnique({
    where: { id: teamId },
    include: {
      league: true,
      waiverSummary: true,
      waiverTransactions: {
        where: {
          transactionType: 'ADD',
          transactionDate: {
            gte: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // Last 21 days
          },
        },
      },
    },
  })

  if (!team) throw new Error(`Team ${teamId} not found`)

  // Parse league configuration for dynamic thresholds
  const leagueConfig = parseLeagueConfig({
    numTeams: team.league.numTeams,
    rosterPositions: team.league.rosterPositions as string[] | null,
    scoringSettings: team.league.scoringSettings as Record<string, number> | null,
    rosterSize: team.league.rosterSize,
    taxiSlots: team.league.taxiSlots,
    reserveSlots: team.league.reserveSlots,
  })

  // Count waiver adds by position (last 21 days for positional analysis)
  const waiverAddsByPosition: Record<string, number> = {}
  for (const txn of team.waiverTransactions) {
    const pos = txn.playerPosition
    waiverAddsByPosition[pos] = (waiverAddsByPosition[pos] || 0) + 1
  }

  // Get roster counts (if provided, otherwise use empty)
  let rosterCounts: RosterCountsMap = {
    QB: { starters: 0, bench: 0 },
    RB: { starters: 0, bench: 0 },
    WR: { starters: 0, bench: 0 },
    TE: { starters: 0, bench: 0 },
  }

  if (enrichedRoster) {
    rosterCounts = countRosterByPosition(enrichedRoster.players)
  }

  // Build positional needs map with league-specific thresholds
  const positionalNeeds: PositionalNeedsMap = buildPositionalProfile(
    rosterCounts,
    waiverAddsByPosition,
    leagueConfig
  )

  // Upsert positional profile
  await prisma.teamPositionalProfile.upsert({
    where: { teamId },
    create: {
      teamId,
      leagueId: team.leagueId,
      positionalNeeds,
      rosterCounts,
    },
    update: {
      positionalNeeds,
      rosterCounts,
      updatedAt: new Date(),
    },
  })
}

/**
 * Recompute strategy classification for a team
 *
 * Uses waiver summary data to classify team strategy.
 */
export async function recomputeTeamStrategy(teamId: string): Promise<void> {
  const team = await prisma.leagueTeam.findUnique({
    where: { id: teamId },
    include: {
      waiverSummary: true,
    },
  })

  if (!team) throw new Error(`Team ${teamId} not found`)

  const summary = team.waiverSummary

  // Build signals
  const signals: StrategySignals = {
    totalMoves30d: summary ? summary.last30dAdds + summary.last30dDrops : 0,
    avgAgeAdded30d: summary?.avgPlayerAgeAdded ?? null,
    avgAgeDropped30d: summary?.avgPlayerAgeDropped ?? null,
    rosterAvgAge: null, // TODO: Could compute from roster if needed
    daysSinceLastActivity: daysSince(team.lastActivityAt),
  }

  // Classify
  const classification = classifyTeamStrategy(signals)

  // Update team
  await prisma.leagueTeam.update({
    where: { id: teamId },
    data: {
      strategyLabel: classification.label,
      strategyConfidence: classification.confidence,
      notes: classification.reason,
      updatedAt: new Date(),
    },
  })
}

/**
 * Run complete analysis for a single team
 *
 * This is the main entry point for updating all derived data for a team.
 */
export async function analyzeTeam(
  teamId: string,
  enrichedRoster?: {
    players: Array<{ position: string; isStarter: boolean }>
  }
): Promise<void> {
  // Run all analysis steps in sequence
  await recomputeTeamWaiverSummary(teamId)
  await recomputeTeamPositionalProfile(teamId, enrichedRoster)
  await recomputeTeamStrategy(teamId)
}

/**
 * Run analysis for all teams in a league
 */
export async function analyzeLeague(leagueId: string): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: true,
    },
  })

  if (!league) throw new Error(`League ${leagueId} not found`)

  // Analyze each team
  for (const team of league.teams) {
    await analyzeTeam(team.id)
  }

  console.log(`[Analysis] Completed analysis for league ${league.name} (${league.teams.length} teams)`)
}
