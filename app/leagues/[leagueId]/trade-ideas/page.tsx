/**
 * Trade Ideas Page
 *
 * Shows smart trade suggestions for a specific team
 */

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { TradeIdeaCard } from '@/components/TradeIdeaCard'
import { Lightbulb, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { TradeIdea } from '@/types'

interface PageProps {
  params: {
    leagueId: string
  }
}

export default function TradeIdeasPage({ params }: PageProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const teamId = searchParams.get('teamId')

  const [ideas, setIdeas] = useState<TradeIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!teamId) {
      setError('No team selected')
      setLoading(false)
      return
    }

    const fetchIdeas = async () => {
      try {
        const response = await fetch(
          `/api/leagues/${params.leagueId}/trade-ideas?teamId=${teamId}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch trade ideas')
        }

        const data = await response.json()
        setIdeas(data.ideas)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchIdeas()
  }, [params.leagueId, teamId])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href={`/leagues/${params.leagueId}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to League Intel
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trade Ideas</h1>
              <p className="text-gray-600 mt-1">
                Smart suggestions based on your league's actual behavior
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <p>{error}</p>
          </div>
        ) : ideas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No trade ideas yet
            </h3>
            <p className="text-gray-600">
              We couldn't find any strong trade matches based on current positional needs.
              Sync your league data or check back after more waiver activity.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> These are contextual ideas based on positional needs and team
                strategies. Always evaluate player values and league context before proposing trades.
              </p>
            </div>

            {ideas.map((idea, index) => (
              <TradeIdeaCard key={index} idea={idea} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
