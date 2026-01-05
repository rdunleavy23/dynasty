/**
 * Unit tests for positional needs analysis
 *
 * Tests positional state classification: DESPERATE, THIN, STABLE, HOARDING
 */

import { describe, it, expect } from 'vitest'
import {
  classifyPositionState,
  buildPositionalProfile,
  countRosterByPosition,
} from '@/lib/analysis/positions'
import type { PositionalInputs, RosterCountsMap } from '@/types'

describe('classifyPositionState', () => {
  describe('DESPERATE classification', () => {
    it('should classify QB as DESPERATE with 3+ waiver adds in 21 days', () => {
      const inputs: PositionalInputs = {
        position: 'QB',
        starters: 1,
        bench: 2,
        waiverAdds21d: 3,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('DESPERATE')
    })

    it('should classify RB as DESPERATE with thin bench and 2 adds', () => {
      const inputs: PositionalInputs = {
        position: 'RB',
        starters: 2,
        bench: 1,
        waiverAdds21d: 2,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('DESPERATE')
    })

    it('should classify WR as DESPERATE with high waiver activity', () => {
      const inputs: PositionalInputs = {
        position: 'WR',
        starters: 3,
        bench: 3,
        waiverAdds21d: 4,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('DESPERATE')
    })
  })

  describe('THIN classification', () => {
    it('should classify QB as THIN with bench < 1', () => {
      const inputs: PositionalInputs = {
        position: 'QB',
        starters: 1,
        bench: 0,
        waiverAdds21d: 0,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('THIN')
    })

    it('should classify RB as THIN with bench < 2', () => {
      const inputs: PositionalInputs = {
        position: 'RB',
        starters: 2,
        bench: 1,
        waiverAdds21d: 1,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('THIN')
    })

    it('should classify WR as THIN with low bench depth', () => {
      const inputs: PositionalInputs = {
        position: 'WR',
        starters: 3,
        bench: 1,
        waiverAdds21d: 0,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('THIN')
    })

    it('should classify TE as THIN with no bench', () => {
      const inputs: PositionalInputs = {
        position: 'TE',
        starters: 1,
        bench: 0,
        waiverAdds21d: 1,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('THIN')
    })
  })

  describe('HOARDING classification', () => {
    it('should classify QB as HOARDING with bench >= 3', () => {
      const inputs: PositionalInputs = {
        position: 'QB',
        starters: 1,
        bench: 3,
        waiverAdds21d: 0,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('HOARDING')
    })

    it('should classify RB as HOARDING with bench >= 5', () => {
      const inputs: PositionalInputs = {
        position: 'RB',
        starters: 2,
        bench: 5,
        waiverAdds21d: 0,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('HOARDING')
    })

    it('should classify WR as HOARDING with deep bench', () => {
      const inputs: PositionalInputs = {
        position: 'WR',
        starters: 3,
        bench: 7,
        waiverAdds21d: 0,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('HOARDING')
    })

    it('should classify TE as HOARDING with bench >= 3', () => {
      const inputs: PositionalInputs = {
        position: 'TE',
        starters: 1,
        bench: 4,
        waiverAdds21d: 0,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('HOARDING')
    })
  })

  describe('STABLE classification', () => {
    it('should classify QB as STABLE with adequate depth', () => {
      const inputs: PositionalInputs = {
        position: 'QB',
        starters: 1,
        bench: 2,
        waiverAdds21d: 0,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('STABLE')
    })

    it('should classify RB as STABLE with good bench depth', () => {
      const inputs: PositionalInputs = {
        position: 'RB',
        starters: 2,
        bench: 3,
        waiverAdds21d: 1,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('STABLE')
    })

    it('should classify WR as STABLE with balanced roster', () => {
      const inputs: PositionalInputs = {
        position: 'WR',
        starters: 3,
        bench: 4,
        waiverAdds21d: 0,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('STABLE')
    })
  })

  describe('Priority of classifications', () => {
    it('should prioritize DESPERATE over THIN even with low bench', () => {
      const inputs: PositionalInputs = {
        position: 'RB',
        starters: 2,
        bench: 0,
        waiverAdds21d: 3,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('DESPERATE')
    })

    it('should not classify as DESPERATE if waiver adds below threshold', () => {
      const inputs: PositionalInputs = {
        position: 'WR',
        starters: 3,
        bench: 1,
        waiverAdds21d: 1,
      }

      const result = classifyPositionState(inputs)
      expect(result).toBe('THIN')
    })
  })
})

describe('buildPositionalProfile', () => {
  it('should build complete profile for all positions', () => {
    const rosterCounts: RosterCountsMap = {
      QB: { starters: 1, bench: 2 },
      RB: { starters: 2, bench: 1 },
      WR: { starters: 3, bench: 6 },
      TE: { starters: 1, bench: 0 },
    }

    const waiverAddsByPosition = {
      QB: 0,
      RB: 3,
      WR: 0,
      TE: 1,
    }

    const profile = buildPositionalProfile(rosterCounts, waiverAddsByPosition)

    expect(profile.QB).toBe('STABLE')
    expect(profile.RB).toBe('DESPERATE')
    expect(profile.WR).toBe('HOARDING')
    expect(profile.TE).toBe('THIN')
  })

  it('should handle missing waiver data gracefully', () => {
    const rosterCounts: RosterCountsMap = {
      QB: { starters: 1, bench: 2 },
      RB: { starters: 2, bench: 3 },
      WR: { starters: 3, bench: 4 },
      TE: { starters: 1, bench: 1 },
    }

    const waiverAddsByPosition = {} // No waiver data

    const profile = buildPositionalProfile(rosterCounts, waiverAddsByPosition)

    // Should classify based on bench depth alone
    expect(profile.QB).toBe('STABLE')
    expect(profile.RB).toBe('STABLE')
    expect(profile.WR).toBe('STABLE')
    expect(profile.TE).toBe('STABLE')
  })
})

describe('countRosterByPosition', () => {
  it('should count starters and bench correctly', () => {
    const players = [
      { position: 'QB', isStarter: true },
      { position: 'QB', isStarter: false },
      { position: 'RB', isStarter: true },
      { position: 'RB', isStarter: true },
      { position: 'RB', isStarter: false },
      { position: 'RB', isStarter: false },
      { position: 'RB', isStarter: false },
      { position: 'WR', isStarter: true },
      { position: 'WR', isStarter: true },
      { position: 'WR', isStarter: true },
      { position: 'WR', isStarter: false },
      { position: 'TE', isStarter: true },
    ]

    const counts = countRosterByPosition(players)

    expect(counts.QB).toEqual({ starters: 1, bench: 1 })
    expect(counts.RB).toEqual({ starters: 2, bench: 3 })
    expect(counts.WR).toEqual({ starters: 3, bench: 1 })
    expect(counts.TE).toEqual({ starters: 1, bench: 0 })
  })

  it('should initialize all positions even if empty', () => {
    const players: Array<{ position: string; isStarter: boolean }> = []

    const counts = countRosterByPosition(players)

    expect(counts.QB).toEqual({ starters: 0, bench: 0 })
    expect(counts.RB).toEqual({ starters: 0, bench: 0 })
    expect(counts.WR).toEqual({ starters: 0, bench: 0 })
    expect(counts.TE).toEqual({ starters: 0, bench: 0 })
  })

  it('should handle non-standard positions', () => {
    const players = [
      { position: 'QB', isStarter: true },
      { position: 'DEF', isStarter: true },
      { position: 'K', isStarter: true },
    ]

    const counts = countRosterByPosition(players)

    expect(counts.QB).toEqual({ starters: 1, bench: 0 })
    expect(counts.DEF).toEqual({ starters: 1, bench: 0 })
    expect(counts.K).toEqual({ starters: 1, bench: 0 })
  })
})
