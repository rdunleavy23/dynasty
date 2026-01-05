/**
 * GET /api/leagues/[leagueId]/trade-ideas
 *
 * Generates smart trade suggestions for a specific team.
 * Query params:
 * - teamId: The team requesting trade ideas
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId, verifyLeagueOwnership } from '@/lib/utils/auth-helpers'
import { generateTradeIdeas } from '@/lib/analysis/trade-ideas'

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
    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify league ownership
    const hasAccess = await verifyLeagueOwnership(leagueId, userId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Generate trade ideas
    const ideas = await generateTradeIdeas(teamId, leagueId)

    return NextResponse.json({
      teamId,
      ideas,
      count: ideas.length,
    })
  } catch (error) {
    console.error('[API] Error generating trade ideas:', error)
    return NextResponse.json(
      { error: 'Failed to generate trade ideas', details: (error as Error).message },
      { status: 500 }
    )
  }
}
