import { BOARD_LAYOUT } from '../constants/boardLayout'
import type { Card, Cell, ChipColor } from '../types/game'

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

/** Best (max) aligned run at (r,c) across all 4 directions, not counting (r,c) itself. */
export function maxRunAt(board: Cell[][], r: number, c: number, myColor: ChipColor): number {
  let best = 0
  for (const [dr, dc] of DIRS) {
    const run = runInDir(board, r, c, dr, dc, myColor) + runInDir(board, r, c, -dr, -dc, myColor)
    if (run > best) best = run
  }
  return best
}

export type SequencePotential = 'complete' | 'near' | null

/**
 * Returns:
 *  'complete' — placing this card would complete a 5-in-a-row (4 already aligned)
 *  'near'     — placing this card would create a 4-in-a-row (3 already aligned)
 *  null       — no notable sequence potential
 */
export function getCardPotential(card: Card, board: Cell[][], myColor: ChipColor): SequencePotential {
  if (card.hidden || !myColor || card.rank === 'J1') return null

  let best = 0

  if (card.rank === 'J2') {
    // Wild Jack — can go on any empty non-FREE cell
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (board[r][c].card === 'FREE') continue
        if (board[r][c].chip !== null) continue

        const run = maxRunAt(board, r, c, myColor)
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

        const run = maxRunAt(board, r, c, myColor)
        if (run > best) best = run
        if (best >= 4) return 'complete'
      }
    }
  }

  if (best >= 4) return 'complete'
  if (best >= 3) return 'near'
  return null
}
