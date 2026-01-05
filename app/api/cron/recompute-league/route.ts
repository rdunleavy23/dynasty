/**
 * Cron job: Recompute league analysis
 *
 * URL: /api/cron/recompute-league?leagueId={id}&secret={CRON_SECRET}
 *
 * Runs the analysis pipeline for a league.
 * Protected by a shared secret.
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeLeague } from '@/lib/analysis/pipeline'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const searchParams = req.nextUrl.searchParams
    const secret = searchParams.get('secret')
    const leagueId = searchParams.get('leagueId')

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!leagueId) {
      return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
    }

    // Verify league exists
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { name: true },
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Run analysis
    await analyzeLeague(leagueId)

    console.log(`[Cron] Analyzed league ${league.name}`)

    return NextResponse.json({
      success: true,
      league: league.name,
      message: 'Analysis completed',
    })
  } catch (error) {
    console.error('[Cron] Error analyzing league:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}
