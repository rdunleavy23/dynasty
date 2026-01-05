/**
 * Authentication helper utilities
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Auth configuration validation result
 */
export interface AuthConfigCheck {
  isValid: boolean
  missingVars: string[]
  errors: string[]
  isDevelopment: boolean
}

/**
 * Check if authentication configuration is valid
 * Returns detailed information about missing variables and errors
 */
export function checkAuthConfig(): AuthConfigCheck {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const missingVars: string[] = []
  const errors: string[] = []

  // Check required variables
  if (!process.env.NEXTAUTH_SECRET) {
    missingVars.push('NEXTAUTH_SECRET')
    errors.push('NEXTAUTH_SECRET is required. Generate one with: openssl rand -base64 32')
  } else if (process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push('NEXTAUTH_SECRET should be at least 32 characters long')
  }

  if (!process.env.NEXTAUTH_URL) {
    missingVars.push('NEXTAUTH_URL')
    errors.push('NEXTAUTH_URL is required (e.g., http://localhost:3000 for dev, https://yourdomain.com for prod)')
  }

  // Check email server configuration
  const emailRequired = process.env.NODE_ENV === 'production'
  if (emailRequired) {
    if (!process.env.EMAIL_SERVER_HOST) {
      missingVars.push('EMAIL_SERVER_HOST')
      errors.push('EMAIL_SERVER_HOST is required in production (e.g., smtp.gmail.com)')
    }

    if (!process.env.EMAIL_SERVER_USER) {
      missingVars.push('EMAIL_SERVER_USER')
      errors.push('EMAIL_SERVER_USER is required in production (your SMTP username)')
    }

    if (!process.env.EMAIL_SERVER_PASSWORD) {
      missingVars.push('EMAIL_SERVER_PASSWORD')
      errors.push('EMAIL_SERVER_PASSWORD is required in production (your SMTP password)')
    }
  } else {
    // In development, warn if email config is missing but don't fail
    if (!process.env.EMAIL_SERVER_HOST || !process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
      errors.push('Email server configuration is missing. Sign-in emails will not be sent in development mode.')
    }
  }

  // Validate NEXTAUTH_URL format
  if (process.env.NEXTAUTH_URL) {
    try {
      const url = new URL(process.env.NEXTAUTH_URL)
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('NEXTAUTH_URL must use http:// or https:// protocol')
      }
    } catch {
      errors.push('NEXTAUTH_URL must be a valid URL (e.g., http://localhost:3000)')
    }
  }

  return {
    isValid: missingVars.length === 0 && errors.length === 0,
    missingVars,
    errors,
    isDevelopment,
  }
}

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
