/**
 * Local Analysis Entry Page
 *
 * Entry point for local analysis - supports both username and league ID
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, User, Hash, HelpCircle, ExternalLink } from 'lucide-react'

export default function LocalAnalysisPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [leagueId, setLeagueId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'username' | 'league'>('username')
  const [showHelp, setShowHelp] = useState(false)

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setIsLoading(true)
    router.push(`/local/user/${encodeURIComponent(username.trim())}`)
  }

  const handleLeagueSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!leagueId.trim()) return

    setIsLoading(true)
    router.push(`/local/league/${leagueId.trim()}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
            {mode === 'username' ? <User className="w-8 h-8" /> : <Hash className="w-8 h-8" />}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">League Intel</h1>
          <p className="text-gray-600 mb-1">
            {mode === 'username' 
              ? 'Enter your Sleeper username to see all your leagues'
              : 'Jump straight to a league with its ID'}
          </p>
          <p className="text-xs text-gray-500">
            Free preview • No signup required
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setMode('username')
              setLeagueId('')
            }}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'username'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Username
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('league')
              setUsername('')
            }}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'league'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Hash className="w-4 h-4 inline mr-2" />
            League ID
          </button>
        </div>

        {mode === 'username' ? (
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
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
        ) : (
          <form onSubmit={handleLeagueSubmit} className="space-y-4">
            <div>
              <label htmlFor="leagueId" className="block text-sm font-medium text-gray-700 mb-2">
                Sleeper League ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="leagueId"
                  type="text"
                  value={leagueId}
                  onChange={(e) => setLeagueId(e.target.value)}
                  placeholder="1312497096116404224"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Found in your league URL
                </p>
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  How do I find this?
                </button>
              </div>
              
              {showHelp && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <p className="font-medium text-blue-900 mb-2">📍 Finding Your League ID:</p>
                  <ol className="text-blue-800 space-y-1 ml-4 list-decimal">
                    <li>Go to Sleeper.com and open your league</li>
                    <li>Look at the URL in your browser</li>
                    <li>Copy the long number after <code className="bg-blue-100 px-1 rounded text-xs">/leagues/</code></li>
                  </ol>
                  <p className="text-xs text-blue-600 mt-2">
                    Example: sleeper.com/leagues/<span className="font-mono font-bold">1312497096116404224</span>
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!leagueId.trim() || isLoading}
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
                  View Analysis
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

