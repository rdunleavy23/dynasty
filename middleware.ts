/**
 * Next.js Middleware
 *
 * Handles authentication and route protection
 */

export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/leagues/:path*',
    '/api/leagues/:path*',
  ],
}
