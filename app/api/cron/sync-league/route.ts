/**
 * Cron job: Sync league data
 *
 * URL: /api/cron/sync-league?leagueId={id}&secret={CRON_SECRET}
 *
 * This endpoint is called by Vercel Cron or external schedulers.
 * Protected by a shared secret.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  getLeagueTransactionsRange,
  getNFLState,
  enrichTransactionPlayers,
} from '@/lib/sleeper'

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const { searchParams } = new URL(req.url)
    const secret = searchParams.get('secret')
    const leagueId = searchParams.get('leagueId')

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!leagueId) {
      return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
    }

    // Get league
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { teams: true },
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Get current NFL week
    const nflState = await getNFLState()
    const currentWeek = nflState.week

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

    // Process each transaction
    for (const txn of relevantTransactions) {
      const enriched = await enrichTransactionPlayers(txn)

      // Process adds
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

        // Update team last activity
        const txnDate = new Date(txn.created)
        if (!team.lastActivityAt || txnDate > team.lastActivityAt) {
          await prisma.leagueTeam.update({
            where: { id: team.id },
            data: { lastActivityAt: txnDate },
          })
        }
      }

      // Process drops
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
      where: { id: leagueId },
      data: { lastSyncAt: new Date() },
    })

    console.log(`[Cron] Synced league ${league.name}: ${addedCount} transactions`)

    return NextResponse.json({
      success: true,
      league: league.name,
      transactionsAdded: addedCount,
    })
  } catch (error) {
    console.error('[Cron] Error syncing league:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}
