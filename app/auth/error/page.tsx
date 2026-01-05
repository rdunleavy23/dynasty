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

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.'
      case 'Verification':
        return 'The sign-in link is no longer valid. It may have expired or already been used.'
      default:
        return 'An error occurred during sign in. Please try again.'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-gray-200 p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">Sign In Failed</h1>

        <p className="text-gray-600 mb-8 leading-relaxed">{getErrorMessage(error)}</p>

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
