/**
 * TradeIdeaCard Component
 *
 * Displays a single trade idea suggestion
 */

'use client'

import type { TradeIdea } from '@/types'
import { ArrowRight, Lightbulb } from 'lucide-react'

interface TradeIdeaCardProps {
  idea: TradeIdea
}

export function TradeIdeaCard({ idea }: TradeIdeaCardProps) {
  const confidencePercent = Math.round(idea.confidence * 100)

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-300'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-gray-100 text-gray-800 border-gray-300'
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-blue-100 text-blue-600">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{idea.targetTeamName}</h3>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(idea.confidence)}`}>
          {confidencePercent}% match
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3 text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-md border border-red-200">
          <span className="font-medium">Give:</span>
          <span>{idea.suggestedGivePosition}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-md border border-green-200">
          <span className="font-medium">Get:</span>
          <span>{idea.suggestedGetPosition}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100">
        <p className="text-sm text-gray-700">{idea.rationale}</p>
      </div>
    </div>
  )
}
