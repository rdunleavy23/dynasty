/**
 * POST /api/leagues/[leagueId]/sync
 *
 * Syncs league data from Sleeper:
 * 1. Fetch transactions for recent weeks
 * 2. Store waiver transactions
 * 3. Update team last activity timestamps
 * 4. Trigger analysis pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUserId, verifyLeagueOwnership } from '@/lib/utils/auth-helpers'
import {
  getLeagueTransactionsRange,
  getNFLState,
  enrichTransactionPlayers,
} from '@/lib/sleeper'
import { analyzeLeague } from '@/lib/analysis/pipeline'

interface RouteContext {
  params: {
    leagueId: string
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
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

    // Fetch transactions for last 8 weeks (or from week 1 if early in season)
    const startWeek = Math.max(1, currentWeek - 8)
    const endWeek = currentWeek

    console.log(`[Sync] Fetching transactions for ${league.name} (weeks ${startWeek}-${endWeek})`)

    const transactions = await getLeagueTransactionsRange(
      league.sleeperLeagueId,
      startWeek,
      endWeek
    )

    // Filter for waiver and free agent transactions
    const relevantTransactions = transactions.filter(
      (t) => t.type === 'waiver' || t.type === 'free_agent'
    )

    console.log(`[Sync] Found ${relevantTransactions.length} waiver/FA transactions`)

    // Map roster IDs to team IDs
    const rosterTeamMap = new Map(
      league.teams.map((t) => [t.sleeperRosterId, t])
    )

    let addedCount = 0
    let updatedActivityCount = 0

    // Process each transaction
    for (const txn of relevantTransactions) {
      const enriched = await enrichTransactionPlayers(txn)

      // Process adds
      for (const add of enriched.adds) {
        const rosterId = txn.adds?.[add.playerId]
        if (!rosterId) continue

        const team = rosterTeamMap.get(rosterId)
        if (!team) continue

        // Upsert transaction
        await prisma.waiverTransaction.upsert({
          where: {
            // Create a unique constraint based on team, player, type, and date
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
            week: currentWeek, // Approximate, actual week might differ
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
          updatedActivityCount++
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

    // Run analysis pipeline
    console.log(`[Sync] Running analysis for league ${league.name}`)
    await analyzeLeague(leagueId)

    return NextResponse.json({
      success: true,
      stats: {
        transactionsProcessed: relevantTransactions.length,
        recordsAdded: addedCount,
        teamsUpdated: updatedActivityCount,
      },
      message: 'League synced and analyzed successfully',
    })
  } catch (error) {
    console.error('[API] Error syncing league:', error)

    // Handle specific error types
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
      { error: 'Failed to sync league', details: (error as Error).message },
      { status: 500 }
    )
  }
}
