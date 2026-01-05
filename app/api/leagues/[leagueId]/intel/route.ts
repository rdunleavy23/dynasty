/**
 * GET /api/leagues/[leagueId]/intel
 *
 * Returns comprehensive league intelligence:
 * - Team cards with strategy, needs, and activity
 * - League-wide intel feed
 * - Summary statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUserId, verifyLeagueOwnership } from '@/lib/utils/auth-helpers'
import { daysSince } from '@/lib/analysis/strategy'
import type {
  LeagueIntelResponse,
  TeamCard,
  IntelFeedItem,
  PositionalNeedsMap,
  StrategyLabel,
} from '@/types'

interface RouteContext {
  params: {
    leagueId: string
  }
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId } = params

    // Verify league ownership
    const hasAccess = await verifyLeagueOwnership(leagueId, userId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch league with all related data
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
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Build team cards
    const teamCards: TeamCard[] = league.teams.map((team) => {
      const daysSinceActivity = daysSince(team.lastActivityAt)
      // Parse JSON string for SQLite compatibility
      const positionalNeeds = team.positionalProfile?.positionalNeeds
        ? (typeof team.positionalProfile.positionalNeeds === 'string'
            ? JSON.parse(team.positionalProfile.positionalNeeds)
            : team.positionalProfile.positionalNeeds) as PositionalNeedsMap
        : {}

      return {
        id: team.id,
        displayName: team.displayName,
        teamName: team.teamName || undefined,
        strategyLabel: team.strategyLabel as StrategyLabel | null,
        strategyReason: team.notes || 'No strategy analysis yet',
        lastActivityAt: team.lastActivityAt,
        daysSinceActivity,
        positionalNeeds,
        last30dAdds: team.waiverSummary?.last30dAdds || 0,
        last30dDrops: team.waiverSummary?.last30dDrops || 0,
      }
    })

    // Build intel feed
    const feed: IntelFeedItem[] = []

    for (const team of league.teams) {
      const summary = team.waiverSummary

      // Strategy-based insights
      if (team.strategyLabel && team.notes) {
        feed.push({
          teamId: team.id,
          teamName: team.teamName || team.displayName,
          message: team.notes,
          timestamp: new Date(),
          category: 'strategy',
        })
      }

      // Waiver activity insights
      if (summary) {
        // Parse JSON string for SQLite compatibility
        const addsByPos = typeof summary.addsByPosition === 'string'
          ? JSON.parse(summary.addsByPosition) as Record<string, number>
          : (summary.addsByPosition as Record<string, number>)

        // Check for position-specific activity
        if (addsByPos && typeof addsByPos === 'object' && !Array.isArray(addsByPos)) {
          for (const [position, count] of Object.entries(addsByPos)) {
            if (typeof count === 'number' && count >= 3) {
              feed.push({
                teamId: team.id,
                teamName: team.teamName || team.displayName,
                message: `Added ${count} ${position}s in the last 30 days → likely ${position} desperate`,
                timestamp: new Date(),
                category: 'waiver',
              })
            }
          }
        }
      }

      // Inactivity warnings
      const daysSinceActivity = daysSince(team.lastActivityAt)
      if (daysSinceActivity !== null && daysSinceActivity >= 21) {
        feed.push({
          teamId: team.id,
          teamName: team.teamName || team.displayName,
          message: `No activity in ${daysSinceActivity} days → likely inactive`,
          timestamp: team.lastActivityAt || new Date(),
          category: 'activity',
        })
      }
    }

    // Calculate summary stats
    const totalMoves = league.teams.reduce(
      (sum, team) => sum + (team.waiverSummary?.last30dAdds || 0) + (team.waiverSummary?.last30dDrops || 0),
      0
    )
    const avgMovesPerTeam = league.teams.length > 0 ? totalMoves / league.teams.length : 0

    const mostActiveTeam = league.teams.length > 0
      ? league.teams.reduce((max, team) => {
          const moves = (team.waiverSummary?.last30dAdds || 0) + (team.waiverSummary?.last30dDrops || 0)
          const maxMoves = (max.waiverSummary?.last30dAdds || 0) + (max.waiverSummary?.last30dDrops || 0)
          return moves > maxMoves ? team : max
        }, league.teams[0])
      : null

    const mostInactiveTeam = league.teams.length > 0
      ? league.teams.reduce((max, team) => {
          const days1 = daysSince(team.lastActivityAt) || 0
          const days2 = daysSince(max.lastActivityAt) || 0
          return days1 > days2 ? team : max
        }, league.teams[0])
      : null

    const response: LeagueIntelResponse = {
      league: {
        id: league.id,
        name: league.name,
        season: league.season,
        lastSyncAt: league.lastSyncAt,
      },
      teams: teamCards,
      feed: feed.slice(0, 20), // Limit to top 20 items
      summary: {
        mostActiveTeam: mostActiveTeam ? mostActiveTeam.teamName || mostActiveTeam.displayName : null,
        mostInactiveTeam: mostInactiveTeam ? mostInactiveTeam.teamName || mostInactiveTeam.displayName : null,
        avgMovesPerTeam: Math.round(avgMovesPerTeam * 10) / 10,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API] Error fetching league intel:', error)

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('League not found')) {
        return NextResponse.json(
          { error: 'League not found', message: 'This league may have been deleted or you may not have access' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch league intel', details: (error as Error).message },
      { status: 500 }
    )
  }
}
