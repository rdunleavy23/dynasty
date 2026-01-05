/**
 * Authentication helper utilities
 * 
 * Note: Authentication has been removed - these are placeholder functions
 * that always return null/true to maintain compatibility
 */

/**
 * Get the current user ID (server-side only)
 * Returns null since auth is disabled
 */
export async function getCurrentUserId(): Promise<string | null> {
  return null
}

/**
 * Helper to verify user owns a league
 * Returns true since auth is disabled
 */
export async function verifyLeagueOwnership(leagueId: string, userId: string): Promise<boolean> {
  return true
}
