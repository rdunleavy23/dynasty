/**
 * Local Analysis Entry Page
 *
 * Entry point for local analysis - enter a Sleeper username
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, User } from 'lucide-react'

export default function LocalAnalysisPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsLoading(true)
    router.push(`/local/user/${encodeURIComponent(username.trim())}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Local League Analysis</h1>
          <p className="text-gray-600">
            Enter a Sleeper username to view their leagues
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Sleeper Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm">@</span>
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="block w-full pl-7 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
                disabled={isLoading}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Enter the Sleeper username (without @)
            </p>
          </div>

          <button
            type="submit"
            disabled={!username.trim() || isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Find Leagues
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Or go directly to a league:{' '}
            <a
              href="/local/league/1312497096116404224"
              className="text-blue-600 hover:underline"
            >
              /local/league/1312497096116404224
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

