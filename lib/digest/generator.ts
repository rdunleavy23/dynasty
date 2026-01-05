/**
 * Weekly digest generator
 *
 * Aggregates league intelligence and formats it for email digests
 */

import { prisma } from '@/lib/db'
import type { IntelFeedItem } from '@/types'

export interface DigestData {
  leagueName: string
  weekNumber: number
  summary: string
  topInsights: Array<{ teamName: string; message: string; category: string }>
  tradeIdeas: Array<{
    team1: string
    team2: string
    description: string
    confidence: number
  }>
  dashboardUrl: string
}

/**
 * Generate digest data for a league
 */
export async function generateLeagueDigest(
  leagueId: string,
  baseUrl: string
): Promise<DigestData | null> {
  try {
    // Fetch league with teams and recent activity
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: {
          include: {
            waiverSummary: true,
            positionalProfile: true,
          },
        },
      },
    })

    if (!league) {
      console.warn(`[Digest] League ${leagueId} not found`)
      return null
    }

    // Generate intel feed items
    const intelFeed = await generateIntelFeed(leagueId)

    // Get top trade ideas
    const tradeIdeas = await getTopTradeIdeas(leagueId)

    // Generate summary
    const summary = generateSummary(league, intelFeed)

    // Get current week number (simplified - can be enhanced)
    const weekNumber = getCurrentWeekNumber()

    return {
      leagueName: league.name,
      weekNumber,
      summary,
      topInsights: intelFeed.slice(0, 5), // Top 5 insights
      tradeIdeas: tradeIdeas.slice(0, 3), // Top 3 trade ideas
      dashboardUrl: `${baseUrl}/dashboard/${leagueId}`,
    }
  } catch (error) {
    console.error('[Digest] Error generating digest:', error)
    return null
  }
}

/**
 * Generate intel feed items for a league
 */
async function generateIntelFeed(leagueId: string): Promise<IntelFeedItem[]> {
  const teams = await prisma.leagueTeam.findMany({
    where: { leagueId },
    include: {
      waiverSummary: true,
      positionalProfile: true,
    },
    orderBy: { lastActivityAt: 'desc' },
  })

  const items: IntelFeedItem[] = []

  for (const team of teams) {
    const teamName = team.teamName || team.displayName
    const timestamp = team.lastActivityAt || new Date()

    // Recent activity insights
    if (team.lastActivityAt) {
      const daysSince = Math.floor(
        (Date.now() - new Date(team.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysSince < 3) {
        items.push({
          teamId: team.sleeperTeamId,
          teamName,
          message: `Active in waivers ${daysSince === 0 ? 'today' : `${daysSince} days ago`}`,
          timestamp,
          category: 'activity',
        })
      }
    }

    // Waiver trends
    if (team.waiverSummary) {
      const { last30dAdds, last30dDrops } = team.waiverSummary

      if (last30dAdds >= 5) {
        items.push({
          teamId: team.sleeperTeamId,
          teamName,
          message: `Highly active on waivers - ${last30dAdds} adds in 30 days`,
          timestamp,
          category: 'waiver',
        })
      }

      if (last30dAdds === 0 && last30dDrops === 0) {
        items.push({
          teamId: team.sleeperTeamId,
          teamName,
          message: 'No waiver activity in 30 days - potentially inactive',
          timestamp,
          category: 'activity',
        })
      }
    }

    // Positional needs
    if (team.positionalProfile) {
      const profile = team.positionalProfile
      const positions = ['qb', 'rb', 'wr', 'te'] as const

      for (const pos of positions) {
        const state = profile[`${pos}State`] as string

        if (state === 'DESPERATE') {
          items.push({
            teamId: team.sleeperTeamId,
            teamName,
            message: `Desperate need at ${pos.toUpperCase()} - major roster weakness`,
            timestamp,
            category: 'strategy',
          })
        }

        if (state === 'HOARDING') {
          items.push({
            teamId: team.sleeperTeamId,
            teamName,
            message: `Stockpiling ${pos.toUpperCase()} - potential trade partner`,
            timestamp,
            category: 'strategy',
          })
        }
      }
    }

    // Strategy insights
    if (team.strategyLabel) {
      const insights: Record<string, string> = {
        REBUILD:
          'In rebuild mode - targeting youth and draft capital',
        CONTEND:
          'Win-now mode - likely seeking proven veterans',
        TINKER:
          'Making subtle adjustments - open to smart trades',
        INACTIVE:
          'Little recent activity - may be disengaged',
      }

      const message = insights[team.strategyLabel]
      if (message) {
        items.push({
          teamId: team.sleeperTeamId,
          teamName,
          message,
          timestamp,
          category: 'strategy',
        })
      }
    }
  }

  // Sort by relevance (activity category first, then strategy, then waiver)
  const categoryPriority: Record<string, number> = {
    activity: 1,
    strategy: 2,
    waiver: 3,
  }

  items.sort((a, b) => {
    const aPriority = categoryPriority[a.category] || 99
    const bPriority = categoryPriority[b.category] || 99
    return aPriority - bPriority
  })

  return items
}

/**
 * Get top trade ideas for a league
 */
async function getTopTradeIdeas(leagueId: string) {
  const teams = await prisma.leagueTeam.findMany({
    where: { leagueId },
    include: {
      positionalProfile: true,
    },
  })

  const tradeIdeas: Array<{
    team1: string
    team2: string
    description: string
    confidence: number
  }> = []

  // Simple trade idea generation based on complementary needs
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i]
      const team2 = teams[j]

      if (!team1.positionalProfile || !team2.positionalProfile) continue

      const team1Name = team1.teamName || team1.displayName
      const team2Name = team2.teamName || team2.displayName

      // Check for complementary needs
      const positions = ['qb', 'rb', 'wr', 'te'] as const

      for (const pos of positions) {
        const team1State = team1.positionalProfile[`${pos}State`] as string
        const team2State = team2.positionalProfile[`${pos}State`] as string

        // HOARDING + DESPERATE = Good trade potential
        if (
          (team1State === 'HOARDING' && team2State === 'DESPERATE') ||
          (team1State === 'DESPERATE' && team2State === 'HOARDING')
        ) {
          const giver = team1State === 'HOARDING' ? team1Name : team2Name
          const receiver = team1State === 'DESPERATE' ? team1Name : team2Name

          tradeIdeas.push({
            team1: giver,
            team2: receiver,
            description: `${giver} has surplus ${pos.toUpperCase()}, ${receiver} has desperate need`,
            confidence: 75,
          })
        }

        // STABLE + THIN = Medium trade potential
        if (
          (team1State === 'STABLE' && team2State === 'THIN') ||
          (team1State === 'THIN' && team2State === 'STABLE')
        ) {
          const giver = team1State === 'STABLE' ? team1Name : team2Name
          const receiver = team1State === 'THIN' ? team1Name : team2Name

          tradeIdeas.push({
            team1: giver,
            team2: receiver,
            description: `${receiver} could use depth at ${pos.toUpperCase()} from ${giver}`,
            confidence: 55,
          })
        }
      }
    }
  }

  // Sort by confidence and limit to top 3
  return tradeIdeas.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
}

/**
 * Generate summary text for the digest
 */
function generateSummary(
  league: {
    name: string
    teams: Array<{ waiverSummary: { last30dAdds: number } | null }>
  },
  intelFeed: IntelFeedItem[]
): string {
  const totalAdds = league.teams.reduce(
    (sum, team) => sum + (team.waiverSummary?.last30dAdds || 0),
    0
  )

  const activeTeams = league.teams.filter(
    (team) => (team.waiverSummary?.last30dAdds || 0) > 0
  ).length

  const activityLevel =
    totalAdds > 30 ? 'very active' : totalAdds > 15 ? 'moderately active' : 'quiet'

  const topCategories = intelFeed
    .slice(0, 5)
    .map((item) => item.category)
    .filter((cat, idx, arr) => arr.indexOf(cat) === idx)

  let summary = `Your league has been ${activityLevel} this week with ${totalAdds} total waiver moves across ${activeTeams} teams.`

  if (topCategories.includes('activity')) {
    summary += ' Several teams have made recent roster changes.'
  }

  if (topCategories.includes('strategy')) {
    summary += ' Notable strategy shifts detected in team building approaches.'
  }

  return summary
}

/**
 * Get current NFL week number (simplified)
 * In production, this would use a real NFL schedule API
 */
function getCurrentWeekNumber(): number {
  // Simplified calculation based on date
  // NFL season typically starts first week of September
  const now = new Date()
  const seasonStart = new Date(now.getFullYear(), 8, 1) // September 1

  if (now < seasonStart) {
    // Preseason
    return 0
  }

  const weeksSinceStart = Math.floor(
    (now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24 * 7)
  )

  return Math.min(weeksSinceStart + 1, 18) // NFL has 18 weeks
}
