import { describe, it, expect } from 'vitest'
import { BOARD_LAYOUT } from './boardLayout'

describe('BOARD_LAYOUT', () => {
  it('is a 10x10 grid', () => {
    expect(BOARD_LAYOUT).toHaveLength(10)
    expect(BOARD_LAYOUT.every(row => row.length === 10)).toBe(true)
  })

  it('has exactly 4 FREE corners', () => {
    const free = BOARD_LAYOUT.flat().filter(c => c === 'XX')
    expect(free).toHaveLength(4)
  })

  it('FREE corners are at the four corners', () => {
    expect(BOARD_LAYOUT[0][0]).toBe('XX')
    expect(BOARD_LAYOUT[0][9]).toBe('XX')
    expect(BOARD_LAYOUT[9][0]).toBe('XX')
    expect(BOARD_LAYOUT[9][9]).toBe('XX')
  })

  it('has 96 non-FREE cells', () => {
    const nonFree = BOARD_LAYOUT.flat().filter(c => c !== 'XX')
    expect(nonFree).toHaveLength(96)
  })

  it('every non-Jack card appears exactly twice', () => {
    const counts: Record<string, number> = {}
    for (const cell of BOARD_LAYOUT.flat()) {
      if (cell === 'XX') continue
      counts[cell] = (counts[cell] ?? 0) + 1
    }
    const suits = ['S', 'H', 'D', 'C']
    const ranks = ['2','3','4','5','6','7','8','9','T','Q','K','A']
    for (const r of ranks) {
      for (const s of suits) {
        expect(counts[`${r}${s}`]).toBe(2)
      }
    }
  })

  it('no Jacks appear on the board', () => {
    const jacks = BOARD_LAYOUT.flat().filter(c => c.startsWith('J'))
    expect(jacks).toHaveLength(0)
  })
})
