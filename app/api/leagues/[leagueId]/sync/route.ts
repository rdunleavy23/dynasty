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
import {
  getLeague,
  getLeagueTransactionsRange,
  getPreviousLeagueIds,
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
    const { leagueId } = params

    // Get league
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { teams: true },
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Fetch Sleeper league metadata to check for dynasty continuity
    const sleeperLeague = await getLeague(league.sleeperLeagueId)
    
    // Determine which league(s) to fetch transactions from
    let leaguesToSync: Array<{ leagueId: string; season: string }> = []
    
    if (league.status === 'pre_draft' && sleeperLeague.previous_league_id) {
      // Dynasty league in pre-draft: fetch from previous season(s)
      console.log(`[Sync] Dynasty league ${league.name} is pre-draft, fetching from previous seasons`)
      const previousLeagueIds = await getPreviousLeagueIds(league.sleeperLeagueId, 2) // Last 2 seasons
      
      for (const prevLeagueId of previousLeagueIds) {
        const prevLeague = await getLeague(prevLeagueId)
        leaguesToSync.push({ leagueId: prevLeagueId, season: prevLeague.season })
      }
    } else if (league.status !== 'pre_draft') {
      // Active league: fetch from current season
      leaguesToSync.push({ leagueId: league.sleeperLeagueId, season: sleeperLeague.season })
    } else {
      // Pre-draft, non-dynasty league: no transactions to sync
      console.log(`[Sync] League ${league.name} is pre-draft (not dynasty), skipping transaction sync`)
      await analyzeLeague(leagueId)
      await prisma.league.update({
        where: { id: leagueId },
        data: { lastSyncAt: new Date() },
      })
      return NextResponse.json({
        success: true,
        stats: { transactionsProcessed: 0, recordsAdded: 0, teamsUpdated: 0 },
        message: 'League is pre-draft. No transactions to sync yet.',
      })
    }

    // Fetch transactions from all relevant leagues
    let allTransactions: any[] = []
    
    for (const { leagueId: syncLeagueId, season } of leaguesToSync) {
      console.log(`[Sync] Fetching transactions from ${season} season (${syncLeagueId})`)
      
      // Fetch all 18 weeks for historical data
      const transactions = await getLeagueTransactionsRange(syncLeagueId, 1, 18)
      allTransactions.push(...transactions)
    }

    console.log(`[Sync] Found ${allTransactions.length} total transactions across all seasons`)
    const transactions = allTransactions
    const currentWeek = 1 // Placeholder for week number

    // Filter for waiver and free agent transactions
    const relevantTransactions = transactions.filter(
      (t) => t.type === 'waiver' || t.type === 'free_agent'
    )

    console.log(`[Sync] Found ${relevantTransactions.length} waiver/FA transactions`)

    // Map roster IDs to team IDs for current season
    const rosterTeamMap = new Map(
      league.teams.map((t) => [t.sleeperRosterId, t])
    )
    
    // Also map by owner ID for historical transactions (dynasty continuity)
    const ownerTeamMap = new Map(
      league.teams.map((t) => [t.sleeperOwnerId, t])
    )
    
    // Build roster ID -> owner ID map for historical leagues
    const rosterOwnerMap = new Map<number, string>()
    for (const { leagueId: syncLeagueId } of leaguesToSync) {
      try {
        const { getLeagueRosters } = await import('@/lib/sleeper')
        const rosters = await getLeagueRosters(syncLeagueId)
        rosters.forEach(r => {
          rosterOwnerMap.set(r.roster_id, r.owner_id)
        })
      } catch (error) {
        console.warn(`Failed to fetch rosters for ${syncLeagueId}:`, error)
      }
    }

    let addedCount = 0
    let updatedActivityCount = 0

    // Process each transaction
    for (const txn of relevantTransactions) {
      const enriched = await enrichTransactionPlayers(txn)

      // Process adds
      for (const add of enriched.adds) {
        const rosterId = txn.adds?.[add.playerId]
        if (!rosterId) continue

        // Try to find team by roster ID first, then by owner ID for historical transactions
        let team = rosterTeamMap.get(rosterId)
        if (!team) {
          const ownerId = rosterOwnerMap.get(rosterId)
          if (ownerId) {
            team = ownerTeamMap.get(ownerId)
          }
        }
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

        // Try to find team by roster ID first, then by owner ID for historical transactions
        let team = rosterTeamMap.get(rosterId)
        if (!team) {
          const ownerId = rosterOwnerMap.get(rosterId)
          if (ownerId) {
            team = ownerTeamMap.get(ownerId)
          }
        }
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
