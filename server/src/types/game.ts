export type Suit = 'S' | 'H' | 'D' | 'C'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'Q' | 'K' | 'A' | 'J1' | 'J2'

export interface Card {
  suit: Suit
  rank: Rank
  twoEyed?: boolean
  hidden?: boolean
}

export type ChipColor = 'blue' | 'green' | 'red' | null

export interface Cell {
  card: Card | 'FREE'
  chip: ChipColor
  sequenceId: number | null
}

export interface LobbySlot {
  color: ChipColor
  seatIndex: number
  playerId: string | null
  playerName: string | null
  isAI: boolean
}

export interface Player {
  id: string
  name: string
  color: ChipColor
  hand: Card[]
  isAI: boolean
}

export interface Sequence {
  color: ChipColor
  cells: [number, number][]
}

export interface GameState {
  roomCode: string
  board: Cell[][]
  deck: Card[]
  discards: Card[]
  players: Player[]
  currentPlayerIndex: number
  sequences: Sequence[]
  phase: 'lobby' | 'playing' | 'ended'
  winner: ChipColor | null
  lastAction: string | null
  numTeams: 2 | 3
  playersPerTeam: number
  hostId: string
  lobbySlots: LobbySlot[]
  turnTimer: 15 | 30 | 60 | null
  sequencesToWin: 1 | 2 | 3
  turnDeadline: number | null
  hints: 'none' | 'medium' | 'full'
}

export interface PlayCardPayload {
  cardIndex: number
  targetRow?: number
  targetCol?: number
  removeRow?: number
  removeCol?: number
}

export const HIDDEN_CARD: Card = { suit: 'S', rank: '2', hidden: true }
