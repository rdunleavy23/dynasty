/**
 * NextAuth configuration
 *
 * Using email magic link authentication for simplicity.
 * User sessions are managed through NextAuth's built-in session system.
 */

import { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './db'
import { checkAuthConfig } from './utils/auth-helpers'

// Validate configuration - only warn in development, don't block build
// Runtime validation happens when auth is actually used
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  const configCheck = checkAuthConfig()
  if (!configCheck.isValid) {
    console.warn('⚠️  Authentication configuration issues detected:')
    configCheck.errors.forEach((error) => {
      console.warn(`   - ${error}`)
    })
    console.warn('\n📝 To fix:')
    if (configCheck.missingVars.length > 0) {
      console.warn(`   Missing variables: ${configCheck.missingVars.join(', ')}`)
      console.warn('   Add them to your .env file. See .env.example for reference.')
    }
    console.warn('\n💡 In development, email configuration is optional but recommended.')
  }
}

// Build email provider configuration
// Runtime validation - only throw in production when actually trying to send emails
const emailServerConfig = (() => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const hasEmailConfig = 
    process.env.EMAIL_SERVER_HOST &&
    process.env.EMAIL_SERVER_USER &&
    process.env.EMAIL_SERVER_PASSWORD

  if (!hasEmailConfig) {
    if (isDevelopment) {
      // In development, return minimal config - NextAuth will handle errors gracefully
      return {
        host: 'localhost',
        port: 587,
        auth: {
          user: '',
          pass: '',
        },
      }
    }
    // In production, we'll validate at runtime when sending emails
    // Return empty config - NextAuth will throw Configuration error which we handle in error page
    return {
      host: process.env.EMAIL_SERVER_HOST || '',
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587', 10),
      auth: {
        user: process.env.EMAIL_SERVER_USER || '',
        pass: process.env.EMAIL_SERVER_PASSWORD || '',
      },
    }
  }

  return {
    host: process.env.EMAIL_SERVER_HOST!,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587', 10),
    auth: {
      user: process.env.EMAIL_SERVER_USER!,
      pass: process.env.EMAIL_SERVER_PASSWORD!,
    },
  }
})()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: emailServerConfig,
      from: process.env.EMAIL_FROM || 'noreply@leagueintel.app',
      // In development without email config, NextAuth will handle errors
      // The error page will show helpful messages
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}
