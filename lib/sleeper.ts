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
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<SleeperUser | null> {
  try {
    const url = `${SLEEPER_API_BASE}/user/${username}`
    return await fetchWithRetry<SleeperUser>(url)
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    throw error
  }
}

/**
 * Get all leagues for a user
 */
export async function getUserLeagues(userId: string, season?: string): Promise<SleeperLeague[]> {
  const currentSeason = season || new Date().getFullYear().toString()
  const url = `${SLEEPER_API_BASE}/user/${userId}/leagues/nfl/${currentSeason}`
  return fetchWithRetry<SleeperLeague[]>(url)
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
  if (!transaction) {
    throw new Error('Invalid transaction: transaction is required')
  }
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
  if (!roster || !roster.players) {
    throw new Error('Invalid roster: roster with players array is required')
  }
  const allPlayers = await getAllPlayers()

  const players = roster.players.map((playerId) => {
    if (!playerId || typeof playerId !== 'string') {
      console.warn('Invalid playerId in roster:', playerId)
      return {
        playerId: 'unknown',
        name: 'Unknown Player',
        position: 'UNKNOWN',
        age: null,
        isStarter: false,
      }
    }

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
