/**
 * Test League Analysis Page
 *
 * Direct access to league intelligence for testing purposes
 * Bypasses authentication for league ID: 1312497096116404224
 */

import { TeamCard } from '@/components/TeamCard'
import { IntelFeed } from '@/components/IntelFeed'
import { RefreshCw, TrendingUp, AlertCircle } from 'lucide-react'
import type { LeagueIntelResponse } from '@/types'

interface PageProps {
  params: {
    leagueId: string
  }
}

async function getLeagueIntel(leagueId: string): Promise<LeagueIntelResponse | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/leagues/${leagueId}/intel`, {
      cache: 'no-store',
      headers: {
        // For testing purposes, we'll try to bypass auth
        // In a real test scenario, you might need to provide valid session tokens
      }
    })

    if (!response.ok) {
      console.error(`Failed to fetch league intel: ${response.status} ${response.statusText}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching league intel:', error)
    return null
  }
}

export default async function TestLeagueAnalysisPage({ params }: PageProps) {
  const leagueId = params.leagueId
  const intel = await getLeagueIntel(leagueId)

  if (!intel) {
    return <LeagueNotAvailable leagueId={leagueId} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{intel.league.name}</h1>
              <p className="text-gray-600 mt-1">{intel.league.season} Season</p>
              <p className="text-sm text-orange-600 mt-2 font-mono">Test Page - League ID: {leagueId}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                TEST MODE
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Most Active</p>
              <p className="text-lg font-semibold text-gray-900">
                {intel.summary.mostActiveTeam || 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Most Inactive</p>
              <p className="text-lg font-semibold text-gray-900">
                {intel.summary.mostInactiveTeam || 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Avg Moves/Team</p>
              <p className="text-lg font-semibold text-gray-900">
                {intel.summary.avgMovesPerTeam}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Team Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Teams ({intel.teams.length})</h2>
            </div>
            <div className="grid gap-6">
              {intel.teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <IntelFeed items={intel.feed} />
          </div>
        </div>
      </main>
    </div>
  )
}

function LeagueNotAvailable({ leagueId }: { leagueId: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">League Not Available</h2>
        <p className="text-gray-600 mb-4">
          Unable to load analysis for league ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{leagueId}</code>
        </p>
        <p className="text-sm text-gray-500 mb-6">
          This could be due to:
        </p>
        <ul className="text-sm text-gray-500 text-left mb-6 space-y-1">
          <li>• League not synced yet</li>
          <li>• Authentication issues</li>
          <li>• Network connectivity problems</li>
          <li>• Invalid league ID</li>
        </ul>
        <div className="text-xs text-gray-400 font-mono">
          Test URL: /test/league/{leagueId}
        </div>
      </div>
    </div>
  )
}
