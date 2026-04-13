import { io } from 'socket.io-client'
import type { PlayCardPayload } from '../types/game'

export const socket = io({ path: '/socket.io', autoConnect: true })

export const createRoom = (playerName: string, numTeams: 2 | 3, playersPerTeam: number, turnTimer: 15 | 30 | 60 | null, sequencesToWin: 1 | 2 | 3, hints: 'none' | 'medium' | 'full') =>
  socket.emit('room:create', { playerName, numTeams, playersPerTeam, turnTimer, sequencesToWin, hints })

export const joinRoom = (roomCode: string, playerName: string) =>
  socket.emit('room:join', { roomCode, playerName })

export const startVsAI = (playerName: string) =>
  socket.emit('game:startVsAI', { playerName })

export const setSlotAI = (slotIndex: number) =>
  socket.emit('room:setAI', { slotIndex })

export const switchSlot = (slotIndex: number) =>
  socket.emit('room:switchSlot', { slotIndex })

export const startGame = () =>
  socket.emit('room:startGame')

export const playCard = (payload: PlayCardPayload) =>
  socket.emit('turn:playCard', payload)

export const exchangeDeadCard = (cardIndex: number) =>
  socket.emit('turn:deadCard', { cardIndex })

export const updateRules = (numTeams: 2 | 3, playersPerTeam: number, turnTimer: 15 | 30 | 60 | null, sequencesToWin: 1 | 2 | 3, hints: 'none' | 'medium' | 'full') =>
  socket.emit('room:updateRules', { numTeams, playersPerTeam, turnTimer, sequencesToWin, hints })

export const renamePlayer = (name: string) =>
  socket.emit('player:rename', { name })

export const quitGame = () =>
  socket.emit('game:quit')

export const returnToLobby = () =>
  socket.emit('room:returnToLobby')

export const rejoinRoom = (token: string) =>
  socket.emit('room:rejoin', { token })
