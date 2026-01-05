/**
 * Edge case tests for analysis pipeline
 *
 * Tests scenarios with unusual or boundary conditions:
 * - Zero transactions
 * - Very small leagues
 * - All teams inactive
 * - Unbalanced rosters
 * - Missing data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { analyzeTeam, analyzeLeague } from '@/lib/analysis/pipeline'
import { prisma } from '@/lib/db'
import { createMockPlayers } from '../test-helpers'

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

describe('Edge Cases - analyzeTeam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle team with zero transactions', async () => {
    const mockTeam = {
      id: 'team1',
      leagueId: 'league1',
      waiverTransactions: [],
      lastActivityAt: null,
    }

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(mockTeam as any)

    await analyzeTeam('team1')

    // Should create waiver summary with zeros
    expect(prisma.teamWaiverSummary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          last30dAdds: 0,
          last30dDrops: 0,
          activityTrend: 'INACTIVE',
        }),
      })
    )

    // Should update team strategy to INACTIVE
    expect(prisma.leagueTeam.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          strategyLabel: 'INACTIVE',
        }),
      })
    )
  })

  it('should handle team with no last activity date', async () => {
    const mockTeam = {
      id: 'team1',
      leagueId: 'league1',
      waiverTransactions: [],
      lastActivityAt: null,
    }

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(mockTeam as any)

    await analyzeTeam('team1')

    // Should still process without errors
    expect(prisma.teamWaiverSummary.upsert).toHaveBeenCalled()
    expect(prisma.leagueTeam.update).toHaveBeenCalled()
  })

  it('should handle team with missing player age data', async () => {
    const mockTeam = {
      id: 'team1',
      leagueId: 'league1',
      waiverTransactions: [
        {
          playerId: 'player1',
          playerAge: null, // Missing age
          transactionType: 'ADD',
          transactionDate: new Date(),
          playerPosition: 'RB',
        },
        {
          playerId: 'player2',
          playerAge: null,
          transactionType: 'DROP',
          transactionDate: new Date(),
          playerPosition: 'WR',
        },
      ],
      lastActivityAt: new Date(),
    }

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(mockTeam as any)

    await analyzeTeam('team1')

    // Should handle null ages gracefully
    expect(prisma.teamWaiverSummary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          avgPlayerAgeAdded: null,
          avgPlayerAgeDropped: null,
        }),
      })
    )

    // Should classify as INACTIVE when there are zero moves (even with missing age data)
    expect(prisma.leagueTeam.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          strategyLabel: 'INACTIVE',
        }),
      })
    )
  })

  it('should handle team with very high activity (50+ moves)', async () => {
    const transactions = Array.from({ length: 60 }, (_, i) => ({
      playerId: `player_${i}`,
      playerAge: 25,
      transactionType: i % 2 === 0 ? 'ADD' : 'DROP',
      transactionDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      playerPosition: 'RB',
    }))

    const mockTeam = {
      id: 'team1',
      leagueId: 'league1',
      waiverTransactions: transactions,
      lastActivityAt: new Date(),
    }

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(mockTeam as any)

    await analyzeTeam('team1')

    // Should handle high activity without errors
    expect(prisma.teamWaiverSummary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          last30dAdds: 30,
          last30dDrops: 30,
          activityTrend: 'RISING',
        }),
      })
    )
  })

  it('should handle team with no positional profile data', async () => {
    const mockTeam = {
      id: 'team1',
      leagueId: 'league1',
      waiverTransactions: [],
      waiverSummary: null,
      lastActivityAt: null,
    }

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(mockTeam as any)

    // Should not throw error
    await expect(analyzeTeam('team1')).resolves.not.toThrow()

    // Should create positional profile with defaults
    expect(prisma.teamPositionalProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          positionalNeeds: expect.objectContaining({
            QB: 'STABLE',
            RB: 'STABLE',
            WR: 'STABLE',
            TE: 'STABLE',
          }),
        }),
      })
    )
  })
})

describe('Edge Cases - analyzeLeague', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle very small league (4 teams)', async () => {
    const mockLeague = {
      id: 'league1',
      name: 'Small League',
      teams: [
        { id: 'team1' },
        { id: 'team2' },
        { id: 'team3' },
        { id: 'team4' },
      ],
    }

    vi.mocked(prisma.league.findUnique).mockResolvedValue(mockLeague as any)
    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue({
      id: 'team1',
      leagueId: 'league1',
      waiverTransactions: [],
      lastActivityAt: null,
    } as any)

    await analyzeLeague('league1')

    // Should process all 4 teams
    expect(prisma.leagueTeam.findUnique).toHaveBeenCalledTimes(12) // 4 teams * 3 calls per team
  })

  it('should handle league with all teams inactive', async () => {
    const mockLeague = {
      id: 'league1',
      name: 'Inactive League',
      teams: [
        { id: 'team1' },
        { id: 'team2' },
      ],
    }

    const inactiveTeam = {
      id: 'team1',
      leagueId: 'league1',
      waiverTransactions: [],
      lastActivityAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    }

    vi.mocked(prisma.league.findUnique).mockResolvedValue(mockLeague as any)
    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(inactiveTeam as any)

    await analyzeLeague('league1')

    // All teams should be classified as INACTIVE
    expect(prisma.leagueTeam.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          strategyLabel: 'INACTIVE',
        }),
      })
    )
  })

  it('should handle league with unbalanced rosters', async () => {
    // Team with 10 QBs and 2 RBs
    const mockTeam = {
      id: 'team1',
      leagueId: 'league1',
      waiverTransactions: [],
      lastActivityAt: new Date(),
    }

    const unbalancedRoster = {
      players: [
        // 10 QBs
        ...Array.from({ length: 10 }, (_, i) => ({
          playerId: `qb_${i}`,
          position: 'QB',
          isStarter: i < 1,
        })),
        // 2 RBs
        ...Array.from({ length: 2 }, (_, i) => ({
          playerId: `rb_${i}`,
          position: 'RB',
          isStarter: i < 2,
        })),
      ],
    }

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(mockTeam as any)

    await analyzeTeam('team1', unbalancedRoster)

    // Should classify QB as HOARDING and RB as THIN
    expect(prisma.teamPositionalProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          positionalNeeds: expect.objectContaining({
            QB: 'HOARDING',
            RB: 'THIN',
          }),
        }),
      })
    )
  })
})

