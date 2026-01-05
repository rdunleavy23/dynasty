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
  // #region agent log
  const logDebug = async (location: string, message: string, data: any) => {
    try {
      const logEntry = JSON.stringify({
        location,
        message,
        data,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }) + '\n'
      await fetch('http://127.0.0.1:7243/ingest/65e35794-301a-4f72-96d1-008e0ed53161', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: logEntry,
      }).catch(() => {})
    } catch {}
  }
  // #endregion

  let user: Awaited<ReturnType<typeof getUserByUsername>> = null
  let sleeperLeagues: Awaited<ReturnType<typeof getUserLeagues>> = []
  let dbLeagues: Array<any> = []

  try {
    await logDebug('app/local/user/[username]/page.tsx:21', 'getUserLeaguesData entry', { username, rawUsername: username })

    const decodedUsername = decodeURIComponent(username).trim()
    await logDebug('app/local/user/[username]/page.tsx:25', 'decoded username', { decodedUsername })

    user = await getUserByUsername(decodedUsername)
    await logDebug('app/local/user/[username]/page.tsx:28', 'after getUserByUsername', { userFound: !!user, userId: user?.user_id, username: user?.username })

    if (!user) {
      console.error('[getUserLeaguesData] User not found for username:', decodedUsername)
      await logDebug('app/local/user/[username]/page.tsx:31', 'user not found, returning empty', { decodedUsername })
      return { user: null, sleeperLeagues: [], dbLeagues: [] }
    }

    await logDebug('app/local/user/[username]/page.tsx:36', 'calling getUserLeagues', { userId: user.user_id })
    sleeperLeagues = await getUserLeagues(user.user_id)
    await logDebug('app/local/user/[username]/page.tsx:38', 'after getUserLeagues', { leaguesCount: sleeperLeagues?.length || 0, leagues: sleeperLeagues?.slice(0, 2) })

    try {
      await logDebug('app/local/user/[username]/page.tsx:40', 'querying database', { userId: user.user_id })
      dbLeagues = await prisma.league.findMany({
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
      await logDebug('app/local/user/[username]/page.tsx:58', 'after database query', { dbLeaguesCount: dbLeagues?.length || 0 })
    } catch (dbError) {
      console.error('DB error fetching user leagues:', dbError)
      await logDebug('app/local/user/[username]/page.tsx:56', 'db query failed', {
        errorMessage: dbError instanceof Error ? dbError.message : String(dbError),
        errorName: dbError instanceof Error ? dbError.name : undefined,
      })
      dbLeagues = []
    }

    await logDebug('app/local/user/[username]/page.tsx:60', 'returning data', {
      hasUser: !!user,
      sleeperLeaguesCount: sleeperLeagues?.length || 0,
      dbLeaguesCount: dbLeagues?.length || 0,
    })

    return { user, sleeperLeagues, dbLeagues }
  } catch (error) {
    await logDebug('app/local/user/[username]/page.tsx:63', 'error caught', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
      errorStack: error instanceof Error ? error.stack : undefined,
    })
    console.error('Error fetching user leagues:', error)
    return { user, sleeperLeagues, dbLeagues }
  }
}

export default async function LocalUserLeaguesPage({ params }: PageProps) {
  // #region agent log
  const logPath = '/Users/ryan/Desktop/dynasty-claude-league-intel-setup-qtTJi/.cursor/debug.log'
  const logDebug = async (location: string, message: string, data: any) => {
    try {
      const logEntry = JSON.stringify({
        location,
        message,
        data,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B'
      }) + '\n'
      await fetch('http://127.0.0.1:7243/ingest/65e35794-301a-4f72-96d1-008e0ed53161', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: logEntry
      }).catch(() => {})
    } catch {}
  }
  // #endregion
  
  const username = decodeURIComponent(params.username)
  
  // #region agent log
  await logDebug('app/local/user/[username]/page.tsx:67', 'LocalUserLeaguesPage entry', { username, rawParams: params.username })
  // #endregion
  
  const { user, sleeperLeagues, dbLeagues } = await getUserLeaguesData(username)
  
  // #region agent log
  await logDebug('app/local/user/[username]/page.tsx:70', 'after getUserLeaguesData', { 
    hasUser: !!user, 
    sleeperLeaguesCount: sleeperLeagues?.length || 0, 
    dbLeaguesCount: dbLeagues?.length || 0 
  })
  // #endregion

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-md border border-orange-200 p-12 text-center max-w-md">
          <div className="text-6xl mb-4">🤔</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hmm, we couldn't find that username</h2>
          <p className="text-gray-600 mb-2">
            We searched high and low for <code className="bg-gray-100 px-2 py-1 rounded text-sm font-semibold">{decodeURIComponent(username)}</code>, but came up empty.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Double-check for typos, or make sure this username exists on Sleeper.
          </p>
          <Link
            href="/local"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
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
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {user.display_name || user.username}
                </h1>
                {leaguesWithDbInfo.length > 0 && (
                  <span className="text-sm text-green-600 font-medium">
                    🎯 {leaguesWithDbInfo.length} {leaguesWithDbInfo.length === 1 ? 'league' : 'leagues'}
                  </span>
                )}
              </div>
              <p className="text-gray-600">@{user.username} on Sleeper</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">👋</span>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Welcome! Here are your {leaguesWithDbInfo.length} {leaguesWithDbInfo.length === 1 ? 'league' : 'leagues'}
              </p>
              <p className="text-sm text-blue-800">
                Click any league to see a preview with sample data. You'll be able to track it for real insights.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your Leagues
          </h2>
          <p className="text-gray-600">
            {leaguesWithDbInfo.some(l => l.inDatabase) 
              ? '✓ synced leagues have real data • others show preview mode'
              : 'Click any league to see a preview'}
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
                      <span className="text-gray-600">Preview available</span>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Click to see preview, then track for real intel
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

