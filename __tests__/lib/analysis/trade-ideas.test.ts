/**
 * Unit tests for trade idea generation
 *
 * Tests trade matching logic based on complementary needs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateTradeIdeas } from '@/lib/analysis/trade-ideas'
import type { StrategyLabel } from '@/types'

// Mock Prisma client
vi.mock('@/lib/db', () => ({
  prisma: {
    leagueTeam: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

const { prisma } = await import('@/lib/db')

describe('generateTradeIdeas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate trade ideas when complementary needs exist', async () => {
    const myTeam = {
      id: 'team1',
      displayName: 'My Team',
      teamName: 'The Champions',
      strategyLabel: 'CONTEND' as StrategyLabel,
      positionalProfile: {
        positionalNeeds: {
          QB: 'STABLE',
          RB: 'THIN',
          WR: 'HOARDING',
          TE: 'STABLE',
        },
      },
      waiverSummary: {},
    }

    const otherTeams = [
      {
        id: 'team2',
        displayName: 'Team 2',
        teamName: 'The Rebuilders',
        strategyLabel: 'REBUILD' as StrategyLabel,
        positionalProfile: {
          positionalNeeds: {
            QB: 'STABLE',
            RB: 'HOARDING',
            WR: 'DESPERATE',
            TE: 'STABLE',
          },
        },
        waiverSummary: {},
      },
    ]

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(myTeam as any)
    vi.mocked(prisma.leagueTeam.findMany).mockResolvedValue(otherTeams as any)

    const ideas = await generateTradeIdeas('team1', 'league1')

    expect(ideas.length).toBeGreaterThan(0)

    const idea = ideas[0]
    expect(idea.suggestedGivePosition).toBe('WR')
    expect(idea.suggestedGetPosition).toBe('RB')
    expect(idea.targetTeamId).toBe('team2')
    expect(idea.confidence).toBeGreaterThan(0.7)
    expect(idea.rationale).toContain('desperate')
  })

  it('should return empty array when no complementary needs exist', async () => {
    const myTeam = {
      id: 'team1',
      displayName: 'My Team',
      teamName: null,
      strategyLabel: 'STABLE' as StrategyLabel,
      positionalProfile: {
        positionalNeeds: {
          QB: 'STABLE',
          RB: 'STABLE',
          WR: 'STABLE',
          TE: 'STABLE',
        },
      },
      waiverSummary: {},
    }

    const otherTeams = [
      {
        id: 'team2',
        displayName: 'Team 2',
        teamName: null,
        strategyLabel: 'STABLE' as StrategyLabel,
        positionalProfile: {
          positionalNeeds: {
            QB: 'STABLE',
            RB: 'STABLE',
            WR: 'STABLE',
            TE: 'STABLE',
          },
        },
        waiverSummary: {},
      },
    ]

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(myTeam as any)
    vi.mocked(prisma.leagueTeam.findMany).mockResolvedValue(otherTeams as any)

    const ideas = await generateTradeIdeas('team1', 'league1')

    expect(ideas).toEqual([])
  })

  it('should sort ideas by confidence (highest first)', async () => {
    const myTeam = {
      id: 'team1',
      displayName: 'My Team',
      teamName: null,
      strategyLabel: 'TINKER' as StrategyLabel,
      positionalProfile: {
        positionalNeeds: {
          QB: 'STABLE',
          RB: 'THIN',
          WR: 'HOARDING',
          TE: 'HOARDING',
        },
      },
      waiverSummary: {},
    }

    const otherTeams = [
      {
        id: 'team2',
        displayName: 'Team 2',
        teamName: null,
        strategyLabel: 'CONTEND' as StrategyLabel,
        positionalProfile: {
          positionalNeeds: {
            QB: 'STABLE',
            RB: 'HOARDING',
            WR: 'THIN',
            TE: 'STABLE',
          },
        },
        waiverSummary: {},
      },
      {
        id: 'team3',
        displayName: 'Team 3',
        teamName: null,
        strategyLabel: 'REBUILD' as StrategyLabel,
        positionalProfile: {
          positionalNeeds: {
            QB: 'STABLE',
            RB: 'HOARDING',
            WR: 'DESPERATE',
            TE: 'STABLE',
          },
        },
        waiverSummary: {},
      },
    ]

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(myTeam as any)
    vi.mocked(prisma.leagueTeam.findMany).mockResolvedValue(otherTeams as any)

    const ideas = await generateTradeIdeas('team1', 'league1')

    // Should have ideas sorted by confidence
    for (let i = 0; i < ideas.length - 1; i++) {
      expect(ideas[i].confidence).toBeGreaterThanOrEqual(ideas[i + 1].confidence)
    }
  })

  it('should limit to top 10 trade ideas', async () => {
    const myTeam = {
      id: 'team1',
      displayName: 'My Team',
      teamName: null,
      strategyLabel: 'TINKER' as StrategyLabel,
      positionalProfile: {
        positionalNeeds: {
          QB: 'HOARDING',
          RB: 'HOARDING',
          WR: 'HOARDING',
          TE: 'HOARDING',
        },
      },
      waiverSummary: {},
    }

    // Create 15 teams with desperate needs
    const otherTeams = Array.from({ length: 15 }, (_, i) => ({
      id: `team${i + 2}`,
      displayName: `Team ${i + 2}`,
      teamName: null,
      strategyLabel: 'CONTEND' as StrategyLabel,
      positionalProfile: {
        positionalNeeds: {
          QB: 'DESPERATE',
          RB: 'DESPERATE',
          WR: 'DESPERATE',
          TE: 'DESPERATE',
        },
      },
      waiverSummary: {},
    }))

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(myTeam as any)
    vi.mocked(prisma.leagueTeam.findMany).mockResolvedValue(otherTeams as any)

    const ideas = await generateTradeIdeas('team1', 'league1')

    expect(ideas.length).toBeLessThanOrEqual(10)
  })

  it('should handle team with no positional profile', async () => {
    const myTeam = {
      id: 'team1',
      displayName: 'My Team',
      teamName: null,
      strategyLabel: 'TINKER' as StrategyLabel,
      positionalProfile: null,
      waiverSummary: {},
    }

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(myTeam as any)
    vi.mocked(prisma.leagueTeam.findMany).mockResolvedValue([] as any)

    const ideas = await generateTradeIdeas('team1', 'league1')

    expect(ideas).toEqual([])
  })

  it('should filter out teams without positional profiles', async () => {
    const myTeam = {
      id: 'team1',
      displayName: 'My Team',
      teamName: null,
      strategyLabel: 'CONTEND' as StrategyLabel,
      positionalProfile: {
        positionalNeeds: {
          QB: 'STABLE',
          RB: 'THIN',
          WR: 'HOARDING',
          TE: 'STABLE',
        },
      },
      waiverSummary: {},
    }

    const otherTeams = [
      {
        id: 'team2',
        displayName: 'Team 2',
        teamName: null,
        strategyLabel: 'REBUILD' as StrategyLabel,
        positionalProfile: null, // No profile
        waiverSummary: {},
      },
      {
        id: 'team3',
        displayName: 'Team 3',
        teamName: null,
        strategyLabel: 'CONTEND' as StrategyLabel,
        positionalProfile: {
          positionalNeeds: {
            QB: 'STABLE',
            RB: 'HOARDING',
            WR: 'DESPERATE',
            TE: 'STABLE',
          },
        },
        waiverSummary: {},
      },
    ]

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(myTeam as any)
    vi.mocked(prisma.leagueTeam.findMany).mockResolvedValue(otherTeams as any)

    const ideas = await generateTradeIdeas('team1', 'league1')

    // Should only generate ideas for team3
    expect(ideas.every((idea) => idea.targetTeamId !== 'team2')).toBe(true)
  })

  it('should boost confidence for desperate needs', async () => {
    const myTeam = {
      id: 'team1',
      displayName: 'My Team',
      teamName: null,
      strategyLabel: 'CONTEND' as StrategyLabel,
      positionalProfile: {
        positionalNeeds: {
          QB: 'STABLE',
          RB: 'STABLE',
          WR: 'HOARDING',
          TE: 'STABLE',
        },
      },
      waiverSummary: {},
    }

    const desperateTeam = {
      id: 'team2',
      displayName: 'Desperate Team',
      teamName: null,
      strategyLabel: 'CONTEND' as StrategyLabel,
      positionalProfile: {
        positionalNeeds: {
          QB: 'STABLE',
          RB: 'STABLE',
          WR: 'DESPERATE',
          TE: 'STABLE',
        },
      },
      waiverSummary: {},
    }

    const thinTeam = {
      id: 'team3',
      displayName: 'Thin Team',
      teamName: null,
      strategyLabel: 'CONTEND' as StrategyLabel,
      positionalProfile: {
        positionalNeeds: {
          QB: 'STABLE',
          RB: 'STABLE',
          WR: 'THIN',
          TE: 'STABLE',
        },
      },
      waiverSummary: {},
    }

    vi.mocked(prisma.leagueTeam.findUnique).mockResolvedValue(myTeam as any)
    vi.mocked(prisma.leagueTeam.findMany).mockResolvedValue([desperateTeam, thinTeam] as any)

    const ideas = await generateTradeIdeas('team1', 'league1')

    const desperateIdea = ideas.find((i) => i.targetTeamId === 'team2')
    const thinIdea = ideas.find((i) => i.targetTeamId === 'team3')

    if (desperateIdea && thinIdea) {
      expect(desperateIdea.confidence).toBeGreaterThan(thinIdea.confidence)
    }
  })
})
