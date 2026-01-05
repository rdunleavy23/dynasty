/**
 * Shared TypeScript types for League Intel
 */

// Enum types (stored as String in SQLite, but typed as enums for TypeScript)
export type Platform = 'SLEEPER' | 'MFL' | 'ESPN'
export type StrategyLabel = 'REBUILD' | 'CONTEND' | 'TINKER' | 'INACTIVE' | 'PENDING'
export type TransactionType = 'ADD' | 'DROP'
export type ActivityTrend = 'INCREASING' | 'DECREASING' | 'STABLE'

// Sleeper API response types
export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  sport: string
  status: string
  previous_league_id?: string | null  // For dynasty leagues
  settings: {
    num_teams: number
    playoff_week_start?: number
    [key: string]: any
  }
  roster_positions: string[]
  scoring_settings: Record<string, number>
  metadata?: Record<string, any>
}

export interface SleeperUser {
  user_id: string
  username: string
  display_name: string
  avatar?: string
  metadata?: {
    team_name?: string
    [key: string]: any
  }
}

export interface SleeperRoster {
  roster_id: number
  owner_id: string
  players: string[] // Array of player IDs
  starters: string[]
  reserve?: string[]
  taxi?: string[]
  settings: {
    wins: number
    losses: number
    ties: number
    fpts: number
    [key: string]: any
  }
  metadata?: Record<string, any>
}

export interface SleeperTransaction {
  transaction_id: string
  type: 'waiver' | 'trade' | 'free_agent'
  status: string
  roster_ids: number[]
  settings: any
  metadata: any
  adds: Record<string, number> | null // player_id -> roster_id
  drops: Record<string, number> | null
  draft_picks?: any[]
  waiver_budget?: any[]
  creator: string
  created: number // Unix timestamp in milliseconds
  leg?: number
  status_updated?: number
}

export interface SleeperPlayer {
  player_id: string
  first_name: string
  last_name: string
  full_name?: string
  position: string
  team?: string | null
  age?: number
  birth_date?: string
  years_exp?: number
  status?: string
  injury_status?: string
  fantasy_positions?: string[]
  metadata?: Record<string, any>
}

// Analysis types
export type PositionalState = 'DESPERATE' | 'THIN' | 'STABLE' | 'HOARDING'

export interface StrategySignals {
  totalMoves30d: number
  avgAgeAdded30d: number | null
  avgAgeDropped30d: number | null
  rosterAvgAge: number | null
  daysSinceLastActivity: number | null
}

export interface StrategyClassification {
  label: StrategyLabel
  confidence: number
  reason: string
}

export interface PositionalInputs {
  position: string
  starters: number
  bench: number
  waiverAdds21d: number
}

export interface PositionalNeedsMap {
  [position: string]: PositionalState
}

export interface RosterCountsMap {
  [position: string]: {
    starters: number
    bench: number
  }
}

export interface TradeIdea {
  targetTeamId: string
  targetTeamName: string
  rationale: string
  suggestedGivePosition: string
  suggestedGetPosition: string
  confidence: number // 0-1
}

// API response types
export interface TeamCard {
  id: string
  displayName: string
  teamName?: string
  strategyLabel: StrategyLabel | null
  strategyReason: string
  lastActivityAt: Date | null
  daysSinceActivity: number | null
  positionalNeeds: PositionalNeedsMap
  last30dAdds: number
  last30dDrops: number
}

export interface IntelFeedItem {
  teamId: string
  teamName: string
  message: string
  timestamp: Date
  category: 'waiver' | 'strategy' | 'activity'
}

export interface LeagueIntelResponse {
  league: {
    id: string
    name: string
    season: number
    lastSyncAt: Date | null
  }
  teams: TeamCard[]
  feed: IntelFeedItem[]
  summary: {
    mostActiveTeam: string | null
    mostInactiveTeam: string | null
    avgMovesPerTeam: number
  }
}
