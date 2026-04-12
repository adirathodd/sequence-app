import { GameState, PlayCardPayload, ChipColor, Cell } from '../types/game'
import { isDeadCard } from './rules'
import { getBoardPositions } from './board'
import { applyChipPlacement } from './rules'
import { detectNewSequences } from './sequenceDetector'

function countAlignedNeighbors(
  board: Cell[][],
  row: number,
  col: number,
  color: ChipColor
): number {
  const DIRS: [number, number][] = [[0,1],[1,0],[1,1],[1,-1]]
  let max = 0
  for (const [dr, dc] of DIRS) {
    let count = 0
    for (let i = -4; i <= 4; i++) {
      const r = row + dr * i
      const c = col + dc * i
      if (r < 0 || r >= 10 || c < 0 || c >= 10) continue
      if (board[r][c].chip === color || board[r][c].card === 'FREE') count++
      else count = 0
      if (count > max) max = count
    }
  }
  return max
}

function centerBonus(row: number, col: number): number {
  return Math.round((10 - Math.abs(row - 4.5) - Math.abs(col - 4.5)) * 3)
}

function scoreMove(
  move: PlayCardPayload,
  state: GameState,
  aiColor: ChipColor,
  oppColor: ChipColor
): number {
  let score = 0

  if (move.targetRow !== undefined && move.targetCol !== undefined) {
    const r = move.targetRow
    const c = move.targetCol
    const simBoard = applyChipPlacement(state.board, r, c, aiColor)

    // Win immediately
    const newSeqs = detectNewSequences(simBoard, aiColor, r, c, state.sequences)
    if (newSeqs.length > 0) score += 10000

    // Extend own run
    score += countAlignedNeighbors(state.board, r, c, aiColor) * 200

    // Block opponent from winning
    const oppSim = applyChipPlacement(state.board, r, c, oppColor)
    const oppSeqs = detectNewSequences(oppSim, oppColor, r, c, state.sequences)
    if (oppSeqs.length > 0) score += 8000

    // Disrupt opponent run
    score += countAlignedNeighbors(state.board, r, c, oppColor) * 150

    score += centerBonus(r, c)
  }

  if (move.removeRow !== undefined && move.removeCol !== undefined) {
    const r = move.removeRow
    const c = move.removeCol
    // Prefer removing chips that are part of long runs
    score += countAlignedNeighbors(state.board, r, c, oppColor) * 300 - 100
  }

  return score
}

export function chooseAIMove(state: GameState, aiPlayerIndex: number): PlayCardPayload {
  const ai = state.players[aiPlayerIndex]
  const aiColor = ai.color

  // All unique opponent team colors
  const oppColors = [...new Set(
    state.players
      .filter(p => p.color !== aiColor)
      .map(p => p.color)
      .filter((c): c is Exclude<ChipColor, null> => c !== null)
  )]

  // Focus on the opponent team with the most sequences (biggest threat)
  const primaryOppColor: ChipColor = oppColors.reduce<ChipColor>((best, c) => {
    if (best === null) return c
    const cSeqs = state.sequences.filter(s => s.color === c).length
    const bestSeqs = state.sequences.filter(s => s.color === best).length
    return cSeqs >= bestSeqs ? c : best
  }, oppColors[0] ?? null)

  let bestScore = -Infinity
  let bestMove: PlayCardPayload | null = null

  for (let cardIndex = 0; cardIndex < ai.hand.length; cardIndex++) {
    const card = ai.hand[cardIndex]

    // Exchange dead cards immediately
    if (isDeadCard(card, state.board)) {
      return { cardIndex }
    }

    if (card.rank === 'J2') {
      // Two-eyed Jack: try every empty cell
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cell = state.board[r][c]
          if (cell.chip !== null || cell.card === 'FREE') continue
          const move: PlayCardPayload = { cardIndex, targetRow: r, targetCol: c }
          const s = scoreMove(move, state, aiColor, primaryOppColor)
          if (s > bestScore) { bestScore = s; bestMove = move }
        }
      }
      continue
    }

    if (card.rank === 'J1') {
      // One-eyed Jack: try removing any unlocked opponent chip
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cell = state.board[r][c]
          const isOppChip = cell.chip !== null && cell.chip !== aiColor
          if (!isOppChip || cell.sequenceId !== null) continue
          const move: PlayCardPayload = { cardIndex, removeRow: r, removeCol: c }
          const s = scoreMove(move, state, aiColor, cell.chip)
          if (s > bestScore) { bestScore = s; bestMove = move }
        }
      }
      continue
    }

    // Normal card: try valid positions
    const positions = getBoardPositions(card)
    for (const [r, c] of positions) {
      if (state.board[r][c].chip !== null) continue
      const move: PlayCardPayload = { cardIndex, targetRow: r, targetCol: c }
      const s = scoreMove(move, state, aiColor, primaryOppColor)
      if (s > bestScore) { bestScore = s; bestMove = move }
    }
  }

  return bestMove ?? { cardIndex: 0 }
}
