import type { Card, Cell } from '../types/game'
import { BOARD_LAYOUT } from '../constants/boardLayout'

export function isDeadCard(card: Card, board: Cell[][]): boolean {
  if (card.rank === 'J1' || card.rank === 'J2' || card.hidden) return false
  const key = `${card.rank}${card.suit}`
  const positions: [number, number][] = []
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (BOARD_LAYOUT[r][c] === key) positions.push([r, c])
    }
  }
  return positions.length > 0 && positions.every(([r, c]) => board[r][c].chip !== null)
}
