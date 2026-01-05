/**
 * Weekly digest cron job
 *
 * Sends weekly email digests to all users with active leagues
 * Triggered by Vercel Cron: Mondays at 9 AM UTC
 *
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateLeagueDigest } from '@/lib/digest/generator'
import { sendDigestEmail, isEmailEnabled } from '@/lib/email'
import { isFeatureEnabled } from '@/lib/env'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Digest Cron] Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[Digest Cron] Starting weekly digest job...')

  // Check if email is enabled
  if (!isEmailEnabled()) {
    console.warn('[Digest Cron] Email not configured - skipping')
    return NextResponse.json({
      success: false,
      error: 'Email not configured',
    })
  }

  // Check if digest feature is enabled
  if (!isFeatureEnabled('DIGEST_ENABLED')) {
    console.log('[Digest Cron] Digest feature disabled - skipping')
    return NextResponse.json({
      success: true,
      message: 'Digest feature disabled',
      sent: 0,
    })
  }

  const digestDay = parseInt(process.env.DIGEST_DAY || '1', 10) // Monday by default
  const today = new Date().getDay()

  // Check if today matches configured digest day
  if (today !== digestDay) {
    console.log(
      `[Digest Cron] Not digest day (today: ${today}, configured: ${digestDay})`
    )
    return NextResponse.json({
      success: true,
      message: 'Not digest day',
      sent: 0,
    })
  }

  try {
    // Get all users with their leagues
    const users = await prisma.user.findMany({
      include: {
        leagues: {
          where: {
            // Only send digests for recently synced leagues
            lastSyncAt: {
              gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Last 14 days
            },
          },
        },
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    let successCount = 0
    let errorCount = 0

    // Send digest for each user's leagues
    for (const user of users) {
      if (!user.email) {
        console.warn('[Digest Cron] User has no email:', user.id)
        continue
      }

      for (const league of user.leagues) {
        try {
          // Generate digest data
          const digest = await generateLeagueDigest(league.id, baseUrl)

          if (!digest) {
            console.warn('[Digest Cron] Failed to generate digest:', league.id)
            errorCount++
            continue
          }

          // Send email
          const result = await sendDigestEmail({
            to: user.email,
            digest,
          })

          if (result.success) {
            successCount++
            console.log(
              `[Digest Cron] ✓ Sent digest to ${user.email} for ${league.name}`
            )
          } else {
            errorCount++
            console.error(
              `[Digest Cron] ✗ Failed to send digest to ${user.email}:`,
              result.error
            )
          }
        } catch (error) {
          errorCount++
          console.error('[Digest Cron] Error processing league:', league.id, error)
        }
      }
    }

    console.log(
      `[Digest Cron] Completed: ${successCount} sent, ${errorCount} errors`
    )

    return NextResponse.json({
      success: true,
      sent: successCount,
      errors: errorCount,
      users: users.length,
    })
  } catch (error) {
    console.error('[Digest Cron] Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
