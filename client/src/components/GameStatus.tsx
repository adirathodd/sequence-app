import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { rematch, startVsAI, quitGame } from '../socket/socketClient'
import Confetti from './Confetti'

const BTN_INDIGO = 'bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 active:from-indigo-600 active:to-indigo-700 text-white font-semibold shadow-md shadow-indigo-950/60 hover:shadow-lg hover:shadow-indigo-900/60 border border-indigo-400/20 rounded-xl transition-all duration-200 active:scale-[0.97]'
const BTN_GOLD   = 'bg-gradient-to-b from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 active:from-yellow-500 active:to-yellow-600 text-yellow-950 font-semibold shadow-md shadow-yellow-900/40 hover:shadow-lg border border-yellow-300/30 rounded-xl transition-all duration-200 active:scale-[0.97]'
const BTN_SECONDARY = 'bg-white/6 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 font-semibold rounded-xl shadow-sm transition-all duration-200 active:scale-[0.97]'

export default function GameStatus() {
  const { gameState, myColor, roomCode, resetGame, hostId, myPlayerId, sequencesToWin } = useGameStore()
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  function handleCopyCode() {
    if (!roomCode) return
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  useEffect(() => {
    if (!gameState?.turnDeadline || gameState.phase !== 'playing') {
      setSecondsLeft(null)
      return
    }
    const update = () => {
      const left = Math.max(0, Math.ceil((gameState.turnDeadline! - Date.now()) / 1000))
      setSecondsLeft(left)
    }
    update()
    const id = setInterval(update, 500)
    return () => clearInterval(id)
  }, [gameState?.turnDeadline, gameState?.phase])

  if (!gameState) return null

  const isHost = myPlayerId === hostId
  const uniqueTeamColors = [...new Set(
    gameState.players.map(p => p.color).filter((c): c is Exclude<typeof c, null> => c !== null)
  )]

  const myName = gameState.players.find(p => p.id === myPlayerId)?.name ?? 'Player'

  if (gameState.phase === 'ended') {
    if (!gameState.winner) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 rounded-3xl shadow-2xl px-12 py-10 mx-4 text-center max-w-sm w-full bg-gray-950/90 backdrop-blur-md border border-white/8">
            <div className="text-7xl select-none">🚪</div>
            <div>
              <div className="text-3xl font-black text-white mb-1">Game Over</div>
              <div className="text-sm text-gray-500">{gameState.lastAction}</div>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {isHost && (
                <button onClick={() => rematch()} className={`${BTN_INDIGO} w-full py-3 text-sm`}>
                  Rematch
                </button>
              )}
              <button onClick={() => startVsAI(myName)} className={`${BTN_SECONDARY} w-full py-2.5 text-sm`}>
                Restart
              </button>
              <button onClick={() => { quitGame(); resetGame() }} className={`${BTN_SECONDARY} w-full py-2.5 text-sm`}>
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )
    }

    const iWon = gameState.winner === myColor
    const winnerSeqs = gameState.sequences.filter(s => s.color === gameState.winner).length
    const isForfeit = winnerSeqs < gameState.sequencesToWin

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        {iWon && <Confetti />}
        <div className={[
          'relative flex flex-col items-center gap-6 rounded-3xl shadow-2xl px-12 py-10 mx-4 text-center max-w-sm w-full',
          iWon
            ? 'bg-gradient-to-b from-yellow-50 to-white border-2 border-yellow-300'
            : 'bg-gray-950/90 backdrop-blur-md border border-white/8',
        ].join(' ')}>

          <div className="text-7xl select-none">{iWon ? '🏆' : '💀'}</div>

          <div>
            <div className={`text-4xl font-black tracking-tight mb-1 ${iWon ? 'text-yellow-600' : 'text-white'}`}>
              {iWon ? 'You Win!' : 'You Lose'}
            </div>
            {isForfeit && (
              <div className={`text-sm ${iWon ? 'text-yellow-700' : 'text-gray-500'}`}>
                {gameState.lastAction ?? (iWon ? 'Opponent left the game' : 'You left the game')}
              </div>
            )}
          </div>

          <div className={`flex gap-6 text-center py-3 px-6 rounded-2xl w-full justify-center ${iWon ? 'bg-yellow-100' : 'bg-white/6 border border-white/8'}`}>
            {uniqueTeamColors.map(color => {
              const seqs = gameState.sequences.filter(s => s.color === color).length
              const isMe = color === myColor
              const isWinner = color === gameState.winner
              return (
                <div key={color}>
                  <div className={`text-3xl font-black ${
                    isWinner
                      ? (iWon ? 'text-yellow-700' : 'text-white')
                      : (iWon ? 'text-gray-400' : 'text-gray-600')
                  }`}>{seqs}</div>
                  <div className={`text-xs mt-0.5 capitalize ${iWon ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {isMe ? 'You' : color}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-2 w-full">
            {isHost && (
              <button
                onClick={() => rematch()}
                className={`${iWon ? BTN_GOLD : BTN_INDIGO} w-full py-3 text-sm`}
              >
                Rematch
              </button>
            )}
            <button
              onClick={() => startVsAI(myName)}
              className={[
                'w-full py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 active:scale-[0.97]',
                iWon
                  ? 'bg-white border-yellow-200 text-yellow-800 hover:bg-yellow-50 shadow-sm'
                  : 'bg-white/6 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 shadow-sm',
              ].join(' ')}
            >
              Restart
            </button>
            <button
              onClick={() => { quitGame(); resetGame() }}
              className={[
                'w-full py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 active:scale-[0.97]',
                iWon
                  ? 'bg-yellow-100 border-yellow-200 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-white/6 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300',
              ].join(' ')}
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  const activePlayer = gameState.players[gameState.currentPlayerIndex]
  const isMyTurn = activePlayer?.color === myColor

  const CHIP_BG: Record<string, string> = {
    blue: 'bg-blue-500', green: 'bg-green-500', red: 'bg-red-500',
  }
  const CHIP_RING: Record<string, string> = {
    blue: 'ring-blue-400', green: 'ring-green-400', red: 'ring-red-400',
  }
  const CHIP_TEXT: Record<string, string> = {
    blue: 'text-blue-600', green: 'text-green-600', red: 'text-red-600',
  }

  const teamColors = [...new Set(
    gameState.players.map(p => p.color).filter((c): c is Exclude<typeof c, null> => c !== null)
  )]

  return (
    <div className="flex flex-col gap-1.5">

      <div className="flex justify-center gap-2 flex-wrap">
        {gameState.players.map((player, i) => {
          const isActive = i === gameState.currentPlayerIndex
          const isMe = player.color === myColor
          const chipBg   = CHIP_BG[player.color ?? 'blue']   ?? 'bg-gray-500'
          const chipRing = CHIP_RING[player.color ?? 'blue'] ?? 'ring-gray-400'

          return (
            <div
              key={isActive ? `turn-${gameState.currentPlayerIndex}` : player.id}
              className={[
                'flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300',
                isActive
                  ? 'bg-white border-gray-200 shadow-md -translate-y-0.5 animate-turn-in'
                  : 'bg-gray-950/60 border-white/8 opacity-60',
              ].join(' ')}
            >
              <div className="relative flex-shrink-0">
                <div className={['w-6 h-6 rounded-full', chipBg, isActive ? `ring-2 ring-offset-1 ring-offset-white ${chipRing}` : ''].join(' ')} />
                {isActive && (
                  <div className={['absolute inset-0 rounded-full animate-ping opacity-30', chipBg].join(' ')} />
                )}
              </div>

              <div className="flex items-center gap-1">
                <span className={`text-xs font-bold leading-none ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                  {player.name}
                </span>
                {isMe && (
                  <span className="text-[9px] font-black uppercase bg-gray-100 text-gray-500 px-1 rounded leading-none py-0.5">
                    you
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Team sequence counts */}
      <div className="flex justify-center gap-3">
        {teamColors.map(color => {
          const seqCount = gameState.sequences.filter(s => s.color === color).length
          const chipBg  = CHIP_BG[color]  ?? 'bg-gray-500'
          const chipText = CHIP_TEXT[color] ?? 'text-gray-400'
          const isMyTeam = color === myColor
          return (
            <div key={color} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${chipBg}`} />
              <span className={`text-xs font-black tabular-nums ${isMyTeam ? chipText : 'text-gray-500'}`}>
                {seqCount}/{sequencesToWin}
              </span>
            </div>
          )
        })}
      </div>

      <div className={[
        'flex items-center justify-center gap-2 text-sm font-semibold rounded-lg',
        isMyTurn ? 'text-white' : 'text-gray-500',
      ].join(' ')}>
        <span>{isMyTurn ? '⚡ Your turn' : `${activePlayer?.name ?? '…'}'s turn`}</span>
        {!isMyTurn && secondsLeft === null && (
          <div className="flex items-center gap-0.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1 h-1 rounded-full bg-gray-600 thinking-dot"
                style={{ animationDelay: `${i * 0.22}s` }}
              />
            ))}
          </div>
        )}
        {secondsLeft !== null && (
          <span className={[
            'font-mono text-xs px-2 py-0.5 rounded-full font-bold',
            secondsLeft <= 5
              ? 'bg-red-600 text-white animate-pulse'
              : secondsLeft <= 10
                ? 'bg-orange-500 text-white'
                : 'bg-indigo-950/60 border border-indigo-800/40 text-indigo-300',
          ].join(' ')}>
            {secondsLeft}s
          </span>
        )}
      </div>

      {gameState.lastAction && (
        <div className="text-center text-xs text-gray-600 italic truncate px-4">
          {gameState.lastAction}
        </div>
      )}

      {roomCode && !gameState.players.filter(p => p.color !== myColor).every(p => p.isAI) && (
        <div className="flex justify-center">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/8 hover:border-indigo-800/50 bg-white/4 hover:bg-indigo-950/40 transition-all duration-200 group"
          >
            <span className="text-[10px] text-gray-700 uppercase tracking-wide">Room</span>
            <span className="font-mono font-bold text-gray-500 group-hover:text-indigo-300 text-xs tracking-widest transition-colors">{roomCode}</span>
            <span className="text-[10px] text-gray-700 group-hover:text-indigo-400 transition-colors">
              {copied ? '✓' : '⎘'}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
