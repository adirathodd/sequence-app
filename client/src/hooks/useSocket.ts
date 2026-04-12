import { useEffect } from 'react'
import { socket, rejoinRoom } from '../socket/socketClient'
import { useGameStore } from '../store/gameStore'
import type { GameState, ChipColor, LobbySlot } from '../types/game'

interface LobbyStatePayload {
  slots: LobbySlot[]
  hostId: string
  numTeams: 2 | 3
  playersPerTeam: number
  turnTimer: 15 | 30 | 60 | null
  sequencesToWin: 1 | 2 | 3
}

interface RoomJoinedPayload {
  roomCode: string
  playerId: string
  color: ChipColor
  rejoinToken?: string
}

export function useSocket(): void {
  const { setGameState, setRoomInfo, setError, setLobbyState } = useGameStore()

  useEffect(() => {
    const handleConnect = () => {
      const stored = localStorage.getItem('sequence:rejoin')
      if (stored) {
        try {
          const { token } = JSON.parse(stored) as { token: string }
          rejoinRoom(token)
        } catch {
          localStorage.removeItem('sequence:rejoin')
        }
      }
    }

    socket.on('connect', handleConnect)

    socket.on('game:state', (state: GameState) => {
      setGameState(state)
    })

    socket.on('room:joined', (data: RoomJoinedPayload) => {
      setRoomInfo(data.roomCode, data.playerId, data.color)
      if (data.rejoinToken) {
        localStorage.setItem('sequence:rejoin', JSON.stringify({ token: data.rejoinToken }))
      }
    })

    socket.on('room:lobbyState', (data: LobbyStatePayload) => {
      setLobbyState(data)
    })

    socket.on('game:error', (data: { message: string }) => {
      setError(data.message)
      setTimeout(() => setError(null), 3000)
    })

    return () => {
      socket.off('connect', handleConnect)
      socket.off('game:state')
      socket.off('room:joined')
      socket.off('room:lobbyState')
      socket.off('game:error')
    }
  }, [setGameState, setRoomInfo, setError, setLobbyState])
}
