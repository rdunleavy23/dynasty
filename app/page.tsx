/**
 * Landing Page
 *
 * Marketing page that explains League Intel and provides CTA to connect league
 */

import Link from 'next/link'
import { TrendingUp, Users, Target, BarChart3 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">League Intel</h1>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-md bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
            See how your league{' '}
            <span className="text-primary-600">really plays</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Analyze waivers, moves, and roster trends so you can propose trades{' '}
            <span className="font-semibold text-gray-900">they&apos;ll actually accept</span>.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-8 py-4 rounded-lg bg-primary-600 text-white text-lg font-semibold hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Connect Your Sleeper League
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • Free for dynasty leagues
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Spot Rebuilders vs Contenders
            </h3>
            <p className="text-gray-600">
              Automatically classify teams based on their waiver behavior. Know who&apos;s buying,
              who&apos;s selling, and who&apos;s checked out.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              See Who&apos;s Desperate at QB/RB/WR/TE
            </h3>
            <p className="text-gray-600">
              Track positional needs based on recent adds and roster composition. Find the teams
              most likely to overpay for your surplus.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Get Smart Trade Ideas
            </h3>
            <p className="text-gray-600">
              Receive contextual trade suggestions grounded in your league&apos;s actual behavior—not
              just generic trade calculators.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white/50 rounded-2xl my-16">
        <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
          How It Works
        </h3>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              1
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Connect Your League</h4>
            <p className="text-sm text-gray-600">
              Paste your Sleeper league ID and we&apos;ll import your league
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              2
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">We Analyze</h4>
            <p className="text-sm text-gray-600">
              Our engine tracks waivers, moves, and roster trends automatically
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              3
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">View Intel</h4>
            <p className="text-sm text-gray-600">
              See each team&apos;s strategy, needs, and activity level at a glance
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              4
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Make Moves</h4>
            <p className="text-sm text-gray-600">
              Use smart trade ideas to propose deals that actually get accepted
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h3 className="text-4xl font-bold text-gray-900 mb-4">
          Ready to dominate your dynasty league?
        </h3>
        <p className="text-xl text-gray-600 mb-8">
          Join dynasty managers who are using League Intel to win more trades.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-8 py-4 rounded-lg bg-primary-600 text-white text-lg font-semibold hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
        >
          Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600">
          <p className="text-sm">
            &copy; 2026 League Intel. Built for dynasty fantasy football managers.
          </p>
          <p className="text-xs mt-2">
            Currently supports Sleeper. MFL and ESPN coming soon.
          </p>
        </div>
      </footer>
    </div>
  )
}
