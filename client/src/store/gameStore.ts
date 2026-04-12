import { create } from 'zustand'
import type { GameState, Card, ChipColor, LobbySlot } from '../types/game'
import { BOARD_LAYOUT } from '../constants/boardLayout'
import { maxRunAt } from '../utils/sequenceHint'

export type HighlightMode = 'place' | 'remove' | null

interface LobbyStatePayload {
  slots: LobbySlot[]
  hostId: string
  numTeams: 2 | 3
  playersPerTeam: number
  turnTimer: 15 | 30 | 60 | null
  sequencesToWin: 1 | 2 | 3
  hintsEnabled: boolean
}

interface GameStore {
  gameState: GameState | null
  roomCode: string | null
  myPlayerId: string | null
  myColor: ChipColor
  selectedCardIndex: number | null
  highlightedCells: [number, number][]
  hintCells: Record<string, 'complete' | 'near'>
  highlightMode: HighlightMode
  pendingDeadCardIndex: number | null
  error: string | null
  lobbySlots: LobbySlot[]
  numTeams: 2 | 3
  playersPerTeam: number
  hostId: string | null
  turnTimer: 15 | 30 | 60 | null
  sequencesToWin: 1 | 2 | 3
  hintsEnabled: boolean

  setGameState: (s: GameState) => void
  setRoomInfo: (roomCode: string, playerId: string, color: ChipColor) => void
  setLobbyState: (data: LobbyStatePayload) => void
  selectCard: (index: number | null) => void
  setPendingDeadCard: (index: number | null) => void
  setError: (e: string | null) => void
  clearSelection: () => void
  resetGame: () => void
}

function getBoardPositions(card: Card): [number, number][] {
  const key = `${card.rank}${card.suit}`
  const positions: [number, number][] = []
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (BOARD_LAYOUT[r][c] === key) positions.push([r, c])
    }
  }
  return positions
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  roomCode: null,
  myPlayerId: null,
  myColor: null,
  selectedCardIndex: null,
  highlightedCells: [],
  hintCells: {},
  highlightMode: null,
  pendingDeadCardIndex: null,
  error: null,
  lobbySlots: [],
  numTeams: 2,
  playersPerTeam: 1,
  hostId: null,
  turnTimer: null,
  sequencesToWin: 2,
  hintsEnabled: true,

  setGameState: (s) => set({ gameState: s }),

  setRoomInfo: (roomCode, playerId, color) =>
    set({ roomCode, myPlayerId: playerId, myColor: color }),

  setLobbyState: (data) => set({
    lobbySlots: data.slots,
    hostId: data.hostId,
    numTeams: data.numTeams,
    playersPerTeam: data.playersPerTeam,
    turnTimer: data.turnTimer,
    sequencesToWin: data.sequencesToWin,
    hintsEnabled: data.hintsEnabled,
  }),

  selectCard: (index) => {
    const { gameState, myColor, myPlayerId } = get()
    if (index === null || !gameState) {
      set({ selectedCardIndex: null, highlightedCells: [], hintCells: {}, highlightMode: null })
      return
    }

    const me = gameState.players.find(p => p.id === myPlayerId)
    if (!me) return
    const card = me.hand[index]
    if (!card || card.hidden) return

    let highlighted: [number, number][] = []
    let highlightMode: HighlightMode = 'place'

    if (card.rank === 'J2') {
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cell = gameState.board[r][c]
          if (cell.chip === null && cell.card !== 'FREE') highlighted.push([r, c])
        }
      }
      highlightMode = 'place'
    } else if (card.rank === 'J1') {
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cell = gameState.board[r][c]
          if (cell.chip !== null && cell.chip !== myColor && cell.sequenceId === null)
            highlighted.push([r, c])
        }
      }
      highlightMode = 'remove'
    } else {
      const positions = getBoardPositions(card)
      highlighted = positions.filter(([r, c]) => gameState.board[r][c].chip === null)
      highlightMode = 'place'
    }

    // Compute sequence potential — only when hints are enabled for this room
    const hintCells: Record<string, 'complete' | 'near'> = {}
    if (highlightMode === 'place' && myColor && gameState.hintsEnabled) {
      for (const [r, c] of highlighted) {
        const run = maxRunAt(gameState.board, r, c, myColor, gameState.sequences)
        if (run >= 4) hintCells[`${r}-${c}`] = 'complete'
        else if (run >= 3) hintCells[`${r}-${c}`] = 'near'
      }
    }

    set({ selectedCardIndex: index, highlightedCells: highlighted, hintCells, highlightMode })
  },

  setPendingDeadCard: (index) => set({ pendingDeadCardIndex: index }),

  setError: (e) => set({ error: e }),

  clearSelection: () => set({ selectedCardIndex: null, highlightedCells: [], hintCells: {}, highlightMode: null }),

  resetGame: () => {
    localStorage.removeItem('sequence:rejoin')
    set({
      gameState: null,
      roomCode: null,
      myPlayerId: null,
      myColor: null,
      selectedCardIndex: null,
      highlightedCells: [],
      hintCells: {},
      highlightMode: null,
      pendingDeadCardIndex: null,
      error: null,
      lobbySlots: [],
      numTeams: 2,
      playersPerTeam: 1,
      hostId: null,
      turnTimer: null,
      sequencesToWin: 2,
      hintsEnabled: true,
    })
  },
}))
