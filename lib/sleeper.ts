/**
 * Sleeper API wrapper
 * Public API documentation: https://docs.sleeper.com/
 *
 * Rate limits: Sleeper has unspecified rate limits; we implement
 * simple retry logic with exponential backoff for reliability.
 */

import type {
  SleeperLeague,
  SleeperUser,
  SleeperRoster,
  SleeperTransaction,
  SleeperPlayer,
} from '@/types'

const SLEEPER_API_BASE = 'https://api.sleeper.app/v1'

/**
 * Generic fetch wrapper with retry logic
 */
async function fetchWithRetry<T>(
  url: string,
  retries = 3,
  backoff = 1000
): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'League-Intel/1.0',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes in Next.js
    })

    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        // Rate limited, retry with backoff
        await new Promise((resolve) => setTimeout(resolve, backoff))
        return fetchWithRetry<T>(url, retries - 1, backoff * 2)
      }
      throw new Error(`Sleeper API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    if (retries > 0 && error instanceof TypeError) {
      // Network error, retry
      await new Promise((resolve) => setTimeout(resolve, backoff))
      return fetchWithRetry<T>(url, retries - 1, backoff * 2)
    }
    throw error
  }
}

/**
 * Get league metadata by Sleeper league ID
 */
export async function getLeague(leagueId: string): Promise<SleeperLeague> {
  const url = `${SLEEPER_API_BASE}/league/${leagueId}`
  return fetchWithRetry<SleeperLeague>(url)
}

/**
 * Get all users in a league
 */
export async function getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
  const url = `${SLEEPER_API_BASE}/league/${leagueId}/users`
  return fetchWithRetry<SleeperUser[]>(url)
}

/**
 * Get all rosters in a league
 */
export async function getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
  const url = `${SLEEPER_API_BASE}/league/${leagueId}/rosters`
  return fetchWithRetry<SleeperRoster[]>(url)
}

/**
 * Get transactions for a specific week
 * Note: Week ranges from 1-18 for regular season
 */
export async function getLeagueTransactions(
  leagueId: string,
  week: number
): Promise<SleeperTransaction[]> {
  const url = `${SLEEPER_API_BASE}/league/${leagueId}/transactions/${week}`
  return fetchWithRetry<SleeperTransaction[]>(url)
}

/**
 * Get transactions for multiple weeks (parallel fetching)
 * Useful for getting a full season or recent weeks
 */
export async function getLeagueTransactionsRange(
  leagueId: string,
  startWeek: number,
  endWeek: number
): Promise<SleeperTransaction[]> {
  const weeks = Array.from(
    { length: endWeek - startWeek + 1 },
    (_, i) => startWeek + i
  )

  const transactionPromises = weeks.map((week) =>
    getLeagueTransactions(leagueId, week)
  )

  const results = await Promise.all(transactionPromises)
  return results.flat()
}

/**
 * Get all NFL players from Sleeper
 * This is a large payload (~5MB+), cache aggressively
 * Returns a map of player_id -> player object
 */
export async function getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  const url = `${SLEEPER_API_BASE}/players/nfl`
  return fetchWithRetry<Record<string, SleeperPlayer>>(url)
}

/**
 * Get current NFL state (current week, season, etc.)
 */
export async function getNFLState(): Promise<{
  season: string
  season_type: string
  week: number
  display_week: number
  leg: number
}> {
  const url = `${SLEEPER_API_BASE}/state/nfl`
  return fetchWithRetry(url)
}

/**
 * Calculate approximate player age from birth_date
 * Sleeper players have birth_date in format "YYYY-MM-DD"
 */
export function calculatePlayerAge(birthDate: string | undefined): number | null {
  if (!birthDate) return null

  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * Helper to get player details by ID
 * Uses the getAllPlayers cache
 */
export async function getPlayerById(playerId: string): Promise<SleeperPlayer | null> {
  const players = await getAllPlayers()
  return players[playerId] || null
}

/**
 * Extract meaningful player data from transaction
 * Returns a normalized format for database storage
 */
export async function enrichTransactionPlayers(
  transaction: SleeperTransaction
): Promise<{
  adds: Array<{ playerId: string; name: string; position: string; age: number | null }>
  drops: Array<{ playerId: string; name: string; position: string; age: number | null }>
}> {
  const players = await getAllPlayers()

  const adds = transaction.adds
    ? Object.keys(transaction.adds).map((playerId) => {
        const player = players[playerId]
        return {
          playerId,
          name: player?.full_name || `${player?.first_name || ''} ${player?.last_name || ''}`.trim() || 'Unknown',
          position: player?.position || 'UNKNOWN',
          age: player?.birth_date ? calculatePlayerAge(player.birth_date) : null,
        }
      })
    : []

  const drops = transaction.drops
    ? Object.keys(transaction.drops).map((playerId) => {
        const player = players[playerId]
        return {
          playerId,
          name: player?.full_name || `${player?.first_name || ''} ${player?.last_name || ''}`.trim() || 'Unknown',
          position: player?.position || 'UNKNOWN',
          age: player?.birth_date ? calculatePlayerAge(player.birth_date) : null,
        }
      })
    : []

  return { adds, drops }
}

/**
 * Get roster with enriched player data
 * Combines roster info with player names/positions
 */
export async function getEnrichedRoster(roster: SleeperRoster): Promise<{
  rosterId: number
  ownerId: string
  players: Array<{
    playerId: string
    name: string
    position: string
    age: number | null
    isStarter: boolean
  }>
}> {
  const allPlayers = await getAllPlayers()

  const players = (roster.players || []).map((playerId) => {
    const player = allPlayers[playerId]
    return {
      playerId,
      name: player?.full_name || `${player?.first_name || ''} ${player?.last_name || ''}`.trim() || 'Unknown',
      position: player?.position || 'UNKNOWN',
      age: player?.birth_date ? calculatePlayerAge(player.birth_date) : null,
      isStarter: roster.starters?.includes(playerId) || false,
    }
  })

  return {
    rosterId: roster.roster_id,
    ownerId: roster.owner_id,
    players,
  }
}

/**
 * Get all traded draft picks in a league
 * Includes future picks that have been traded
 */
export async function getTradedPicks(leagueId: string): Promise<any[]> {
  const url = `${SLEEPER_API_BASE}/league/${leagueId}/traded_picks`
  return fetchWithRetry<any[]>(url)
}

/**
 * Get user information by user ID
 * Useful for getting avatars and display names
 */
export async function getUser(userId: string): Promise<{
  user_id: string
  username: string
  display_name: string
  avatar: string | null
}> {
  const url = `${SLEEPER_API_BASE}/user/${userId}`
  return fetchWithRetry(url)
}

/**
 * Filter transactions to get only trades
 * Trades have type="trade" and involve multiple roster_ids
 */
export function filterTrades(transactions: SleeperTransaction[]): SleeperTransaction[] {
  return transactions.filter(txn => txn.type === 'trade')
}

/**
 * Parse trade transaction into structured format
 * Extracts who gave what to whom
 */
export async function enrichTradeTransaction(
  transaction: SleeperTransaction,
  rosterMap: Map<number, string> // roster_id -> team_id mapping
): Promise<{
  sleeperTxnId: string
  teamIds: string[]
  players: Record<string, string[]> // team_id -> player_ids given
  draftPicks: Record<string, any[]> // team_id -> picks given
  status: string
  transactionDate: Date
  week: number
} | null> {
  if (transaction.type !== 'trade') return null

  const allPlayers = await getAllPlayers()

  // Build team participation map
  const teamIds: string[] = []
  const players: Record<string, string[]> = {}
  const draftPicks: Record<string, any[]> = {}

  // Process adds (what each team received)
  if (transaction.adds) {
    for (const [playerId, rosterId] of Object.entries(transaction.adds)) {
      const teamId = rosterMap.get(Number(rosterId))
      if (!teamId) continue

      if (!teamIds.includes(teamId)) teamIds.push(teamId)

      // This team received this player, so we track who gave it
      // (we'll reverse this logic to show what each team gave)
    }
  }

  // Process roster_ids to understand all participants
  if (transaction.roster_ids) {
    for (const rosterId of transaction.roster_ids) {
      const teamId = rosterMap.get(Number(rosterId))
      if (teamId && !teamIds.includes(teamId)) {
        teamIds.push(teamId)
      }
    }
  }

  // Initialize structures for each team
  for (const teamId of teamIds) {
    players[teamId] = []
    draftPicks[teamId] = []
  }

  // Map what each team GAVE (inverse of adds)
  if (transaction.adds && transaction.drops) {
    for (const [playerId, receiverRosterId] of Object.entries(transaction.adds)) {
      const receiverTeamId = rosterMap.get(Number(receiverRosterId))
      if (!receiverTeamId) continue

      // Find who gave this player (who dropped it)
      const giverRosterId = transaction.drops[playerId]
      if (giverRosterId) {
        const giverTeamId = rosterMap.get(Number(giverRosterId))
        if (giverTeamId) {
          players[giverTeamId].push(playerId)
        }
      }
    }
  }

  // Process draft picks
  if (transaction.draft_picks) {
    for (const pick of transaction.draft_picks) {
      const receiverTeamId = rosterMap.get(Number(pick.roster_id))
      const giverTeamId = rosterMap.get(Number(pick.previous_owner_id || pick.owner_id))

      if (giverTeamId && pick.previous_owner_id) {
        draftPicks[giverTeamId].push({
          season: pick.season,
          round: pick.round,
        })
      }
    }
  }

  return {
    sleeperTxnId: transaction.transaction_id,
    teamIds,
    players,
    draftPicks,
    status: transaction.status || 'complete',
    transactionDate: new Date(transaction.status_updated || transaction.created),
    week: transaction.leg || 0,
  }
}
