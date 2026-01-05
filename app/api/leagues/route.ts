/**
 * POST /api/leagues
 *
 * Creates a new league by importing from Sleeper.
 * Steps:
 * 1. Validate Sleeper league ID
 * 2. Fetch league metadata, users, and rosters
 * 3. Create league and team records
 * 4. Trigger initial sync
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/utils/auth-helpers'
import { getLeague, getLeagueUsers, getLeagueRosters } from '@/lib/sleeper'

const createLeagueSchema = z.object({
  sleeperLeagueId: z.string().min(1, 'League ID is required'),
})

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await req.json()
    const { sleeperLeagueId } = createLeagueSchema.parse(body)

    // Check if league already exists
    const existingLeague = await prisma.league.findUnique({
      where: { sleeperLeagueId },
    })

    if (existingLeague) {
      return NextResponse.json(
        { error: 'League already exists', leagueId: existingLeague.id },
        { status: 400 }
      )
    }

    // Fetch league data from Sleeper
    const [sleeperLeague, sleeperUsers, sleeperRosters] = await Promise.all([
      getLeague(sleeperLeagueId),
      getLeagueUsers(sleeperLeagueId),
      getLeagueRosters(sleeperLeagueId),
    ])

    // Create league
    const league = await prisma.league.create({
      data: {
        sleeperLeagueId,
        name: sleeperLeague.name,
        season: parseInt(sleeperLeague.season),
        platform: 'SLEEPER',
        ownerUserId: userId,
      },
    })

    // Create teams
    // Map users to rosters by owner_id
    const rosterMap = new Map(
      sleeperRosters.map((r) => [r.owner_id, r])
    )

    const teamPromises = sleeperUsers.map(async (user) => {
      const roster = rosterMap.get(user.user_id)
      if (!roster) {
        console.warn(`No roster found for user ${user.user_id}`)
        return null
      }

      return prisma.leagueTeam.create({
        data: {
          leagueId: league.id,
          sleeperOwnerId: user.user_id,
          sleeperRosterId: roster.roster_id,
          displayName: user.display_name || user.username,
          teamName: user.metadata?.team_name || null,
        },
      })
    })

    await Promise.all(teamPromises.filter(Boolean))

    return NextResponse.json({
      success: true,
      league: {
        id: league.id,
        name: league.name,
        season: league.season,
      },
      message: 'League created successfully. Run sync to import transaction data.',
    })
  } catch (error) {
    console.error('[API] Error creating league:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    // Handle Sleeper API errors
    if (error instanceof Error) {
      if (error.message.includes('Sleeper API error: 404')) {
        return NextResponse.json(
          { error: 'League not found', message: 'Please check your Sleeper league ID' },
          { status: 404 }
        )
      }

      if (error.message.includes('Sleeper API error: 429')) {
        return NextResponse.json(
          { error: 'Rate limited', message: 'Too many requests. Please try again in a few minutes.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create league', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/leagues
 *
 * Returns all leagues for the authenticated user
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leagues = await prisma.league.findMany({
      where: { ownerUserId: userId },
      select: {
        id: true,
        name: true,
        season: true,
        platform: true,
        lastSyncAt: true,
        createdAt: true,
        _count: {
          select: { teams: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ leagues })
  } catch (error) {
    console.error('[API] Error fetching leagues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leagues' },
      { status: 500 }
    )
  }
}
