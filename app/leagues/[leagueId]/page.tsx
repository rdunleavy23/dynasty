/**
 * League Intel Dashboard
 *
 * Main intelligence view for a specific league
 * Shows team cards, intel feed, and summary stats
 */

import { TeamCard } from '@/components/TeamCard'
import { IntelFeed } from '@/components/IntelFeed'
import { RefreshCw, TrendingUp } from 'lucide-react'
import type { LeagueIntelResponse } from '@/types'
import Link from 'next/link'

interface PageProps {
  params: {
    leagueId: string
  }
}

async function getLeagueIntel(leagueId: string): Promise<LeagueIntelResponse | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/leagues/${leagueId}/intel`, {
      cache: 'no-store',
    })

    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export default async function LeagueIntelPage({ params }: PageProps) {

  const intel = await getLeagueIntel(params.leagueId)

  if (!intel) {
    return <LeagueNotSynced leagueId={params.leagueId} />
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
            </div>
            <div className="flex items-center gap-3">
              <SyncButton leagueId={params.leagueId} />
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
              <h2 className="text-2xl font-bold text-gray-900">Teams</h2>
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

function SyncButton({ leagueId }: { leagueId: string }) {
  return (
    <form action={`/api/leagues/${leagueId}/sync`} method="POST">
      <button
        type="submit"
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Sync Now
      </button>
    </form>
  )
}

function LeagueNotSynced({ leagueId }: { leagueId: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">League Not Synced</h2>
        <p className="text-gray-600 mb-6">
          This league hasn&apos;t been synced yet. Run your first sync to start analyzing.
        </p>
        <form action={`/api/leagues/${leagueId}/sync`} method="POST">
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            Run First Sync
          </button>
        </form>
      </div>
    </div>
  )
}
