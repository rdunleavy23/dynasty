/**
 * Health check endpoint
 *
 * Returns service health status and configuration
 * Used by monitoring tools and deployment verification
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getEnvironmentInfo } from '@/lib/env'

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    const dbStatus = 'connected'

    // Get environment info
    const envInfo = getEnvironmentInfo()

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      database: dbStatus,
      email: envInfo.hasEmailConfig ? 'configured' : 'not-configured',
      environment: envInfo.vercelEnv,
      features: {
        digest: envInfo.digestEnabled,
      },
    })
  } catch (error) {
    console.error('[Health] Check failed:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      },
      { status: 503 }
    )
  }
}
