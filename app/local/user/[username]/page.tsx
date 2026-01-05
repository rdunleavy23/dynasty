/**
 * Local User Leagues Page
 *
 * Shows all leagues for a Sleeper username
 * User can then select which league to analyze
 */

import { prisma } from '@/lib/db'
import { getUserByUsername, getUserLeagues } from '@/lib/sleeper'
import Link from 'next/link'
import { ArrowRight, ExternalLink, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: {
    username: string
  }
}

async function getUserLeaguesData(username: string) {
  try {
    // Decode the username from URL (in case it was encoded)
    const decodedUsername = decodeURIComponent(username).trim()
    
    // First, get user by username from Sleeper API
    const user = await getUserByUsername(decodedUsername)
    if (!user) {
      console.error('[getUserLeaguesData] User not found for username:', decodedUsername)
      return { user: null, sleeperLeagues: [], dbLeagues: [] }
    }
    
    console.log('[getUserLeaguesData] Found user:', user.user_id, user.username)

    // Get leagues from Sleeper API
    const sleeperLeagues = await getUserLeagues(user.user_id)

    // Also check database for leagues where this user is a team owner
    const dbLeagues = await prisma.league.findMany({
      where: {
        teams: {
          some: {
            sleeperOwnerId: user.user_id,
          },
        },
      },
      select: {
        id: true,
        sleeperLeagueId: true,
        name: true,
        season: true,
        lastSyncAt: true,
        _count: {
          select: { teams: true },
        },
      },
      orderBy: { season: 'desc' },
    })

    return { user, sleeperLeagues, dbLeagues }
  } catch (error) {
    console.error('Error fetching user leagues:', error)
    return { user: null, sleeperLeagues: [], dbLeagues: [] }
  }
}

export default async function LocalUserLeaguesPage({ params }: PageProps) {
  const username = decodeURIComponent(params.username)
  const { user, sleeperLeagues, dbLeagues } = await getUserLeaguesData(username)

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md border border-red-200 p-12 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h2>
          <p className="text-gray-600 mb-4">
            Sleeper username <code className="bg-gray-100 px-2 py-1 rounded text-sm">{decodeURIComponent(username)}</code> not found.
          </p>
          <Link
            href="/local"
            className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            ← Try Another Username
          </Link>
        </div>
      </div>
    )
  }

  // Combine Sleeper leagues with database info
  const leaguesWithDbInfo = sleeperLeagues.map((sleeperLeague) => {
    const dbLeague = dbLeagues.find((db) => db.sleeperLeagueId === sleeperLeague.league_id)
    return {
      sleeperLeagueId: sleeperLeague.league_id,
      name: sleeperLeague.name,
      season: parseInt(sleeperLeague.season),
      status: sleeperLeague.status,
      inDatabase: !!dbLeague,
      dbLeagueId: dbLeague?.id,
      lastSyncAt: dbLeague?.lastSyncAt,
      teamCount: dbLeague?._count.teams || 0,
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user.display_name || user.username}
              </h1>
              <p className="text-gray-600 mt-1">Sleeper Username: @{user.username}</p>
              <p className="text-sm text-blue-600 mt-2 font-mono">Local Page - User: {username}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                LOCAL MODE
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Leagues ({leaguesWithDbInfo.length})
          </h2>
          <p className="text-gray-600">
            Select a league to view analysis. Leagues already in the database are marked with a checkmark.
          </p>
        </div>

        {leaguesWithDbInfo.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <p className="text-gray-600 mb-4">No leagues found for this user.</p>
            <Link
              href="/local"
              className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              ← Try Another Username
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leaguesWithDbInfo.map((league) => (
              <Link
                key={league.sleeperLeagueId}
                href={
                  league.inDatabase && league.dbLeagueId
                    ? `/local/league/${league.dbLeagueId}`
                    : `/local/league/${league.sleeperLeagueId}`
                }
                className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{league.name}</h3>
                    <p className="text-sm text-gray-600">{league.season} Season</p>
                    {league.status && (
                      <span
                        className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                          league.status === 'complete'
                            ? 'bg-green-100 text-green-800'
                            : league.status === 'drafting'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {league.status}
                      </span>
                    )}
                  </div>
                  {league.inDatabase && (
                    <div className="ml-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {league.inDatabase ? (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {league.teamCount} teams • Synced
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                    {league.lastSyncAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last sync: {new Date(league.lastSyncAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Not in database</span>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Will show demo data or prompt to add
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

