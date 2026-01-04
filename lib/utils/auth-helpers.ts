/**
 * Authentication helper utilities
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Get the current user session (server-side only)
 * Throws if no session exists
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    throw new Error('Unauthorized')
  }

  return session
}

/**
 * Get the current user ID (server-side only)
 * Returns null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return session?.user?.id || null
}

/**
 * Helper to return unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/**
 * Helper to verify user owns a league
 */
export async function verifyLeagueOwnership(leagueId: string, userId: string): Promise<boolean> {
  const { prisma } = await import('@/lib/db')

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { ownerUserId: true },
  })

  return league?.ownerUserId === userId
}
