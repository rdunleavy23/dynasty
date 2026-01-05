/**
 * Test helper utilities
 *
 * Provides functions for generating synthetic test data and mocking Prisma responses
 */

import type {
  SleeperLeague,
  SleeperUser,
  SleeperRoster,
  SleeperTransaction,
  SleeperPlayer,
} from '@/types'
import type { StrategyLabel } from '@/types'

/**
 * Generate a synthetic Sleeper league
 */
export function createMockLeague(overrides?: Partial<SleeperLeague>): SleeperLeague {
  return {
    league_id: '123456789',
    name: 'Test Dynasty League',
    season: '2024',
    sport: 'nfl',
    status: 'in_season',
    settings: {
      num_teams: 12,
      playoff_week_start: 15,
    },
    roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
    scoring_settings: {},
    ...overrides,
  }
}

/**
 * Generate synthetic Sleeper users
 */
export function createMockUsers(count: number): SleeperUser[] {
  return Array.from({ length: count }, (_, i) => ({
    user_id: `user_${i + 1}`,
    username: `user${i + 1}`,
    display_name: `User ${i + 1}`,
    metadata: {
      team_name: `Team ${i + 1}`,
    },
  }))
}

/**
 * Generate synthetic Sleeper rosters
 */
export function createMockRosters(
  users: SleeperUser[],
  overrides?: (user: SleeperUser, index: number) => Partial<SleeperRoster>
): SleeperRoster[] {
  return users.map((user, index) => ({
    roster_id: index + 1,
    owner_id: user.user_id,
    players: [],
    starters: [],
    settings: {
      wins: Math.floor(Math.random() * 10),
      losses: Math.floor(Math.random() * 10),
      ties: 0,
      fpts: Math.floor(Math.random() * 2000),
    },
    ...(overrides ? overrides(user, index) : {}),
  }))
}

/**
 * Generate synthetic Sleeper transactions
 */
export function createMockTransaction(overrides?: Partial<SleeperTransaction>): SleeperTransaction {
  return {
    transaction_id: `txn_${Date.now()}_${Math.random()}`,
    type: 'waiver',
    status: 'complete',
    roster_ids: [1],
    settings: {},
    metadata: {},
    adds: null,
    drops: null,
    creator: 'user_1',
    created: Date.now(),
    ...overrides,
  }
}

/**
 * Generate transactions with adds/drops
 */
export function createMockTransactionWithPlayers(
  adds: string[], // player IDs
  drops: string[], // player IDs
  rosterId: number,
  overrides?: Partial<SleeperTransaction>
): SleeperTransaction {
  const addsMap: Record<string, number> = {}
  adds.forEach((playerId) => {
    addsMap[playerId] = rosterId
  })

  const dropsMap: Record<string, number> = {}
  drops.forEach((playerId) => {
    dropsMap[playerId] = rosterId
  })

  return createMockTransaction({
    adds: adds.length > 0 ? addsMap : null,
    drops: drops.length > 0 ? dropsMap : null,
    roster_ids: [rosterId],
    ...overrides,
  })
}

/**
 * Generate synthetic player data
 */
export function createMockPlayer(
  playerId: string,
  overrides?: Partial<SleeperPlayer>
): SleeperPlayer {
  return {
    player_id: playerId,
    first_name: 'Test',
    last_name: `Player ${playerId}`,
    full_name: `Test Player ${playerId}`,
    position: 'RB',
    team: 'SF',
    age: 25,
    birth_date: '1999-01-01',
    years_exp: 5,
    status: 'Active',
    injury_status: null,
    fantasy_positions: ['RB'],
    ...overrides,
  }
}

/**
 * Generate a map of mock players
 */
export function createMockPlayers(count: number): Record<string, SleeperPlayer> {
  const players: Record<string, SleeperPlayer> = {}
  const positions = ['QB', 'RB', 'WR', 'TE']
  
  for (let i = 0; i < count; i++) {
    const position = positions[i % positions.length]
    const playerId = `player_${i}`
    players[playerId] = createMockPlayer(playerId, {
      position,
      age: 20 + (i % 15), // Ages 20-34
      birth_date: `${2000 - (i % 15)}-01-01`,
    })
  }
  
  return players
}

/**
 * Create a team with specific strategy signals
 */
export function createTeamWithStrategy(
  strategy: StrategyLabel,
  overrides?: {
    totalMoves30d?: number
    avgAgeAdded?: number
    avgAgeDropped?: number
    daysSinceActivity?: number
  }
) {
  const defaults = {
    REBUILD: {
      totalMoves30d: 10,
      avgAgeAdded: 22,
      avgAgeDropped: 28,
      daysSinceActivity: 2,
    },
    CONTEND: {
      totalMoves30d: 8,
      avgAgeAdded: 28,
      avgAgeDropped: 22,
      daysSinceActivity: 1,
    },
    TINKER: {
      totalMoves30d: 6,
      avgAgeAdded: 25,
      avgAgeDropped: 25,
      daysSinceActivity: 3,
    },
    INACTIVE: {
      totalMoves30d: 0,
      avgAgeAdded: null,
      avgAgeDropped: null,
      daysSinceActivity: 30,
    },
  }

  return {
    ...defaults[strategy],
    ...overrides,
  }
}

/**
 * Assert that a team has expected analysis results
 */
export function expectTeamAnalysis(
  team: {
    strategyLabel: StrategyLabel | null
    strategyConfidence: number | null
    positionalNeeds?: Record<string, string>
  },
  expected: {
    strategy?: StrategyLabel
    minConfidence?: number
    positionalNeeds?: Record<string, string>
  }
) {
  if (expected.strategy !== undefined) {
    expect(team.strategyLabel).toBe(expected.strategy)
  }

  if (expected.minConfidence !== undefined && team.strategyConfidence !== null) {
    expect(team.strategyConfidence).toBeGreaterThanOrEqual(expected.minConfidence)
  }

  if (expected.positionalNeeds && team.positionalNeeds) {
    for (const [position, expectedState] of Object.entries(expected.positionalNeeds)) {
      expect(team.positionalNeeds[position]).toBe(expectedState)
    }
  }
}

