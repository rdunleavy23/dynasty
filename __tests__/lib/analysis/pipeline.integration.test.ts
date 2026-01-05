/**
 * Integration tests for analysis pipeline
 *
 * Tests the full analysis pipeline end-to-end with synthetic league data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { analyzeLeague, analyzeTeam } from '@/lib/analysis/pipeline'
import { prisma } from '@/lib/db'
import {
  createMockLeague,
  createMockUsers,
  createMockRosters,
  createMockTransactionWithPlayers,
  createMockPlayers,
  createTeamWithStrategy,
  expectTeamAnalysis,
} from '../test-helpers'
import type { StrategyLabel } from '@/types'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    leagueTeam: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    league: {
      findUnique: vi.fn(),
    },
    teamWaiverSummary: {
      upsert: vi.fn(),
    },
    teamPositionalProfile: {
      upsert: vi.fn(),
    },
  },
}))

describe('Integration Tests - Full Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should analyze a complete league with multiple teams', async () => {
    const league = createMockLeague({ num_teams: 4 })
    const users = createMockUsers(4)
    const rosters = createMockRosters(users)
    const players = createMockPlayers(20)

    // Create mock league data
    const mockLeague = {
      id: 'league1',
      name: league.name,
      teams: rosters.map((r, i) => ({
        id: `team_${i + 1}`,
        sleeperRosterId: r.roster_id,
        sleeperOwnerId: r.owner_id,
      })),
    }

    // Setup team data with different strategies
    const teamData = [
      {
        // Rebuilder: adding young, dropping old
        id: 'team_1',
        leagueId: 'league1',
        waiverTransactions: Array.from({ length: 10 }, (_, i) => ({
          playerId: `player_${i}`,
          playerAge: i < 5 ? 22 : 28, // First 5 are young adds, last 5 are old drops
          transactionType: i < 5 ? 'ADD' : 'DROP',
          transactionDate: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000),
          playerPosition: 'RB',
        })),
        lastActivityAt: new Date(),
      },
      {
        // Contender: adding old, dropping young
        id: 'team_2',
        leagueId: 'league1',
        waiverTransactions: Array.from({ length: 8 }, (_, i) => ({
          playerId: `player_${i + 10}`,
          playerAge: i < 4 ? 28 : 22, // First 4 are old adds, last 4 are young drops
          transactionType: i < 4 ? 'ADD' : 'DROP',
          transactionDate: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000),
          playerPosition: 'WR',
        })),
        lastActivityAt: new Date(),
      },
      {
        // Tinker: mixed ages
        id: 'team_3',
        leagueId: 'league1',
        waiverTransactions: Array.from({ length: 6 }, (_, i) => ({
          playerId: `player_${i + 20}`,
          playerAge: 25, // Mixed around 25
          transactionType: i % 2 === 0 ? 'ADD' : 'DROP',
          transactionDate: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000),
          playerPosition: 'TE',
        })),
        lastActivityAt: new Date(),
      },
      {
        // Inactive: no transactions
        id: 'team_4',
        leagueId: 'league1',
        waiverTransactions: [],
        lastActivityAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
      },
    ]

    vi.mocked(prisma.league.findUnique).mockResolvedValue(mockLeague as any)

    // Mock findUnique for each team analysis call
    let callCount = 0
    vi.mocked(prisma.leagueTeam.findUnique).mockImplementation((args: any) => {
      const teamId = args.where.id
      const team = teamData.find((t) => t.id === teamId)
      
      if (!team) return Promise.resolve(null)
      
      // Return different data based on call context
      callCount++
      if (callCount <= teamData.length) {
        // First call: for waiver summary
        return Promise.resolve({
          ...team,
          waiverSummary: null,
        } as any)
      } else if (callCount <= teamData.length * 2) {
        // Second call: for positional profile
        return Promise.resolve({
          ...team,
          waiverSummary: {
            last30dAdds: team.waiverTransactions.filter((t) => t.transactionType === 'ADD').length,
            last30dDrops: team.waiverTransactions.filter((t) => t.transactionType === 'DROP').length,
            avgPlayerAgeAdded: team.waiverTransactions
              .filter((t) => t.transactionType === 'ADD')
              .reduce((sum, t) => sum + (t.playerAge || 0), 0) /
              Math.max(1, team.waiverTransactions.filter((t) => t.transactionType === 'ADD').length),
            avgPlayerAgeDropped: team.waiverTransactions
              .filter((t) => t.transactionType === 'DROP')
              .reduce((sum, t) => sum + (t.playerAge || 0), 0) /
              Math.max(1, team.waiverTransactions.filter((t) => t.transactionType === 'DROP').length),
          },
        } as any)
      } else {
        // Third call: for strategy
        return Promise.resolve({
          ...team,
          waiverSummary: {
            last30dAdds: team.waiverTransactions.filter((t) => t.transactionType === 'ADD').length,
            last30dDrops: team.waiverTransactions.filter((t) => t.transactionType === 'DROP').length,
            avgPlayerAgeAdded: team.waiverTransactions
              .filter((t) => t.transactionType === 'ADD')
              .reduce((sum, t) => sum + (t.playerAge || 0), 0) /
              Math.max(1, team.waiverTransactions.filter((t) => t.transactionType === 'ADD').length),
            avgPlayerAgeDropped: team.waiverTransactions
              .filter((t) => t.transactionType === 'DROP')
              .reduce((sum, t) => sum + (t.playerAge || 0), 0) /
              Math.max(1, team.waiverTransactions.filter((t) => t.transactionType === 'DROP').length),
          },
        } as any)
      }
    })

    await analyzeLeague('league1')

    // Verify all teams were analyzed
    expect(prisma.leagueTeam.findUnique).toHaveBeenCalledTimes(12) // 4 teams * 3 calls

    // Verify waiver summaries were created
    expect(prisma.teamWaiverSummary.upsert).toHaveBeenCalledTimes(4)

    // Verify positional profiles were created
    expect(prisma.teamPositionalProfile.upsert).toHaveBeenCalledTimes(4)

    // Verify team strategies were updated
    expect(prisma.leagueTeam.update).toHaveBeenCalledTimes(4)

    // Check that rebuild team was classified correctly
    const rebuildUpdate = vi.mocked(prisma.leagueTeam.update).mock.calls.find(
      (call) => call[0].where.id === 'team_1'
    )
    expect(rebuildUpdate).toBeDefined()
    expect(rebuildUpdate![1].data.strategyLabel).toBe('REBUILD')

    // Check that inactive team was classified correctly
    const inactiveUpdate = vi.mocked(prisma.leagueTeam.update).mock.calls.find(
      (call) => call[0].where.id === 'team_4'
    )
    expect(inactiveUpdate).toBeDefined()
    expect(inactiveUpdate![1].data.strategyLabel).toBe('INACTIVE')
  })

  it('should handle team with realistic roster data', async () => {
    const mockTeam = {
      id: 'team1',
      leagueId: 'league1',
      waiverTransactions: [
        {
          playerId: 'player1',
          playerAge: 23,
          transactionType: 'ADD',
          transactionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          playerPosition: 'RB',
        },
        {
          playerId: 'player2',
          playerAge: 29,
          transactionType: 'DROP',
          transactionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          playerPosition: 'RB',
        },
      ],
      lastActivityAt: new Date(),
    }

    const enrichedRoster = {
      players: [
        { position: 'QB', isStarter: true },
        { position: 'QB', isStarter: false },
        { position: 'RB', isStarter: true },
        { position: 'RB', isStarter: true },
        { position: 'RB', isStarter: false },
        { position: 'WR', isStarter: true },
        { position: 'WR', isStarter: true },
        { position: 'WR', isStarter: true },
        { position: 'WR', isStarter: false },
        { position: 'TE', isStarter: true },
      ],
    }

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue({
      ...mockTeam,
      waiverSummary: null,
    } as any)

    await analyzeTeam('team1', enrichedRoster)

    // Verify all three analysis steps completed
    expect(prisma.teamWaiverSummary.upsert).toHaveBeenCalled()
    expect(prisma.teamPositionalProfile.upsert).toHaveBeenCalled()
    expect(prisma.leagueTeam.update).toHaveBeenCalled()

    // Verify positional profile includes roster counts
    const profileCall = vi.mocked(prisma.teamPositionalProfile.upsert).mock.calls[0]
    expect(profileCall[1].create.rosterCounts).toEqual({
      QB: { starters: 1, bench: 1 },
      RB: { starters: 2, bench: 1 },
      WR: { starters: 3, bench: 1 },
      TE: { starters: 1, bench: 0 },
    })
  })
})

