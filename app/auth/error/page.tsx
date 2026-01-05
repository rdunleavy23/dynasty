/**
 * Auth Error Page
 *
 * Shown when authentication fails
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null): { message: string; details?: string; troubleshooting?: string[] } => {
    switch (error) {
      case 'Configuration': {
        const message = 'There is a problem with the server configuration.'
        return {
          message,
          details: 'The email server may not be configured correctly. Check server logs for details.',
          troubleshooting: [
            'Verify EMAIL_SERVER_HOST, EMAIL_SERVER_USER, and EMAIL_SERVER_PASSWORD are set in your environment variables.',
            'Check that NEXTAUTH_SECRET and NEXTAUTH_URL are configured correctly.',
            'In development: Check the server console for detailed error messages.',
            'In production: Ensure all required environment variables are set in your hosting platform.',
            'See .env.example file for required configuration.',
          ],
        }
      }
      case 'AccessDenied':
        return {
          message: 'Access denied. You do not have permission to sign in.',
          troubleshooting: [
            'Your account may not have access to this application.',
            'Contact the administrator if you believe this is an error.',
          ],
        }
      case 'Verification':
        return {
          message: 'The sign-in link is no longer valid.',
          details: 'It may have expired or already been used.',
          troubleshooting: [
            'Magic links expire after a certain time for security.',
            'Request a new sign-in link from the sign-in page.',
            'Check that you clicked the most recent email.',
          ],
        }
      default:
        return {
          message: 'An error occurred during sign in.',
          details: 'Please try again. If the problem persists, contact support.',
          troubleshooting: [
            'Check your internet connection.',
            'Try refreshing the page.',
            'Clear your browser cache and cookies.',
          ],
        }
    }
  }

  const errorInfo = getErrorMessage(error)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-gray-200 p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">Sign In Failed</h1>

        <p className="text-gray-600 mb-2 leading-relaxed font-medium">{errorInfo.message}</p>
        
        {errorInfo.details && (
          <p className="text-gray-500 mb-6 text-sm">{errorInfo.details}</p>
        )}

        {errorInfo.troubleshooting && errorInfo.troubleshooting.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Troubleshooting:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              {errorInfo.troubleshooting.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="block w-full px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            Try Again
          </Link>

          <Link
            href="/"
            className="block text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            Return to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
