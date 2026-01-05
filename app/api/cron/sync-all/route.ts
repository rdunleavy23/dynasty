/**
 * Cron job: Sync all leagues
 *
 * URL: /api/cron/sync-all (called by Vercel Cron)
 *
 * Syncs and analyzes all leagues in the system.
 * Runs daily at 2 AM UTC.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  getLeagueTransactionsRange,
  getNFLState,
  enrichTransactionPlayers,
} from '@/lib/sleeper'
import { analyzeLeague } from '@/lib/analysis/pipeline'

export async function GET(req: NextRequest) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all leagues
    const leagues = await prisma.league.findMany({
      include: { teams: true },
    })

    console.log(`[Cron] Starting sync for ${leagues.length} leagues`)

    const results = []

    // Get current NFL week
    const nflState = await getNFLState()
    const currentWeek = nflState.week

    for (const league of leagues) {
      try {
        // Fetch transactions for last 8 weeks
        const startWeek = Math.max(1, currentWeek - 8)
        const endWeek = currentWeek

        const transactions = await getLeagueTransactionsRange(
          league.sleeperLeagueId,
          startWeek,
          endWeek
        )

        const relevantTransactions = transactions.filter(
          (t) => t.type === 'waiver' || t.type === 'free_agent'
        )

        // Map roster IDs to team IDs
        const rosterTeamMap = new Map(
          league.teams.map((t) => [t.sleeperRosterId, t])
        )

        let addedCount = 0

        // Process transactions
        for (const txn of relevantTransactions) {
          const enriched = await enrichTransactionPlayers(txn)

          for (const add of enriched.adds) {
            const rosterId = txn.adds?.[add.playerId]
            if (!rosterId) continue

            const team = rosterTeamMap.get(rosterId)
            if (!team) continue

            await prisma.waiverTransaction.upsert({
              where: {
                id: `${team.id}-${add.playerId}-ADD-${txn.created}`,
              },
              create: {
                id: `${team.id}-${add.playerId}-ADD-${txn.created}`,
                leagueId: league.id,
                teamId: team.id,
                playerId: add.playerId,
                playerName: add.name,
                playerPosition: add.position,
                playerAge: add.age,
                transactionType: 'ADD',
                transactionDate: new Date(txn.created),
                week: currentWeek,
              },
              update: {},
            })

            addedCount++

            const txnDate = new Date(txn.created)
            if (!team.lastActivityAt || txnDate > team.lastActivityAt) {
              await prisma.leagueTeam.update({
                where: { id: team.id },
                data: { lastActivityAt: txnDate },
              })
            }
          }

          for (const drop of enriched.drops) {
            const rosterId = txn.drops?.[drop.playerId]
            if (!rosterId) continue

            const team = rosterTeamMap.get(rosterId)
            if (!team) continue

            await prisma.waiverTransaction.upsert({
              where: {
                id: `${team.id}-${drop.playerId}-DROP-${txn.created}`,
              },
              create: {
                id: `${team.id}-${drop.playerId}-DROP-${txn.created}`,
                leagueId: league.id,
                teamId: team.id,
                playerId: drop.playerId,
                playerName: drop.name,
                playerPosition: drop.position,
                playerAge: drop.age,
                transactionType: 'DROP',
                transactionDate: new Date(txn.created),
                week: currentWeek,
              },
              update: {},
            })

            addedCount++
          }
        }

        // Update league sync timestamp
        await prisma.league.update({
          where: { id: league.id },
          data: { lastSyncAt: new Date() },
        })

        // Run analysis
        await analyzeLeague(league.id)

        results.push({
          league: league.name,
          success: true,
          transactionsAdded: addedCount,
        })

        console.log(`[Cron] ✓ ${league.name}: ${addedCount} transactions`)
      } catch (error) {
        console.error(`[Cron] ✗ ${league.name}:`, error)
        results.push({
          league: league.name,
          success: false,
          error: (error as Error).message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      totalLeagues: leagues.length,
      results,
    })
  } catch (error) {
    console.error('[Cron] Error in sync-all:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}
