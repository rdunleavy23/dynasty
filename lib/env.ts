/**
 * Environment variable validation
 *
 * Validates required environment variables at runtime
 * Provides type-safe access to environment variables
 */

/**
 * Required environment variables for production
 */
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'CRON_SECRET',
] as const

/**
 * Optional environment variables (with defaults)
 */
const optionalEnvVars = {
  RESEND_API_KEY: '',
  EMAIL_FROM: 'League Intel <noreply@leagueintel.app>',
  DIGEST_ENABLED: 'false',
  DIGEST_DAY: '1', // Monday
  NODE_ENV: 'development',
} as const

/**
 * Validate environment variables on app startup
 * Throws if required variables are missing
 */
export function validateEnv() {
  const missing: string[] = []

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}\n\n` +
        `Please set these in your .env file or deployment platform.`
    )
  }

  // Warn about missing optional variables
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      '[ENV] RESEND_API_KEY not set - email features will be disabled'
    )
  }

  console.log('[ENV] ✓ Environment variables validated')
}

/**
 * Get environment variable with type safety
 */
export function getEnv(key: keyof typeof optionalEnvVars): string
export function getEnv(key: (typeof requiredEnvVars)[number]): string
export function getEnv(key: string): string {
  return process.env[key] || optionalEnvVars[key as keyof typeof optionalEnvVars] || ''
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  const value = process.env[feature]
  return value === 'true' || value === '1'
}

/**
 * Get environment info for health checks
 */
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasEmailConfig: Boolean(process.env.RESEND_API_KEY),
    digestEnabled: isFeatureEnabled('DIGEST_ENABLED'),
    vercelEnv: process.env.VERCEL_ENV || 'development',
    vercelUrl: process.env.VERCEL_URL || 'localhost:3000',
  }
}
