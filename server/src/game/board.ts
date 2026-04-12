import { Cell, Card } from '../types/game'
import { BOARD_LAYOUT } from '../constants/boardLayout'

function parseCard(str: string): Card {
  const suit = str.slice(-1) as Card['suit']
  const rank = str.slice(0, -1) as Card['rank']
  const twoEyed = rank === 'J2' ? true : undefined
  return { suit, rank, ...(twoEyed ? { twoEyed } : {}) }
}

export function initBoard(): Cell[][] {
  return BOARD_LAYOUT.map(row =>
    row.map(str => ({
      card: str === 'XX' ? 'FREE' : parseCard(str),
      chip: null,
      sequenceId: null,
    }))
  )
}

export function getBoardPositions(card: Card): [number, number][] {
  const key = `${card.rank}${card.suit}`
  const positions: [number, number][] = []
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (BOARD_LAYOUT[r][c] === key) positions.push([r, c])
    }
  }
  return positions
}
