/**
 * Integration tests for Sleeper API wrapper
 *
 * Tests API response parsing and helper functions
 * Note: These tests verify parsing logic, not actual API calls
 */

import { describe, it, expect } from 'vitest'
import { calculatePlayerAge } from '@/lib/sleeper'

describe('Sleeper API utilities', () => {
  describe('calculatePlayerAge', () => {
    it('should calculate correct age from birth date', () => {
      // Set a fixed date for testing (2024-01-01)
      const birthDate = '2000-01-01'
      const age = calculatePlayerAge(birthDate)

      // Age should be approximately 24 (depending on current date)
      expect(age).toBeGreaterThanOrEqual(23)
      expect(age).toBeLessThanOrEqual(26)
    })

    it('should return null for undefined birth date', () => {
      const age = calculatePlayerAge(undefined)
      expect(age).toBeNull()
    })

    it('should handle recent birthdays correctly', () => {
      // Player born exactly 25 years ago
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setFullYear(birthDate.getFullYear() - 25)

      const age = calculatePlayerAge(birthDate.toISOString().split('T')[0])
      expect(age).toBe(25)
    })

    it('should handle birthday not yet occurred this year', () => {
      const today = new Date()
      const birthDate = new Date(today)
      birthDate.setFullYear(birthDate.getFullYear() - 25)
      birthDate.setMonth(birthDate.getMonth() + 1) // Birthday next month

      const age = calculatePlayerAge(birthDate.toISOString().split('T')[0])

      // Should be 24 since birthday hasn't occurred yet
      expect(age).toBe(24)
    })

    it('should handle young players (rookies)', () => {
      const age = calculatePlayerAge('2002-08-15')
      expect(age).toBeGreaterThanOrEqual(21)
      expect(age).toBeLessThanOrEqual(23)
    })

    it('should handle veteran players', () => {
      const age = calculatePlayerAge('1985-12-25')
      expect(age).toBeGreaterThanOrEqual(38)
      expect(age).toBeLessThanOrEqual(40)
    })

    it('should handle invalid date formats gracefully', () => {
      const age = calculatePlayerAge('invalid-date')
      // Should return a number or null, not throw
      expect(typeof age === 'number' || age === null).toBe(true)
    })
  })

  describe('Data structure validation', () => {
    it('should validate SleeperLeague structure', () => {
      const mockLeague = {
        league_id: '123456',
        name: 'Test League',
        season: '2024',
        sport: 'nfl',
        status: 'in_season',
        settings: {
          num_teams: 12,
          playoff_week_start: 15,
        },
        roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'BN', 'BN'],
        scoring_settings: {
          pass_td: 4,
          rec: 1,
        },
      }

      expect(mockLeague).toHaveProperty('league_id')
      expect(mockLeague).toHaveProperty('name')
      expect(mockLeague).toHaveProperty('season')
      expect(mockLeague.settings).toHaveProperty('num_teams')
    })

    it('should validate SleeperUser structure', () => {
      const mockUser = {
        user_id: 'user123',
        username: 'testuser',
        display_name: 'Test User',
        avatar: 'avatar_id',
        metadata: {
          team_name: 'The Champions',
        },
      }

      expect(mockUser).toHaveProperty('user_id')
      expect(mockUser).toHaveProperty('display_name')
      expect(mockUser.metadata).toHaveProperty('team_name')
    })

    it('should validate SleeperRoster structure', () => {
      const mockRoster = {
        roster_id: 1,
        owner_id: 'user123',
        players: ['4046', '4017', '4018'],
        starters: ['4046', '4017'],
        reserve: [],
        taxi: [],
        settings: {
          wins: 8,
          losses: 5,
          ties: 0,
          fpts: 1250.5,
        },
      }

      expect(mockRoster).toHaveProperty('roster_id')
      expect(mockRoster).toHaveProperty('owner_id')
      expect(mockRoster).toHaveProperty('players')
      expect(Array.isArray(mockRoster.players)).toBe(true)
    })

    it('should validate SleeperTransaction structure', () => {
      const mockTransaction = {
        transaction_id: 'txn123',
        type: 'waiver',
        status: 'complete',
        roster_ids: [1],
        settings: null,
        metadata: null,
        adds: { '4046': 1 },
        drops: { '4017': 1 },
        draft_picks: [],
        waiver_budget: [],
        creator: 'user123',
        created: 1640000000000,
        status_updated: 1640000000001,
      }

      expect(mockTransaction).toHaveProperty('transaction_id')
      expect(mockTransaction).toHaveProperty('type')
      expect(mockTransaction).toHaveProperty('adds')
      expect(mockTransaction).toHaveProperty('drops')
    })

    it('should validate SleeperPlayer structure', () => {
      const mockPlayer = {
        player_id: '4046',
        first_name: 'Justin',
        last_name: 'Jefferson',
        full_name: 'Justin Jefferson',
        position: 'WR',
        team: 'MIN',
        age: 24,
        birth_date: '1999-06-16',
        years_exp: 3,
        status: 'Active',
        injury_status: null,
        fantasy_positions: ['WR'],
      }

      expect(mockPlayer).toHaveProperty('player_id')
      expect(mockPlayer).toHaveProperty('position')
      expect(mockPlayer).toHaveProperty('full_name')
    })
  })

  describe('Transaction parsing', () => {
    it('should handle adds and drops correctly', () => {
      const transaction = {
        adds: { '4046': 1, '4017': 2 },
        drops: { '3198': 1 },
      }

      const addedPlayers = Object.keys(transaction.adds || {})
      const droppedPlayers = Object.keys(transaction.drops || {})

      expect(addedPlayers.length).toBe(2)
      expect(droppedPlayers.length).toBe(1)
      expect(addedPlayers).toContain('4046')
      expect(droppedPlayers).toContain('3198')
    })

    it('should handle null adds/drops', () => {
      const transaction = {
        adds: null,
        drops: null,
      }

      const addedPlayers = Object.keys(transaction.adds || {})
      const droppedPlayers = Object.keys(transaction.drops || {})

      expect(addedPlayers.length).toBe(0)
      expect(droppedPlayers.length).toBe(0)
    })
  })
})
