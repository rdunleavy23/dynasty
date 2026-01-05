/**
 * Sign In Page
 *
 * Simple email magic link authentication
 */

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { BarChart3, Mail, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn('email', { email, redirect: false })
      setSubmitted(true)
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <BarChart3 className="w-10 h-10 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">League Intel</h1>
          </Link>
          <p className="text-gray-600">Sign in to access your dynasty intelligence</p>
        </div>

        {/* Sign In Card */}
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-8">
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
              <p className="text-gray-600 mb-6">
                We&apos;ve sent a magic link to <strong>{email}</strong>. Click the link to sign in.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Sign In
              </h2>

              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Send Magic Link
                  </>
                )}
              </button>

              <p className="text-sm text-gray-500 mt-4 text-center">
                We&apos;ll email you a magic link for a password-free sign in.
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Don&apos;t have an account? Sign in with email to create one automatically.
        </p>
      </div>
    </div>
  )
}
