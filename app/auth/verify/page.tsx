/**
 * Email Verification Page
 *
 * Shown after user requests a magic link
 */

import { Mail } from 'lucide-react'
import Link from 'next/link'

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-gray-200 p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">Check your email</h1>

        <p className="text-gray-600 mb-6 leading-relaxed">
          A sign-in link has been sent to your email address. Click the link in the email to sign
          in to League Intel.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> The link will expire in 24 hours and can only be used once.
          </p>
        </div>

        <Link
          href="/"
          className="text-primary-600 hover:text-primary-700 font-medium text-sm"
        >
          Return to home
        </Link>
      </div>
    </div>
  )
}
