/**
 * Test Index Page
 *
 * Entry point for testing league analysis functionality
 */

import Link from 'next/link'
import { ExternalLink, Search, TestTube } from 'lucide-react'

export default function TestIndexPage() {
  const testLeagues = [
    {
      id: '1312497096116404224',
      name: 'Requested League',
      description: 'The specific league requested for testing'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <TestTube className="w-12 h-12 text-orange-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">League Analysis Tests</h1>
          </div>
          <p className="text-xl text-gray-600">
            Test pages for league intelligence and analysis features
          </p>
          <div className="mt-4 px-4 py-2 bg-orange-100 text-orange-800 rounded-full inline-block text-sm font-medium">
            TEST ENVIRONMENT - No Authentication Required
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Test Access</h2>

          <div className="grid gap-4">
            {testLeagues.map((league) => (
              <div key={league.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <h3 className="font-semibold text-gray-900">{league.name}</h3>
                  <p className="text-sm text-gray-600">{league.description}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">ID: {league.id}</p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/test/league/${league.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Search className="w-4 h-4" />
                    View Analysis
                  </Link>
                  <Link
                    href={`/leagues/${league.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Full App
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom League ID Tester */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Test Any League ID</h2>
          <p className="text-gray-600 mb-6">
            Enter any league ID to test the analysis functionality
          </p>

          <form className="flex gap-4" action="/test/league" method="get">
            <input
              type="text"
              name="leagueId"
              placeholder="Enter league ID (e.g., 1312497096116404224)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Test League
            </button>
          </form>
        </div>

        {/* Available Test Routes */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Test Routes</h2>

          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900">League Analysis</h3>
              <p className="text-gray-600">View comprehensive league intelligence and team analysis</p>
              <code className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded mt-2 block">
                /test/league/[leagueId]
              </code>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-gray-900">Trade Ideas</h3>
              <p className="text-gray-600">View AI-generated trade recommendations</p>
              <code className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded mt-2 block">
                /leagues/[leagueId]/trade-ideas
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p className="text-sm">
            This is a test environment. Authentication is bypassed for development and testing purposes.
          </p>
        </div>
      </div>
    </div>
  )
}
