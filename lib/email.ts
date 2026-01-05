/**
 * Email service wrapper using Resend
 *
 * Handles all email sending for the application:
 * - Magic link authentication
 * - Weekly digests
 * - Notifications
 */

import { Resend } from 'resend'
import { getEnv, isFeatureEnabled } from './env'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Check if email service is available
 */
export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

/**
 * Send magic link email for authentication
 */
export async function sendMagicLinkEmail({
  to,
  url,
}: {
  to: string
  url: string
}) {
  if (!isEmailEnabled()) {
    console.warn('[Email] Skipping magic link - no API key configured')
    return { success: false, error: 'Email not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getEnv('EMAIL_FROM'),
      to,
      subject: 'Sign in to League Intel',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="padding: 40px 32px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0ea5e9;">League Intel</h1>
                  <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">Dynasty Fantasy Football Intelligence</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">Sign in to your account</h2>
                  <p style="margin: 0 0 24px; font-size: 15px; color: #4b5563;">Click the button below to securely sign in to League Intel. This link will expire in 24 hours.</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="${url}" style="display: inline-block; padding: 12px 32px; background-color: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Sign In</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280;">If you didn't request this email, you can safely ignore it.</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">© 2026 League Intel. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error('[Email] Failed to send magic link:', error)
      return { success: false, error: error.message }
    }

    console.log('[Email] ✓ Magic link sent to', to)
    return { success: true, data }
  } catch (error) {
    console.error('[Email] Exception sending magic link:', error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Send weekly digest email
 */
export async function sendDigestEmail({
  to,
  digest,
}: {
  to: string
  digest: {
    leagueName: string
    weekNumber: number
    summary: string
    topInsights: Array<{ teamName: string; message: string; category: string }>
    tradeIdeas: Array<{ team1: string; team2: string; description: string; confidence: number }>
    dashboardUrl: string
  }
}) {
  if (!isEmailEnabled()) {
    console.warn('[Email] Skipping digest - no API key configured')
    return { success: false, error: 'Email not configured' }
  }

  if (!isFeatureEnabled('DIGEST_ENABLED')) {
    console.log('[Email] Digest feature disabled')
    return { success: false, error: 'Digest feature disabled' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getEnv('EMAIL_FROM'),
      to,
      subject: `${digest.leagueName} - Week ${digest.weekNumber} Intel Digest`,
      html: generateDigestHTML(digest),
    })

    if (error) {
      console.error('[Email] Failed to send digest:', error)
      return { success: false, error: error.message }
    }

    console.log('[Email] ✓ Digest sent to', to, 'for', digest.leagueName)
    return { success: true, data }
  } catch (error) {
    console.error('[Email] Exception sending digest:', error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Generate HTML for weekly digest email
 */
function generateDigestHTML(digest: {
  leagueName: string
  weekNumber: number
  summary: string
  topInsights: Array<{ teamName: string; message: string; category: string }>
  tradeIdeas: Array<{ team1: string; team2: string; description: string; confidence: number }>
  dashboardUrl: string
}): string {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'waiver':
        return '#0ea5e9'
      case 'strategy':
        return '#22c55e'
      case 'activity':
        return '#64748b'
      default:
        return '#6b7280'
    }
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return '🔥 High'
    if (confidence >= 60) return '✨ Medium'
    return '💡 Low'
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 680px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-top-left-radius: 12px; border-top-right-radius: 12px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">📊 ${digest.leagueName}</h1>
              <p style="margin: 8px 0 0; font-size: 16px; color: #e0f2fe;">Week ${digest.weekNumber} Intelligence Digest</p>
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">This Week's Overview</h2>
              <p style="margin: 0; font-size: 15px; color: #4b5563; line-height: 1.7;">${digest.summary}</p>
            </td>
          </tr>

          <!-- Top Insights -->
          ${
            digest.topInsights.length > 0
              ? `
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">✨ Top Insights</h2>
              ${digest.topInsights
                .map(
                  (insight) => `
                <div style="margin-bottom: 16px; padding: 16px; background-color: #f9fafb; border-left: 3px solid ${getCategoryColor(insight.category)}; border-radius: 8px;">
                  <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #111827;">${insight.teamName}</p>
                  <p style="margin: 0; font-size: 14px; color: #4b5563;">${insight.message}</p>
                </div>
              `
                )
                .join('')}
            </td>
          </tr>
          `
              : ''
          }

          <!-- Trade Ideas -->
          ${
            digest.tradeIdeas.length > 0
              ? `
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">💡 Trade Ideas</h2>
              ${digest.tradeIdeas
                .map(
                  (trade) => `
                <div style="margin-bottom: 16px; padding: 16px; background-color: #fefce8; border-radius: 8px; border: 1px solid #fde047;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${trade.team1} ↔ ${trade.team2}</p>
                    <span style="font-size: 12px; color: #ca8a04;">${getConfidenceLabel(trade.confidence)}</span>
                  </div>
                  <p style="margin: 0; font-size: 14px; color: #4b5563;">${trade.description}</p>
                </div>
              `
                )
                .join('')}
            </td>
          </tr>
          `
              : ''
          }

          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 24px; background-color: #f9fafb; border-radius: 8px;">
                    <p style="margin: 0 0 16px; font-size: 15px; color: #4b5563;">View full analysis and team breakdowns</p>
                    <a href="${digest.dashboardUrl}" style="display: inline-block; padding: 12px 32px; background-color: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">View Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">© 2026 League Intel. All rights reserved.</p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">Digests sent weekly on ${getEnv('DIGEST_DAY') === '1' ? 'Monday' : 'your configured day'}</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}
