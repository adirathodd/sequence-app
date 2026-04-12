import { describe, it, expect } from 'vitest'
import { detectNewSequences, lockSequences } from './sequenceDetector'
import { initBoard } from './board'
import { applyChipPlacement } from './rules'
import { Cell } from '../types/game'

function placeChips(board: Cell[][], positions: [number, number][], color: 'blue' | 'green'): Cell[][] {
  let b = board
  for (const [r, c] of positions) {
    b = applyChipPlacement(b, r, c, color)
  }
  return b
}

describe('detectNewSequences', () => {
  it('detects a horizontal sequence', () => {
    // Row 1: cols 0-4 are 6C,5C,4C,3C,2C — place blue chips on all 5
    let board = initBoard()
    const positions: [number, number][] = [[1,0],[1,1],[1,2],[1,3],[1,4]]
    board = placeChips(board, positions.slice(0, 4), 'blue')
    board = applyChipPlacement(board, 1, 4, 'blue')
    const seqs = detectNewSequences(board, 'blue', 1, 4, [])
    expect(seqs).toHaveLength(1)
    expect(seqs[0].color).toBe('blue')
    expect(seqs[0].cells).toHaveLength(5)
  })

  it('detects a vertical sequence', () => {
    // Col 0, rows 1-5: 6C,7C,8C,9C,TC
    let board = initBoard()
    const positions: [number, number][] = [[1,0],[2,0],[3,0],[4,0],[5,0]]
    board = placeChips(board, positions.slice(0, 4), 'blue')
    board = applyChipPlacement(board, 5, 0, 'blue')
    const seqs = detectNewSequences(board, 'blue', 5, 0, [])
    expect(seqs).toHaveLength(1)
  })

  it('detects a diagonal sequence', () => {
    // Diagonal ↘ starting at [1,1]: AS, 3D, 5H, 2H...
    // Use cells we know exist: [2,2],[3,3],[4,4],[5,5],[6,6]
    let board = initBoard()
    const positions: [number, number][] = [[2,2],[3,3],[4,4],[5,5],[6,6]]
    board = placeChips(board, positions.slice(0, 4), 'green')
    board = applyChipPlacement(board, 6, 6, 'green')
    const seqs = detectNewSequences(board, 'green', 6, 6, [])
    expect(seqs).toHaveLength(1)
  })

  it('FREE corner counts toward a sequence', () => {
    // Row 0: XX,2S,3S,4S,5S,6S,7S,8S,9S,XX
    // Place 4 blue chips on 2S,3S,4S,5S — corner XX at [0][0] counts
    // Sequence would be [0][0](FREE),[0][1],[0][2],[0][3],[0][4]
    let board = initBoard()
    board = placeChips(board, [[0,1],[0,2],[0,3]], 'blue')
    board = applyChipPlacement(board, 0, 4, 'blue')
    const seqs = detectNewSequences(board, 'blue', 0, 4, [])
    expect(seqs).toHaveLength(1)
    expect(seqs[0].cells).toHaveLength(5)
  })

  it('does not detect a sequence of 4', () => {
    let board = initBoard()
    board = placeChips(board, [[1,0],[1,1],[1,2]], 'blue')
    board = applyChipPlacement(board, 1, 3, 'blue')
    const seqs = detectNewSequences(board, 'blue', 1, 3, [])
    expect(seqs).toHaveLength(0)
  })

  it('rejects a new window that shares more than 1 cell with an existing sequence', () => {
    // Existing horizontal seq at row 1 cols 0-4
    let board = initBoard()
    const positions: [number, number][] = [[1,0],[1,1],[1,2],[1,3],[1,4]]
    board = placeChips(board, positions, 'blue')
    const existing = [{ color: 'blue' as const, cells: positions as [number,number][] }]
    board = lockSequences(board, existing)
    // Try to form another horizontal seq at row 1 cols 1-5 (shares 4 cells with existing)
    board = applyChipPlacement(board, 1, 5, 'blue')
    const seqs = detectNewSequences(board, 'blue', 1, 5, existing)
    expect(seqs).toHaveLength(0)
  })

  it('allows a new sequence sharing exactly 1 cell with an existing one', () => {
    // Existing horizontal seq at row 1 cols 0-4
    let board = initBoard()
    const hPositions: [number, number][] = [[1,0],[1,1],[1,2],[1,3],[1,4]]
    board = placeChips(board, hPositions, 'blue')
    const existing = [{ color: 'blue' as const, cells: hPositions as [number,number][] }]
    board = lockSequences(board, existing)
    // Build a vertical seq at col 0 rows 1-5 — shares only [1,0] with existing
    board = placeChips(board, [[2,0],[3,0],[4,0]], 'blue')
    board = applyChipPlacement(board, 5, 0, 'blue')
    const seqs = detectNewSequences(board, 'blue', 5, 0, existing)
    expect(seqs).toHaveLength(1)
  })
})

describe('lockSequences', () => {
  it('sets sequenceId on all cells in sequence', () => {
    let board = initBoard()
    const positions: [number, number][] = [[1,0],[1,1],[1,2],[1,3],[1,4]]
    board = placeChips(board, positions, 'blue')
    const sequences = [{ color: 'blue' as const, cells: positions as [number,number][] }]
    board = lockSequences(board, sequences)
    for (const [r, c] of positions) {
      expect(board[r][c].sequenceId).toBe(0)
    }
  })
})
