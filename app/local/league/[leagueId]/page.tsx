/**
 * Local League Analysis Page
 *
 * Direct database access for local development/testing
 * Bypasses authentication - queries database directly
 */

import { prisma } from '@/lib/db'
import { TeamCard } from '@/components/TeamCard'
import { IntelFeed } from '@/components/IntelFeed'
import { daysSince } from '@/lib/analysis/strategy'
import type { LeagueIntelResponse, TeamCard as TeamCardType, IntelFeedItem, PositionalNeedsMap } from '@/types'

interface PageProps {
  params: {
    leagueId: string
  }
}

async function getLeagueIntelDirect(leagueId: string): Promise<LeagueIntelResponse | null> {
  try {
    // Fetch league with all related data directly from database
    // Try by sleeperLeagueId first (for external IDs), then by internal id
    const league = await Promise.race([
      prisma.league.findFirst({
        where: {
          OR: [
            { sleeperLeagueId: leagueId },
            { id: leagueId },
          ],
        },
        include: {
          teams: {
            include: {
              waiverSummary: true,
              positionalProfile: true,
            },
          },
        },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma query timeout after 10s')), 10000))
    ]) as Awaited<ReturnType<typeof prisma.league.findFirst>>
    if (!league) {
      return null
    }

    // Build team cards
    const teamCards: TeamCardType[] = league.teams.map((team) => {
      const daysSinceActivity = daysSince(team.lastActivityAt)
      const positionalNeeds = (team.positionalProfile?.positionalNeeds as PositionalNeedsMap) || {}

      return {
        id: team.id,
        displayName: team.displayName,
        teamName: team.teamName || undefined,
        strategyLabel: team.strategyLabel,
        strategyReason: team.notes || 'No strategy analysis yet',
        lastActivityAt: team.lastActivityAt,
        daysSinceActivity,
        positionalNeeds,
        last30dAdds: team.waiverSummary?.last30dAdds || 0,
        last30dDrops: team.waiverSummary?.last30dDrops || 0,
      }
    })

    // Build intel feed
    const feed: IntelFeedItem[] = []

    for (const team of league.teams) {
      const summary = team.waiverSummary

      // Strategy-based insights
      if (team.strategyLabel && team.notes) {
        feed.push({
          teamId: team.id,
          teamName: team.teamName || team.displayName,
          message: team.notes,
          timestamp: new Date(),
          category: 'strategy',
        })
      }

      // Waiver activity insights
      if (summary) {
        const addsByPos = summary.addsByPosition as Record<string, number>

        // Check for position-specific activity
        if (addsByPos && typeof addsByPos === 'object' && !Array.isArray(addsByPos)) {
          for (const [position, count] of Object.entries(addsByPos)) {
            if (typeof count === 'number' && count >= 3) {
              feed.push({
                teamId: team.id,
                teamName: team.teamName || team.displayName,
                message: `Added ${count} ${position}s in the last 30 days → likely ${position} desperate`,
                timestamp: new Date(),
                category: 'waiver',
              })
            }
          }
        }
      }

      // Inactivity warnings
      const daysSinceActivity = daysSince(team.lastActivityAt)
      if (daysSinceActivity !== null && daysSinceActivity >= 21) {
        feed.push({
          teamId: team.id,
          teamName: team.teamName || team.displayName,
          message: `No activity in ${daysSinceActivity} days → likely inactive`,
          timestamp: team.lastActivityAt || new Date(),
          category: 'activity',
        })
      }
    }

    // Calculate summary stats
    const totalMoves = league.teams.reduce(
      (sum, team) => sum + (team.waiverSummary?.last30dAdds || 0) + (team.waiverSummary?.last30dDrops || 0),
      0
    )
    const avgMovesPerTeam = league.teams.length > 0 ? totalMoves / league.teams.length : 0

    const mostActiveTeam = league.teams.length > 0
      ? league.teams.reduce((max, team) => {
          const moves = (team.waiverSummary?.last30dAdds || 0) + (team.waiverSummary?.last30dDrops || 0)
          const maxMoves = (max.waiverSummary?.last30dAdds || 0) + (max.waiverSummary?.last30dDrops || 0)
          return moves > maxMoves ? team : max
        }, league.teams[0])
      : null

    const mostInactiveTeam = league.teams.length > 0
      ? league.teams.reduce((max, team) => {
          const days1 = daysSince(team.lastActivityAt) || 0
          const days2 = daysSince(max.lastActivityAt) || 0
          return days1 > days2 ? team : max
        }, league.teams[0])
      : null

    const response: LeagueIntelResponse = {
      league: {
        id: league.id,
        name: league.name,
        season: league.season,
        lastSyncAt: league.lastSyncAt,
      },
      teams: teamCards,
      feed: feed.slice(0, 20), // Limit to top 20 items
      summary: {
        mostActiveTeam: mostActiveTeam ? mostActiveTeam.teamName || mostActiveTeam.displayName : null,
        mostInactiveTeam: mostInactiveTeam ? mostInactiveTeam.teamName || mostInactiveTeam.displayName : null,
        avgMovesPerTeam: Math.round(avgMovesPerTeam * 10) / 10,
      },
    }

    return response
  } catch (error) {
    console.error('Error fetching league intel directly:', error)
    
    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes('DATABASE_URL')) {
      throw new Error('DATABASE_URL environment variable is not set. Please configure your database connection.')
    }
    
    return null
  }
}

export default async function LocalLeagueAnalysisPage({ params }: PageProps) {
  const leagueId = params.leagueId
  
  let intel: LeagueIntelResponse | null = null
  let errorMessage: string | null = null
  
  try {
    intel = await getLeagueIntelDirect(leagueId)
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error)
  }

  if (errorMessage) {
    return <DatabaseError leagueId={leagueId} errorMessage={errorMessage} />
  }

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
              <p className="text-sm text-blue-600 mt-2 font-mono">Local Page - League ID: {leagueId}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                LOCAL MODE
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

function DatabaseError({ leagueId, errorMessage }: { leagueId: string; errorMessage: string }) {
  const isDatabaseUrlError = errorMessage.includes('DATABASE_URL')
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md border border-red-200 p-12 text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Database Configuration Error</h2>
        {isDatabaseUrlError ? (
          <>
            <p className="text-gray-600 mb-4">
              The <code className="bg-gray-100 px-2 py-1 rounded text-sm">DATABASE_URL</code> environment variable is not set.
            </p>
            <div className="text-sm text-gray-500 mb-6 text-left bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold mb-2">To fix this:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a <code className="bg-gray-100 px-1 rounded">.env</code> file in the project root</li>
                <li>Add: <code className="bg-gray-100 px-1 rounded">DATABASE_URL="postgresql://..."</code></li>
                <li>Restart the dev server</li>
              </ol>
            </div>
          </>
        ) : (
          <p className="text-gray-600 mb-4">
            <code className="bg-gray-100 px-2 py-1 rounded text-sm text-xs">{errorMessage}</code>
          </p>
        )}
        <div className="text-xs text-gray-400 font-mono mt-4">
          Local URL: /local/league/{leagueId}
        </div>
      </div>
    </div>
  )
}

function LeagueNotAvailable({ leagueId }: { leagueId: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
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
          <li>• League not found in database</li>
          <li>• Database connection issues</li>
          <li>• Invalid league ID</li>
        </ul>
        <div className="text-xs text-gray-400 font-mono">
          Local URL: /local/league/{leagueId}
        </div>
      </div>
    </div>
  )
}

