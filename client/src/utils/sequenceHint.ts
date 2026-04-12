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

    const mySeqs = sequences.filter(s => s.color === myColor)
    if (mySeqs.length === 0) {
      const run = backward + forward
      if (run > best) best = run
      continue
    }

    // Build the linear run of cells through (r,c), extended by 1 in each direction
    // beyond the chip run so that 5-cell windows can be formed for the "near" (run=3) case.
    const runCells: [number, number][] = []
    for (let i = -(backward + 1); i <= forward + 1; i++) {
      const nr = r + dr * i, nc = c + dc * i
      if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) runCells.push([nr, nc])
    }

    const placementIdx = runCells.findIndex(([nr, nc]) => nr === r && nc === c)

    // Check all 5-cell windows that include (r,c)
    const maxStart = Math.min(placementIdx, runCells.length - 5)
    for (let start = Math.max(0, placementIdx - 4); start <= maxStart; start++) {
      const window = runCells.slice(start, start + 5) as [number, number][]
      if (windowIsValid(window, myColor, mySeqs)) {
        // Count chips of myColor (or FREE corners) in this window, excluding (r,c) itself
        const aligned = window.filter(([wr, wc]) => {
          if (wr === r && wc === c) return false
          const cell = board[wr][wc]
          return cell.card === 'FREE' || cell.chip === myColor
        }).length
        if (aligned > best) best = aligned
      }
    }
  }
  return best
}

/**
 * Returns existing chip positions that could contribute to a sequence through (r, c).
 * Scans up to 4 steps in all 8 directional rays, collecting friendly chips (or FREE corners)
 * even across gaps — stopping only when an opponent chip blocks the line.
 */
export function getBestRunCells(
  board: Cell[][],
  r: number,
  c: number,
  myColor: ChipColor,
): [number, number][] {
  const found = new Set<string>()

  for (const [dr, dc] of DIRS) {
    for (const sign of [1, -1] as const) {
      for (let step = 1; step <= 4; step++) {
        const nr = r + dr * sign * step
        const nc = c + dc * sign * step
        if (nr < 0 || nr >= 10 || nc < 0 || nc >= 10) break
        const cell = board[nr][nc]
        if (cell.card === 'FREE' || cell.chip === myColor) {
          found.add(`${nr},${nc}`)
        } else if (cell.chip !== null) {
          break // opponent chip blocks this ray
        }
        // empty cells: continue scanning through the gap
      }
    }
  }

  return [...found].map(key => key.split(',').map(Number) as [number, number])
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
