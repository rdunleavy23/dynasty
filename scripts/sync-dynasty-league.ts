#!/usr/bin/env tsx
/**
 * Dynasty League Sync Script
 * 
 * Completely syncs a dynasty league from scratch:
 * 1. Creates league + teams
 * 2. Fetches transactions from ALL previous seasons
 * 3. Runs full analysis
 */

import { prisma } from '../lib/db'
import {
  getLeague,
  getLeagueUsers,
  getLeagueRosters,
  getPreviousLeagueIds,
  getLeagueTransactionsRange,
  enrichTransactionPlayers,
} from '../lib/sleeper'
import { analyzeLeague } from '../lib/analysis/pipeline'

const SLEEPER_LEAGUE_ID = '1312497096116404224'

async function main() {
  console.log('🏈 Dynasty League Sync Started\n')

  // Step 1: Fetch league metadata
  console.log('📥 Fetching league metadata...')
  const sleeperLeague = await getLeague(SLEEPER_LEAGUE_ID)
  console.log(`   League: ${sleeperLeague.name}`)
  console.log(`   Season: ${sleeperLeague.season}`)
  console.log(`   Status: ${sleeperLeague.status}`)

  // Step 2: Get or create league record
  console.log('\n📝 Creating/updating league record...')
  let league = await prisma.league.findUnique({
    where: { sleeperLeagueId: SLEEPER_LEAGUE_ID },
    include: { teams: true },
  })

  if (!league) {
    // Create anonymous user if needed
    let anonymousUser = await prisma.user.findUnique({
      where: { email: 'anonymous@local.dev' },
    })
    if (!anonymousUser) {
      anonymousUser = await prisma.user.create({
        data: { email: 'anonymous@local.dev' },
      })
    }

    // Create league
    league = await prisma.league.create({
      data: {
        sleeperLeagueId: SLEEPER_LEAGUE_ID,
        name: sleeperLeague.name,
        season: parseInt(sleeperLeague.season),
        status: sleeperLeague.status,
        platform: 'SLEEPER',
        ownerUserId: anonymousUser.id,
      },
      include: { teams: true },
    })
    console.log(`   ✓ Created league: ${league.name}`)

    // Create teams
    const [sleeperUsers, sleeperRosters] = await Promise.all([
      getLeagueUsers(SLEEPER_LEAGUE_ID),
      getLeagueRosters(SLEEPER_LEAGUE_ID),
    ])

    const rosterMap = new Map(sleeperRosters.map((r) => [r.owner_id, r]))
    for (const user of sleeperUsers) {
      const roster = rosterMap.get(user.user_id)
      if (!roster) continue

      await prisma.leagueTeam.create({
        data: {
          leagueId: league.id,
          sleeperOwnerId: user.user_id,
          sleeperRosterId: roster.roster_id,
          displayName: user.display_name || user.username,
          teamName: user.metadata?.team_name || null,
        },
      })
    }
    console.log(`   ✓ Created ${sleeperUsers.length} teams`)

    // Reload league with teams
    league = await prisma.league.findUnique({
      where: { id: league.id },
      include: { teams: true },
    })!
  } else {
    console.log(`   ✓ League already exists: ${league.name}`)
  }

  // Step 3: Get dynasty lineage
  console.log('\n🔗 Checking dynasty lineage...')
  const previousLeagueIds = await getPreviousLeagueIds(SLEEPER_LEAGUE_ID, 3)
  console.log(`   Found ${previousLeagueIds.length} previous seasons`)

  // All leagues to sync (including current if in_season)
  const leaguesToSync: Array<{ leagueId: string; season: string }> = []
  
  if (sleeperLeague.status !== 'pre_draft' || previousLeagueIds.length === 0) {
    leaguesToSync.push({ leagueId: SLEEPER_LEAGUE_ID, season: sleeperLeague.season })
  }
  
  for (const prevLeagueId of previousLeagueIds) {
    const prevLeague = await getLeague(prevLeagueId)
    leaguesToSync.push({ leagueId: prevLeagueId, season: prevLeague.season })
    console.log(`   - ${prevLeague.season}: ${prevLeagueId}`)
  }

  // Step 4: Build roster/owner mappings
  console.log('\n🗺️  Building roster→owner mappings...')
  const ownerTeamMap = new Map(league.teams.map((t) => [t.sleeperOwnerId, t]))
  const rosterOwnerMap = new Map<number, string>()
  
  for (const { leagueId: syncLeagueId, season } of leaguesToSync) {
    const rosters = await getLeagueRosters(syncLeagueId)
    rosters.forEach((r) => rosterOwnerMap.set(r.roster_id, r.owner_id))
    console.log(`   ✓ ${season}: ${rosters.length} rosters mapped`)
  }

  // Step 5: Fetch and store transactions
  console.log('\n💾 Fetching transactions...')
  let totalAdded = 0
  
  for (const { leagueId: syncLeagueId, season } of leaguesToSync) {
    console.log(`\n   📅 ${season} Season (${syncLeagueId})`)
    const transactions = await getLeagueTransactionsRange(syncLeagueId, 1, 18)
    const relevantTxns = transactions.filter(
      (t) => t.type === 'waiver' || t.type === 'free_agent'
    )
    console.log(`      Found ${relevantTxns.length} waiver/FA transactions`)

    for (const txn of relevantTxns) {
      const enriched = await enrichTransactionPlayers(txn)

      // Process adds
      for (const add of enriched.adds) {
        const rosterId = txn.adds?.[add.playerId]
        if (!rosterId) continue

        const ownerId = rosterOwnerMap.get(rosterId)
        if (!ownerId) continue
        
        const team = ownerTeamMap.get(ownerId)
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
            week: 1, // Approximate
          },
          update: {},
        })

        totalAdded++

        // Update last activity
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

        const ownerId = rosterOwnerMap.get(rosterId)
        if (!ownerId) continue
        
        const team = ownerTeamMap.get(ownerId)
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
            week: 1,
          },
          update: {},
        })

        totalAdded++
      }
    }
  }

  console.log(`\n   ✓ Stored ${totalAdded} transaction records`)

  // Step 6: Run analysis
  console.log('\n📊 Running analysis pipeline...')
  await analyzeLeague(league.id)
  console.log('   ✓ Analysis complete')

  // Step 7: Update sync timestamp
  await prisma.league.update({
    where: { id: league.id },
    data: { lastSyncAt: new Date() },
  })

  console.log('\n✅ Dynasty league sync complete!\n')
  
  // Print summary
  const finalLeague = await prisma.league.findUnique({
    where: { id: league.id },
    include: {
      teams: {
        include: {
          waiverSummary: true,
        },
      },
      _count: {
        select: { waiverTransactions: true },
      },
    },
  })

  console.log('📈 Summary:')
  console.log(`   League: ${finalLeague!.name}`)
  console.log(`   Teams: ${finalLeague!.teams.length}`)
  console.log(`   Transactions: ${finalLeague!._count.waiverTransactions}`)
  console.log(`   Seasons synced: ${leaguesToSync.length}`)
  
  const activeTeams = finalLeague!.teams.filter(t => t.strategyLabel !== 'INACTIVE').length
  console.log(`   Active teams: ${activeTeams}/${finalLeague!.teams.length}`)
}

main()
  .catch((error) => {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

