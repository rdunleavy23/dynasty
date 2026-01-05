/**
 * Add League Page
 *
 * Form to connect a new Sleeper league
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function AddLeaguePage() {
  const router = useRouter()
  const [leagueId, setLeagueId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleeperLeagueId: leagueId.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add league')
      }

      // Redirect to new league's page
      router.push(`/leagues/${data.league.id}`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Connect a Sleeper League
          </h1>
          <p className="text-gray-600 mb-6">
            Enter your Sleeper league ID to start analyzing your dynasty league.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="leagueId" className="block text-sm font-medium text-gray-700 mb-2">
                Sleeper League ID
              </label>
              <input
                type="text"
                id="leagueId"
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                placeholder="e.g., 123456789012345678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                required
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-2">
                Find your league ID in the Sleeper app URL or settings
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !leagueId.trim()}
              className="w-full px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect League'
              )}
            </button>
          </form>

          {/* Help Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              How to find your league ID:
            </h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Open Sleeper app or website</li>
              <li>Go to your league</li>
              <li>Look at the URL - the ID is the long number at the end</li>
              <li>Example: sleeper.com/leagues/123456789012345678</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
