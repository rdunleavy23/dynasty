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

  const getConfidenceStyle = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-stable-50 text-stable-700 border-stable-100'
    if (confidence >= 0.6) return 'bg-tinker-50 text-tinker-700 border-tinker-100'
    return 'bg-inactive-50 text-inactive-600 border-inactive-100'
  }

  return (
    <div className="group bg-white rounded-xl shadow-soft hover:shadow-soft-lg border border-gray-100 hover:border-primary-200 p-6 transition-all duration-200 animate-scale-in">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 text-primary-600 border border-primary-200">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {idea.targetTeamName}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Trade opportunity</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getConfidenceStyle(idea.confidence)}`}>
          {confidencePercent}% Match
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
        <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 bg-desperate-50 text-desperate-700 rounded-lg border border-desperate-100">
          <span className="text-xs font-semibold uppercase tracking-wide">Give</span>
          <span className="font-bold text-sm">{idea.suggestedGivePosition}</span>
        </div>
        <ArrowRight className="w-5 h-5 text-primary-400 flex-shrink-0" />
        <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 bg-stable-50 text-stable-700 rounded-lg border border-stable-100">
          <span className="text-xs font-semibold uppercase tracking-wide">Get</span>
          <span className="font-bold text-sm">{idea.suggestedGetPosition}</span>
        </div>
      </div>

      <div className="pt-1">
        <p className="text-sm text-gray-700 leading-relaxed">{idea.rationale}</p>
      </div>
    </div>
  )
}
