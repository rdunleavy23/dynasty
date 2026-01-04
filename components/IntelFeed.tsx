/**
 * IntelFeed Component
 *
 * Displays a feed of league intelligence insights
 */

'use client'

import type { IntelFeedItem } from '@/types'
import { Activity, TrendingUp, Users } from 'lucide-react'

interface IntelFeedProps {
  items: IntelFeedItem[]
}

export function IntelFeed({ items }: IntelFeedProps) {
  const getIcon = (category: string) => {
    switch (category) {
      case 'waiver':
        return <TrendingUp className="w-4 h-4" />
      case 'strategy':
        return <Users className="w-4 h-4" />
      case 'activity':
        return <Activity className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'waiver':
        return 'text-blue-600 bg-blue-50'
      case 'strategy':
        return 'text-green-600 bg-green-50'
      case 'activity':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
        <p className="text-gray-500">No intel items yet. Sync your league to see insights.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 divide-y divide-gray-100">
      <div className="px-4 py-3 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          League Intel Feed
        </h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {items.map((item, index) => (
          <div key={index} className="px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-full ${getCategoryColor(item.category)}`}>
                {getIcon(item.category)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.teamName}</p>
                <p className="text-sm text-gray-700 mt-0.5">{item.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
