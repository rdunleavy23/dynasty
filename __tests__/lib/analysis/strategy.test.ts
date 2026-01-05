/**
 * Unit tests for team strategy classification
 *
 * Tests all strategy labels: REBUILD, CONTEND, TINKER, INACTIVE
 */

import { describe, it, expect } from 'vitest'
import { classifyTeamStrategy, daysSince } from '@/lib/analysis/strategy'
import type { StrategySignals } from '@/types'

describe('classifyTeamStrategy', () => {
  describe('INACTIVE classification', () => {
    it('should classify as INACTIVE when no activity for 21+ days', () => {
      const signals: StrategySignals = {
        totalMoves30d: 5,
        avgAgeAdded30d: 25,
        avgAgeDropped30d: 25,
        rosterAvgAge: 26,
        daysSinceLastActivity: 21,
      }

      const result = classifyTeamStrategy(signals)

      expect(result.label).toBe('INACTIVE')
      expect(result.confidence).toBeGreaterThanOrEqual(0.7)
      expect(result.reason).toContain('21 days')
    })

    it('should classify as INACTIVE when zero moves in last 30 days', () => {
      const signals: StrategySignals = {
        totalMoves30d: 0,
        avgAgeAdded30d: null,
        avgAgeDropped30d: null,
        rosterAvgAge: 26,
        daysSinceLastActivity: 10,
      }

      const result = classifyTeamStrategy(signals)

      expect(result.label).toBe('INACTIVE')
      expect(result.confidence).toBe(0.8)
      expect(result.reason).toContain('Zero moves')
    })

    it('should have higher confidence for longer inactivity', () => {
      const signals30days: StrategySignals = {
        totalMoves30d: 0,
        avgAgeAdded30d: null,
        avgAgeDropped30d: null,
        rosterAvgAge: 26,
        daysSinceLastActivity: 30,
      }

      const signals50days: StrategySignals = {
        ...signals30days,
        daysSinceLastActivity: 50,
      }

      const result30 = classifyTeamStrategy(signals30days)
      const result50 = classifyTeamStrategy(signals50days)

      expect(result50.confidence).toBeGreaterThan(result30.confidence)
    })
  })

  describe('REBUILD classification', () => {
    it('should classify as REBUILD when adding young and dropping old', () => {
      const signals: StrategySignals = {
        totalMoves30d: 10,
        avgAgeAdded30d: 22,
        avgAgeDropped30d: 28,
        rosterAvgAge: null,
        daysSinceLastActivity: 2,
      }

      const result = classifyTeamStrategy(signals)

      expect(result.label).toBe('REBUILD')
      expect(result.confidence).toBeGreaterThanOrEqual(0.7)
      expect(result.reason).toContain('young players')
      expect(result.reason).toContain('vets')
    })

    it('should classify as REBUILD with moderate confidence for just adding young', () => {
      const signals: StrategySignals = {
        totalMoves30d: 5,
        avgAgeAdded30d: 23,
        avgAgeDropped30d: 24,
        rosterAvgAge: null,
        daysSinceLastActivity: 1,
      }

      const result = classifyTeamStrategy(signals)

      expect(result.label).toBe('REBUILD')
      expect(result.confidence).toBe(0.65)
      expect(result.reason).toContain('young players')
    })

    it('should have higher confidence for larger age gap', () => {
      const smallGap: StrategySignals = {
        totalMoves30d: 8,
        avgAgeAdded30d: 24,
        avgAgeDropped30d: 26,
        rosterAvgAge: null,
        daysSinceLastActivity: 1,
      }

      const largeGap: StrategySignals = {
        totalMoves30d: 8,
        avgAgeAdded30d: 21,
        avgAgeDropped30d: 30,
        rosterAvgAge: null,
        daysSinceLastActivity: 1,
      }

      const resultSmall = classifyTeamStrategy(smallGap)
      const resultLarge = classifyTeamStrategy(largeGap)

      expect(resultLarge.confidence).toBeGreaterThan(resultSmall.confidence)
    })
  })

  describe('CONTEND classification', () => {
    it('should classify as CONTEND when adding vets and dropping youth', () => {
      const signals: StrategySignals = {
        totalMoves30d: 8,
        avgAgeAdded30d: 28,
        avgAgeDropped30d: 22,
        rosterAvgAge: null,
        daysSinceLastActivity: 1,
      }

      const result = classifyTeamStrategy(signals)

      expect(result.label).toBe('CONTEND')
      expect(result.confidence).toBeGreaterThanOrEqual(0.7)
      expect(result.reason).toContain('veterans')
      expect(result.reason).toContain('championship')
    })

    it('should classify as CONTEND with moderate confidence for just adding vets', () => {
      const signals: StrategySignals = {
        totalMoves30d: 6,
        avgAgeAdded30d: 27,
        avgAgeDropped30d: 26,
        rosterAvgAge: null,
        daysSinceLastActivity: 1,
      }

      const result = classifyTeamStrategy(signals)

      expect(result.label).toBe('CONTEND')
      expect(result.confidence).toBe(0.65)
      expect(result.reason).toContain('veteran')
    })

    it('should not exceed 0.95 confidence even with huge age gap', () => {
      const signals: StrategySignals = {
        totalMoves30d: 10,
        avgAgeAdded30d: 32,
        avgAgeDropped30d: 20,
        rosterAvgAge: null,
        daysSinceLastActivity: 1,
      }

      const result = classifyTeamStrategy(signals)

      expect(result.confidence).toBeLessThanOrEqual(0.95)
    })
  })

  describe('TINKER classification', () => {
    it('should classify as TINKER for high activity with mixed ages', () => {
      const signals: StrategySignals = {
        totalMoves30d: 12,
        avgAgeAdded30d: 25,
        avgAgeDropped30d: 25,
        rosterAvgAge: null,
        daysSinceLastActivity: 1,
      }

      const result = classifyTeamStrategy(signals)

      expect(result.label).toBe('TINKER')
      expect(result.confidence).toBe(0.7)
      expect(result.reason).toContain('High activity')
      expect(result.reason).toContain('mixed')
    })

    it('should classify as TINKER for moderate activity with no clear pattern', () => {
      const signals: StrategySignals = {
        totalMoves30d: 4,
        avgAgeAdded30d: 25,
        avgAgeDropped30d: 26,
        rosterAvgAge: null,
        daysSinceLastActivity: 5,
      }

      const result = classifyTeamStrategy(signals)

      expect(result.label).toBe('TINKER')
      expect(result.confidence).toBe(0.6)
      expect(result.reason).toContain('balanced')
    })

    it('should classify as TINKER when not enough age data', () => {
      const signals: StrategySignals = {
        totalMoves30d: 3,
        avgAgeAdded30d: null,
        avgAgeDropped30d: 25,
        rosterAvgAge: null,
        daysSinceLastActivity: 2,
      }

      const result = classifyTeamStrategy(signals)

      expect(result.label).toBe('TINKER')
      expect(result.confidence).toBe(0.5)
      expect(result.reason).toContain('not enough data')
    })
  })

  describe('Edge cases', () => {
    it('should handle null days since activity gracefully', () => {
      const signals: StrategySignals = {
        totalMoves30d: 5,
        avgAgeAdded30d: 25,
        avgAgeDropped30d: 25,
        rosterAvgAge: null,
        daysSinceLastActivity: null,
      }

      const result = classifyTeamStrategy(signals)

      // Should not crash and should provide some classification
      expect(result.label).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.reason).toBeDefined()
    })

    it('should prioritize INACTIVE over other classifications', () => {
      // Even if the ages suggest rebuild, inactivity takes precedence
      const signals: StrategySignals = {
        totalMoves30d: 5,
        avgAgeAdded30d: 22,
        avgAgeDropped30d: 28,
        rosterAvgAge: null,
        daysSinceLastActivity: 25,
      }

      const result = classifyTeamStrategy(signals)

      expect(result.label).toBe('INACTIVE')
    })
  })
})

describe('daysSince', () => {
  it('should return null for null date', () => {
    expect(daysSince(null)).toBeNull()
  })

  it('should return 0 for today', () => {
    const today = new Date()
    expect(daysSince(today)).toBe(0)
  })

  it('should return correct days for past dates', () => {
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

    const result = daysSince(tenDaysAgo)
    expect(result).toBe(10)
  })

  it('should handle dates from months ago', () => {
    const twoMonthsAgo = new Date()
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60)

    const result = daysSince(twoMonthsAgo)
    expect(result).toBeGreaterThanOrEqual(59)
    expect(result).toBeLessThanOrEqual(61) // Account for month length variations
  })
})
