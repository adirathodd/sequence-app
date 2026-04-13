import { Server, Socket } from 'socket.io'
import { GameState, PlayCardPayload, ChipColor, LobbySlot, Player } from '../types/game'
import { createDeck, shuffle, deal, reshuffleDiscards } from '../game/deck'
import { initBoard } from '../game/board'
import { isDeadCard, validateTurn, applyChipPlacement, removeChip } from '../game/rules'
import { detectNewSequences, lockSequences } from '../game/sequenceDetector'
import { chooseAIMove } from '../game/ai'

const rooms = new Map<string, GameState>()
const socketToRoom = new Map<string, string>()
// token → { socketId (current player id in state), roomCode }
const rejoinTokens = new Map<string, { socketId: string; roomCode: string }>()
// old socketId → grace period timeout handle
const disconnectTimers = new Map<string, NodeJS.Timeout>()
// roomCode → turn timer timeout handle
const turnTimerHandles = new Map<string, NodeJS.Timeout>()

const TEAM_COLORS: ChipColor[] = ['blue', 'green', 'red']
const GRACE_PERIOD_MS = 60 * 1000

const RANK_NAMES: Record<string, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', 'T': '10',
  'Q': 'Queen', 'K': 'King', 'A': 'Ace',
  'J1': 'One-eyed Jack', 'J2': 'Two-eyed Jack',
}
const SUIT_NAMES: Record<string, string> = {
  S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs',
}

function formatCard(rank: string, suit: string): string {
  const rankName = RANK_NAMES[rank] ?? rank
  if (rank === 'J1' || rank === 'J2') return rankName
  return `${rankName} of ${SUIT_NAMES[suit] ?? suit}`
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return rooms.has(code) ? generateRoomCode() : code
}

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let t = ''
  for (let i = 0; i < 20; i++) t += chars[Math.floor(Math.random() * chars.length)]
  return t
}

function issueRejoinToken(socketId: string, roomCode: string): string {
  // Revoke any existing token for this socket
  for (const [t, info] of rejoinTokens.entries()) {
    if (info.socketId === socketId) { rejoinTokens.delete(t); break }
  }
  const token = generateToken()
  rejoinTokens.set(token, { socketId, roomCode })
  return token
}

function handSize(totalPlayers: number): number {
  if (totalPlayers <= 2) return 7
  if (totalPlayers <= 4) return 6
  if (totalPlayers <= 6) return 5
  return 4
}

function buildTurnOrder(slots: LobbySlot[], numTeams: number, playersPerTeam: number): Player[] {
  const players: Player[] = []
  for (let seat = 0; seat < playersPerTeam; seat++) {
    for (let team = 0; team < numTeams; team++) {
      const slot = slots[team * playersPerTeam + seat]
      if (!slot) continue
      players.push({
        id: slot.isAI ? `ai-${slot.color}-${seat}` : slot.playerId!,
        name: slot.playerName ?? 'AI',
        color: slot.color,
        hand: [],
        isAI: slot.isAI,
      })
    }
  }
  return players
}

function buildPlayerView(state: GameState, forSocketId: string): GameState {
  return {
    ...state,
    players: state.players.map(p => ({
      ...p,
      hand: p.id === forSocketId || p.isAI
        ? p.hand
        : p.hand.map(() => ({ suit: 'S' as const, rank: '2' as const, hidden: true })),
    })),
  }
}

function broadcastState(state: GameState, io: Server): void {
  for (const player of state.players) {
    if (!player.isAI) {
      io.to(player.id).emit('game:state', buildPlayerView(state, player.id))
    }
  }
}

function broadcastLobbyState(state: GameState, io: Server): void {
  io.to(state.roomCode).emit('room:lobbyState', {
    slots: state.lobbySlots,
    hostId: state.hostId,
    numTeams: state.numTeams,
    playersPerTeam: state.playersPerTeam,
    turnTimer: state.turnTimer,
    sequencesToWin: state.sequencesToWin,
    hints: state.hints,
  })
}

// ── Turn timer ────────────────────────────────────────────────────────────────

function clearTurnTimer(roomCode: string): void {
  const h = turnTimerHandles.get(roomCode)
  if (h) { clearTimeout(h); turnTimerHandles.delete(roomCode) }
}

function setTurnTimer(state: GameState, io: Server): void {
  clearTurnTimer(state.roomCode)
  if (!state.turnTimer || state.phase !== 'playing') return

  const playerIndex = state.currentPlayerIndex
  state.turnDeadline = Date.now() + state.turnTimer * 1000

  const h = setTimeout(() => {
    turnTimerHandles.delete(state.roomCode)
    state.turnDeadline = null
    autoPlay(state, playerIndex, io)
  }, state.turnTimer * 1000)
  turnTimerHandles.set(state.roomCode, h)
}

// Auto-play on timer expiry (also used for timed-out human players)
function autoPlay(state: GameState, playerIndex: number, io: Server): void {
  if (state.phase !== 'playing' || state.currentPlayerIndex !== playerIndex) return
  const player = state.players[playerIndex]
  const deadIdx = player.hand.findIndex(c => isDeadCard(c, state.board))
  if (deadIdx !== -1) {
    handleDeadCard(state, playerIndex, deadIdx, io)
    return
  }
  const payload = chooseAIMove(state, playerIndex)
  applyPlay(state, playerIndex, payload, io)
}

// ── Core game flow ────────────────────────────────────────────────────────────

function startGame(state: GameState, io: Server): void {
  const hSize = handSize(state.players.length)
  let deck = shuffle(createDeck())
  for (let i = 0; i < state.players.length; i++) {
    const { hand, remaining } = deal(deck, hSize)
    state.players[i].hand = hand
    deck = remaining
  }
  state.deck = deck
  state.board = initBoard()
  state.currentPlayerIndex = Math.floor(Math.random() * state.players.length)
  state.phase = 'playing'
  state.sequences = []
  state.winner = null
  state.lastAction = 'Game started!'
  state.lobbySlots = []
  state.turnDeadline = null

  broadcastState(state, io)
  setTurnTimer(state, io)

  if (state.players[state.currentPlayerIndex].isAI) {
    setTimeout(() => runAITurn(state, io), 800)
  }
}

function drawCard(state: GameState, playerIndex: number): void {
  if (state.deck.length === 0) {
    state.deck = reshuffleDiscards(state.discards)
    state.discards = []
  }
  if (state.deck.length > 0) state.players[playerIndex].hand.push(state.deck.shift()!)
}

function advanceTurn(state: GameState, io: Server): void {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length
  broadcastState(state, io)
  if (state.phase !== 'playing') return
  setTurnTimer(state, io)
  if (state.players[state.currentPlayerIndex].isAI) {
    setTimeout(() => runAITurn(state, io), 800)
  }
}

function applyPlay(state: GameState, playerIndex: number, payload: PlayCardPayload, io: Server): void {
  clearTurnTimer(state.roomCode)
  state.turnDeadline = null

  const player = state.players[playerIndex]
  const card = player.hand[payload.cardIndex]
  player.hand.splice(payload.cardIndex, 1)
  state.discards.push(card)

  const cardName = formatCard(card.rank, card.suit)
  let actionMsg = `${player.name} played ${cardName}`

  if (card.rank === 'J1' && payload.removeRow !== undefined && payload.removeCol !== undefined) {
    state.board = removeChip(state.board, payload.removeRow, payload.removeCol)
    actionMsg = `${player.name} played a One-eyed Jack and removed an opponent's chip`
  } else if (payload.targetRow !== undefined && payload.targetCol !== undefined) {
    state.board = applyChipPlacement(state.board, payload.targetRow, payload.targetCol, player.color)

    const newSeqs = detectNewSequences(
      state.board, player.color, payload.targetRow, payload.targetCol, state.sequences
    )
    if (newSeqs.length > 0) {
      state.sequences = [...state.sequences, ...newSeqs]
      state.board = lockSequences(state.board, state.sequences)
      actionMsg += ` — Sequence!`

      if (state.sequences.filter(s => s.color === player.color).length >= state.sequencesToWin) {
        state.winner = player.color
        state.phase = 'ended'
        state.lastAction = `${player.name} wins with ${state.sequencesToWin} sequence${state.sequencesToWin > 1 ? 's' : ''}!`
        drawCard(state, playerIndex)
        broadcastState(state, io)
        return
      }
    }
  }

  drawCard(state, playerIndex)
  state.lastAction = actionMsg
  advanceTurn(state, io)
}

function runAITurn(state: GameState, io: Server): void {
  if (state.phase !== 'playing') return
  const aiIndex = state.players.findIndex(
    p => p.isAI && p.id === state.players[state.currentPlayerIndex].id
  )
  if (aiIndex === -1 || aiIndex !== state.currentPlayerIndex) return

  const payload = chooseAIMove(state, aiIndex)
  const card = state.players[aiIndex].hand[payload.cardIndex]
  if (isDeadCard(card, state.board)) {
    handleDeadCard(state, aiIndex, payload.cardIndex, io)
    return
  }
  applyPlay(state, aiIndex, payload, io)
}

function handleDeadCard(state: GameState, playerIndex: number, cardIndex: number, io: Server): void {
  clearTurnTimer(state.roomCode)
  state.turnDeadline = null

  const player = state.players[playerIndex]
  const card = player.hand[cardIndex]
  state.discards.push(card)
  player.hand.splice(cardIndex, 1)

  if (state.deck.length === 0) {
    state.deck = reshuffleDiscards(state.discards)
    state.discards = []
  }
  drawCard(state, playerIndex)
  state.lastAction = `${player.name} exchanged a dead card (${formatCard(card.rank, card.suit)})`
  advanceTurn(state, io)
}

function resolveQuit(state: GameState, quitterSocketId: string): void {
  const quitter = state.players.find(p => p.id === quitterSocketId)
  if (!quitter) return

  state.phase = 'ended'
  const quitterColor = quitter.color
  const remainingColors = [...new Set(
    state.players
      .filter(p => p.color !== quitterColor)
      .map(p => p.color)
      .filter((c): c is Exclude<ChipColor, null> => c !== null)
  )]

  if (remainingColors.length === 1) {
    state.winner = remainingColors[0]
    state.lastAction = `${quitter.name} left — ${remainingColors[0]} team wins!`
  } else {
    state.winner = null
    state.lastAction = `${quitter.name} left the game`
  }
}

// ── Socket handlers ───────────────────────────────────────────────────────────

export function registerHandlers(socket: Socket, io: Server): void {

  socket.on('room:create', ({ playerName, numTeams, playersPerTeam, turnTimer, sequencesToWin, hints }: {
    playerName: string
    numTeams: 2 | 3
    playersPerTeam: number
    turnTimer: 15 | 30 | 60 | null
    sequencesToWin: 1 | 2 | 3
    hints: 'none' | 'medium' | 'full'
  }) => {
    const roomCode = generateRoomCode()
    const lobbySlots: LobbySlot[] = []
    for (let t = 0; t < numTeams; t++) {
      for (let s = 0; s < playersPerTeam; s++) {
        lobbySlots.push({
          color: TEAM_COLORS[t],
          seatIndex: s,
          playerId: t === 0 && s === 0 ? socket.id : null,
          playerName: t === 0 && s === 0 ? playerName : null,
          isAI: false,
        })
      }
    }

    const state: GameState = {
      roomCode, board: initBoard(), deck: [], discards: [], players: [],
      currentPlayerIndex: 0, sequences: [], phase: 'lobby', winner: null,
      lastAction: null, numTeams, playersPerTeam, hostId: socket.id,
      lobbySlots, turnTimer, sequencesToWin: sequencesToWin ?? 2,
      turnDeadline: null, hints: hints ?? 'full',
    }

    rooms.set(roomCode, state)
    socketToRoom.set(socket.id, roomCode)
    socket.join(roomCode)
    const token = issueRejoinToken(socket.id, roomCode)
    socket.emit('room:joined', { roomCode, playerId: socket.id, color: 'blue', rejoinToken: token })
    broadcastLobbyState(state, io)
  })

  socket.on('room:join', ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
    const state = rooms.get(roomCode)
    if (!state) { socket.emit('game:error', { message: 'Room not found' }); return }
    if (state.phase !== 'lobby') { socket.emit('game:error', { message: 'Game already started' }); return }

    const slot = state.lobbySlots.find(s => !s.isAI && s.playerId === null)
    if (!slot) { socket.emit('game:error', { message: 'Room is full' }); return }

    slot.playerId = socket.id
    slot.playerName = playerName
    socketToRoom.set(socket.id, roomCode)
    socket.join(roomCode)
    const token = issueRejoinToken(socket.id, roomCode)
    socket.emit('room:joined', { roomCode, playerId: socket.id, color: slot.color, rejoinToken: token })
    broadcastLobbyState(state, io)
  })

  socket.on('room:switchSlot', ({ slotIndex }: { slotIndex: number }) => {
    const roomCode = socketToRoom.get(socket.id)
    if (!roomCode) return
    const state = rooms.get(roomCode)
    if (!state || state.phase !== 'lobby') return

    const targetSlot = state.lobbySlots[slotIndex]
    if (!targetSlot || targetSlot.playerId !== null || targetSlot.isAI) {
      socket.emit('game:error', { message: 'That slot is not available' })
      return
    }

    const currentSlot = state.lobbySlots.find(s => s.playerId === socket.id)
    if (!currentSlot) return

    targetSlot.playerId = socket.id
    targetSlot.playerName = currentSlot.playerName
    currentSlot.playerId = null
    currentSlot.playerName = null

    socket.emit('room:joined', { roomCode, playerId: socket.id, color: targetSlot.color })
    broadcastLobbyState(state, io)
  })

  socket.on('room:setAI', ({ slotIndex }: { slotIndex: number }) => {
    const roomCode = socketToRoom.get(socket.id)
    if (!roomCode) return
    const state = rooms.get(roomCode)
    if (!state || state.phase !== 'lobby' || state.hostId !== socket.id) return

    const slot = state.lobbySlots[slotIndex]
    if (!slot || slot.playerId !== null) return

    slot.isAI = !slot.isAI
    broadcastLobbyState(state, io)
  })

  socket.on('room:startGame', () => {
    const roomCode = socketToRoom.get(socket.id)
    if (!roomCode) return
    const state = rooms.get(roomCode)
    if (!state || state.phase !== 'lobby' || state.hostId !== socket.id) return

    const unfilled = state.lobbySlots.filter(s => !s.isAI && s.playerId === null)
    if (unfilled.length > 0) {
      socket.emit('game:error', { message: `${unfilled.length} slot(s) still need players or AI` })
      return
    }

    state.players = buildTurnOrder(state.lobbySlots, state.numTeams, state.playersPerTeam)
    startGame(state, io)
  })

  socket.on('room:returnToLobby', () => {
    const roomCode = socketToRoom.get(socket.id)
    if (!roomCode) return
    const state = rooms.get(roomCode)
    if (!state || state.phase !== 'ended' || state.hostId !== socket.id) return

    // Cancel any lingering disconnect grace timers
    for (const player of state.players) {
      const h = disconnectTimers.get(player.id)
      if (h) { clearTimeout(h); disconnectTimers.delete(player.id) }
    }
    clearTurnTimer(roomCode)

    // Rebuild lobbySlots from current players, preserving teams and AI flags
    const newSlots: LobbySlot[] = []
    for (let t = 0; t < state.numTeams; t++) {
      const teamColor = TEAM_COLORS[t]
      const teamPlayers = state.players.filter(p => p.color === teamColor)
      for (let s = 0; s < state.playersPerTeam; s++) {
        const player = teamPlayers[s]
        if (player) {
          newSlots.push({
            color: teamColor,
            seatIndex: s,
            playerId: player.isAI ? null : player.id,
            playerName: player.isAI ? null : player.name,
            isAI: player.isAI,
          })
        } else {
          newSlots.push({ color: teamColor, seatIndex: s, playerId: null, playerName: null, isAI: false })
        }
      }
    }

    // Reset to lobby state
    state.lobbySlots = newSlots
    state.players = []
    state.board = initBoard()
    state.deck = []
    state.discards = []
    state.currentPlayerIndex = 0
    state.sequences = []
    state.winner = null
    state.lastAction = null
    state.turnDeadline = null
    state.phase = 'lobby'

    broadcastLobbyState(state, io)
  })

  socket.on('room:rejoin', ({ token }: { token: string }) => {
    const info = rejoinTokens.get(token)
    if (!info) return  // silently ignore expired / stale tokens

    const state = rooms.get(info.roomCode)
    if (!state || state.phase !== 'playing') return

    const player = state.players.find(p => p.id === info.socketId)
    if (!player) return

    // Cancel grace period
    const h = disconnectTimers.get(info.socketId)
    if (h) { clearTimeout(h); disconnectTimers.delete(info.socketId) }

    // Swap socket references
    const oldId = info.socketId
    player.id = socket.id
    socketToRoom.delete(oldId)
    socketToRoom.set(socket.id, info.roomCode)
    socket.join(info.roomCode)

    // Issue fresh token
    const newToken = issueRejoinToken(socket.id, info.roomCode)

    socket.emit('room:joined', {
      roomCode: info.roomCode,
      playerId: socket.id,
      color: player.color,
      rejoinToken: newToken,
    })
    state.lastAction = `${player.name} reconnected`
    broadcastState(state, io)
  })

  socket.on('game:startVsAI', ({ playerName }: { playerName: string }) => {
    const roomCode = generateRoomCode()
    const human: Player = { id: socket.id, name: playerName, color: 'blue', hand: [], isAI: false }
    const bot: Player = { id: 'ai-green-0', name: 'AI', color: 'green', hand: [], isAI: true }
    const state: GameState = {
      roomCode, board: initBoard(), deck: [], discards: [],
      players: [human, bot], currentPlayerIndex: 0, sequences: [],
      phase: 'lobby', winner: null, lastAction: null,
      numTeams: 2, playersPerTeam: 1, hostId: socket.id,
      lobbySlots: [], turnTimer: null, sequencesToWin: 2, turnDeadline: null,
      hints: 'full',
    }
    rooms.set(roomCode, state)
    socketToRoom.set(socket.id, roomCode)
    socket.join(roomCode)
    const token = issueRejoinToken(socket.id, roomCode)
    socket.emit('room:joined', { roomCode, playerId: socket.id, color: 'blue', rejoinToken: token })
    startGame(state, io)
  })

  socket.on('turn:playCard', (payload: PlayCardPayload) => {
    const roomCode = socketToRoom.get(socket.id)
    if (!roomCode) return
    const state = rooms.get(roomCode)
    if (!state || state.phase !== 'playing') return

    const playerIndex = state.players.findIndex(p => p.id === socket.id)
    const result = validateTurn(payload, playerIndex, state)
    if (!result.valid) {
      socket.emit('game:error', { message: result.error ?? 'Invalid move' })
      return
    }
    applyPlay(state, playerIndex, payload, io)
  })

  socket.on('turn:deadCard', ({ cardIndex }: { cardIndex: number }) => {
    const roomCode = socketToRoom.get(socket.id)
    if (!roomCode) return
    const state = rooms.get(roomCode)
    if (!state || state.phase !== 'playing') return

    const playerIndex = state.players.findIndex(p => p.id === socket.id)
    if (playerIndex !== state.currentPlayerIndex) {
      socket.emit('game:error', { message: 'Not your turn' })
      return
    }
    const card = state.players[playerIndex].hand[cardIndex]
    if (!isDeadCard(card, state.board)) {
      socket.emit('game:error', { message: 'That card is not dead' })
      return
    }
    handleDeadCard(state, playerIndex, cardIndex, io)
  })

  socket.on('room:updateRules', ({ numTeams, playersPerTeam, turnTimer, sequencesToWin, hints }: {
    numTeams: 2 | 3
    playersPerTeam: number
    turnTimer: 15 | 30 | 60 | null
    sequencesToWin: 1 | 2 | 3
    hints: 'none' | 'medium' | 'full'
  }) => {
    const roomCode = socketToRoom.get(socket.id)
    if (!roomCode) return
    const state = rooms.get(roomCode)
    if (!state || state.phase !== 'lobby' || state.hostId !== socket.id) return

    state.turnTimer = turnTimer
    state.sequencesToWin = sequencesToWin
    state.hints = hints

    if (state.numTeams !== numTeams || state.playersPerTeam !== playersPerTeam) {
      // Collect existing human players in order
      const humans = state.lobbySlots
        .filter(s => s.playerId !== null)
        .map(s => ({ playerId: s.playerId!, playerName: s.playerName! }))

      // Rebuild slots
      state.lobbySlots = []
      for (let t = 0; t < numTeams; t++) {
        for (let s = 0; s < playersPerTeam; s++) {
          state.lobbySlots.push({ color: TEAM_COLORS[t], seatIndex: s, playerId: null, playerName: null, isAI: false })
        }
      }

      // Re-assign humans in order (host always first)
      for (let i = 0; i < humans.length && i < state.lobbySlots.length; i++) {
        state.lobbySlots[i].playerId = humans[i].playerId
        state.lobbySlots[i].playerName = humans[i].playerName
      }

      state.numTeams = numTeams
      state.playersPerTeam = playersPerTeam
    }

    broadcastLobbyState(state, io)
  })

  socket.on('player:rename', ({ name }: { name: string }) => {
    const trimmed = name.trim().slice(0, 20)
    if (!trimmed) return
    const roomCode = socketToRoom.get(socket.id)
    if (!roomCode) return
    const state = rooms.get(roomCode)
    if (!state) return

    if (state.phase === 'lobby') {
      const slot = state.lobbySlots.find(s => s.playerId === socket.id)
      if (slot) { slot.playerName = trimmed }
      broadcastLobbyState(state, io)
    } else {
      const player = state.players.find(p => p.id === socket.id)
      if (player) { player.name = trimmed }
      broadcastState(state, io)
    }
  })

  socket.on('game:quit', () => {
    const roomCode = socketToRoom.get(socket.id)
    if (!roomCode) return
    const state = rooms.get(roomCode)
    if (!state) return

    if (state.phase === 'lobby') {
      const slot = state.lobbySlots.find(s => s.playerId === socket.id)
      if (slot) { slot.playerId = null; slot.playerName = null }
      if (state.hostId === socket.id) {
        io.to(roomCode).emit('game:error', { message: 'Host left the room' })
        rooms.delete(roomCode)
      } else {
        broadcastLobbyState(state, io)
      }
    } else if (state.phase === 'playing') {
      clearTurnTimer(roomCode)
      resolveQuit(state, socket.id)
      for (const player of state.players) {
        if (!player.isAI && player.id !== socket.id) {
          io.to(player.id).emit('game:state', buildPlayerView(state, player.id))
        }
      }
      rooms.delete(roomCode)
    } else if (state.phase === 'ended') {
      rooms.delete(roomCode)
    }

    socketToRoom.delete(socket.id)
    socket.leave(roomCode)
  })

  socket.on('disconnect', () => {
    const roomCode = socketToRoom.get(socket.id)
    if (!roomCode) return

    socketToRoom.delete(socket.id)
    const state = rooms.get(roomCode)
    if (!state) return

    if (state.phase === 'lobby') {
      const slot = state.lobbySlots.find(s => s.playerId === socket.id)
      if (slot) { slot.playerId = null; slot.playerName = null }
      if (state.hostId === socket.id) {
        io.to(roomCode).emit('game:error', { message: 'Host disconnected' })
        rooms.delete(roomCode)
      } else {
        broadcastLobbyState(state, io)
      }
    } else if (state.phase === 'playing') {
      const player = state.players.find(p => p.id === socket.id)
      if (!player) return

      // Notify others but keep game alive during grace period
      state.lastAction = `${player.name} disconnected — 60s to reconnect`
      broadcastState(state, io)

      const handle = setTimeout(() => {
        disconnectTimers.delete(socket.id)
        // Remove stale rejoin token
        for (const [t, info] of rejoinTokens.entries()) {
          if (info.socketId === socket.id) { rejoinTokens.delete(t); break }
        }
        const currentState = rooms.get(roomCode)
        if (currentState && currentState.phase === 'playing') {
          clearTurnTimer(roomCode)
          resolveQuit(currentState, socket.id)
          broadcastState(currentState, io)
          rooms.delete(roomCode)
        }
      }, GRACE_PERIOD_MS)
      disconnectTimers.set(socket.id, handle)
    }
  })
}
