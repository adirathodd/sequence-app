import { BOARD_LAYOUT } from '../constants/boardLayout'
import type { Card, Cell, ChipColor, Sequence } from '../types/game'

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]] as const

/** Count consecutive chips of myColor (or FREE corners) in one direction from (r,c), not counting (r,c) itself. */
function runInDir(board: Cell[][], r: number, c: number, dr: number, dc: number, myColor: ChipColor): number {
  let count = 0
  let nr = r + dr, nc = c + dc
  while (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
    const cell = board[nr][nc]
    if (cell.card === 'FREE' || cell.chip === myColor) { count++; nr += dr; nc += dc }
    else break
  }
  return count
}

/** Returns true if this 5-cell window shares ≤1 cell with every existing same-color sequence (game rule). */
function windowIsValid(window: [number, number][], myColor: ChipColor, sequences: Sequence[]): boolean {
  return sequences.every(seq => {
    if (seq.color !== myColor) return true
    const shared = window.filter(([r, c]) => seq.cells.some(([sr, sc]) => sr === r && sc === c)).length
    return shared <= 1
  })
}

/**
 * Best (max) aligned run at (r,c) across all 4 directions, not counting (r,c) itself.
 * When sequences are provided, only counts runs where at least one 5-chip window
 * passes the overlap rule (shares ≤1 cell with any existing same-color sequence).
 */
export function maxRunAt(board: Cell[][], r: number, c: number, myColor: ChipColor, sequences: Sequence[] = []): number {
  let best = 0
  for (const [dr, dc] of DIRS) {
    const backward = runInDir(board, r, c, -dr, -dc, myColor)
    const forward = runInDir(board, r, c, dr, dc, myColor)

    if (sequences.length === 0) {
      const run = backward + forward
      if (run > best) best = run
      continue
    }

    // Build the linear run of cells through (r,c); (r,c) is at index `backward`
    const runCells: [number, number][] = []
    for (let i = -backward; i <= forward; i++) {
      runCells.push([r + dr * i, c + dc * i])
    }

    // Check all 5-chip windows that include (r,c)
    const maxStart = Math.min(backward, runCells.length - 5)
    for (let start = Math.max(0, backward - 4); start <= maxStart; start++) {
      const window = runCells.slice(start, start + 5) as [number, number][]
      if (windowIsValid(window, myColor, sequences)) {
        // Count aligned chips in this window (excludes the empty cell (r,c) itself)
        const aligned = window.filter(([wr, wc]) => !(wr === r && wc === c)).length
        if (aligned > best) best = aligned
        break
      }
    }
  }
  return best
}

export type SequencePotential = 'complete' | 'near' | null

/**
 * Returns:
 *  'complete' — placing this card would complete a 5-in-a-row (4 already aligned, valid window)
 *  'near'     — placing this card would create a 4-in-a-row (3 already aligned, valid window)
 *  null       — no notable sequence potential
 */
export function getCardPotential(card: Card, board: Cell[][], myColor: ChipColor, sequences: Sequence[] = []): SequencePotential {
  if (card.hidden || !myColor || card.rank === 'J1') return null

  let best = 0

  if (card.rank === 'J2') {
    // Wild Jack — can go on any empty non-FREE cell
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (board[r][c].card === 'FREE') continue
        if (board[r][c].chip !== null) continue

        const run = maxRunAt(board, r, c, myColor, sequences)
        if (run > best) best = run
        if (best >= 4) return 'complete'
      }
    }
  } else {
    const cardKey = `${card.rank}${card.suit}`
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (BOARD_LAYOUT[r][c] !== cardKey) continue
        if (board[r][c].chip !== null) continue

        const run = maxRunAt(board, r, c, myColor, sequences)
        if (run > best) best = run
        if (best >= 4) return 'complete'
      }
    }
  }

  if (best >= 4) return 'complete'
  if (best >= 3) return 'near'
  return null
}
