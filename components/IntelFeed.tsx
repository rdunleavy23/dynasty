/**
 * IntelFeed Component - Notion-inspired design
 *
 * Beautiful feed of league intelligence insights with smooth animations
 */

'use client'

import type { IntelFeedItem } from '@/types'
import { Activity, TrendingUp, Users, Sparkles } from 'lucide-react'

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

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'waiver':
        return 'text-primary-600 bg-primary-50 border-primary-100'
      case 'strategy':
        return 'text-contend-600 bg-contend-50 border-contend-100'
      case 'activity':
        return 'text-inactive-600 bg-inactive-50 border-inactive-100'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-100'
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-12 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">No Intel Yet</h3>
        <p className="text-sm text-gray-500">Sync your league to see insights and trends</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden animate-fade-in">
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            League Intel Feed
          </h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">Key insights and trends</p>
      </div>

      <div className="max-h-[32rem] overflow-y-auto">
        {items.map((item, index) => (
          <div
            key={index}
            className="px-5 py-3.5 hover:bg-gray-50/50 transition-all duration-150 border-b border-gray-50 last:border-b-0 animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg border ${getCategoryStyle(item.category)}`}>
                {getIcon(item.category)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 mb-1">{item.teamName}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
