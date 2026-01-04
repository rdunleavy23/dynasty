/**
 * Dashboard Page
 *
 * Shows all connected leagues for the authenticated user
 * Allows adding new leagues
 */

import { redirect } from 'next/navigation'
import { getCurrentUserId } from '@/lib/utils/auth-helpers'
import { prisma } from '@/lib/db'
import { LeagueCard } from '@/components/LeagueCard'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const userId = await getCurrentUserId()

  if (!userId) {
    redirect('/auth/signin')
  }

  // Fetch user's leagues
  const leagues = await prisma.league.findMany({
    where: { ownerUserId: userId },
    select: {
      id: true,
      name: true,
      season: true,
      platform: true,
      lastSyncAt: true,
      createdAt: true,
      _count: {
        select: { teams: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Leagues</h1>
              <p className="text-gray-600 mt-1">
                Manage and analyze your dynasty fantasy football leagues
              </p>
            </div>
            <AddLeagueButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {leagues.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function AddLeagueButton() {
  return (
    <Link
      href="/dashboard/add-league"
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
    >
      <Plus className="w-5 h-5" />
      Add League
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No leagues connected yet
        </h3>
        <p className="text-gray-600 mb-6">
          Connect your first Sleeper league to start analyzing your dynasty competition.
        </p>
        <Link
          href="/dashboard/add-league"
          className="inline-block px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
        >
          Connect Your First League
        </Link>
      </div>
    </div>
  )
}
