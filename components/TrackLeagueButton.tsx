/**
 * Track League Button
 * 
 * Handles the full flow of:
 * 1. Creating league in database
 * 2. Syncing data from Sleeper
 * 3. Running analysis
 * 4. Redirecting to real data
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'

interface TrackLeagueButtonProps {
  sleeperLeagueId: string
  leagueName: string
}

export function TrackLeagueButton({ sleeperLeagueId, leagueName }: TrackLeagueButtonProps) {
  const router = useRouter()
  const [isTracking, setIsTracking] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const handleTrack = async () => {
    setIsTracking(true)
    setError(null)
    
    try {
      // Step 1: Create league
      setStatus('Creating league in database...')
      const createResponse = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleeperLeagueId }),
      })

      const createData = await createResponse.json()

      if (!createResponse.ok) {
        // If league already exists, that's fine - use existing ID
        if (createData.error === 'League already exists' && createData.leagueId) {
          console.log('League already exists, using existing ID:', createData.leagueId)
          // Continue to sync with existing league ID
        } else {
          throw new Error(createData.message || createData.error || 'Failed to create league')
        }
      }

      const leagueId = createData.league?.id || createData.leagueId

      // Step 2: Sync data from Sleeper
      setStatus('Syncing transactions from Sleeper...')
      const syncResponse = await fetch(`/api/leagues/${leagueId}/sync`, {
        method: 'POST',
      })

      if (!syncResponse.ok) {
        const syncData = await syncResponse.json()
        throw new Error(syncData.message || syncData.error || 'Failed to sync league')
      }

      // Step 3: Success! Redirect to real data
      setStatus('✨ Done! Loading your league intel...')
      
      // Small delay for user to see success message
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Refresh the page to show real data
      router.refresh()
      
    } catch (err) {
      console.error('Error tracking league:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsTracking(false)
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-red-900 mb-2">😬 Oops, that didn't work</p>
        <p className="text-sm text-red-800 mb-3">{error}</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setError(null)
              setIsTracking(false)
            }}
            className="px-4 py-2 bg-white border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
          >
            Try Again
          </button>
          <a
            href={`https://sleeper.com/leagues/${sleeperLeagueId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
          >
            View on Sleeper
          </a>
        </div>
      </div>
    )
  }

  if (isTracking) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-blue-900">{status}</p>
            <p className="text-xs text-blue-700 mt-1">This might take 10-30 seconds...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={handleTrack}
      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
    >
      <Sparkles className="w-5 h-5" />
      Track This League
    </button>
  )
}

