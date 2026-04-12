import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { setSlotAI, startGame, switchSlot, updateRules, quitGame } from '../socket/socketClient'
import { EtherealShadow } from './ui/ethereal-shadow'
import SegmentedControl from './SegmentedControl'

const TEAM_STYLE: Record<string, { bg: string; border: string; label: string; dot: string }> = {
  blue:  { bg: 'bg-blue-950/40',  border: 'border-blue-800/60',  label: 'text-blue-400',  dot: 'bg-blue-500'  },
  green: { bg: 'bg-green-950/40', border: 'border-green-800/60', label: 'text-green-400', dot: 'bg-green-500' },
  red:   { bg: 'bg-red-950/40',   border: 'border-red-800/60',   label: 'text-red-400',   dot: 'bg-red-500'   },
}

const BTN_PRIMARY = 'bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 active:from-indigo-600 active:to-indigo-700 text-white font-semibold shadow-md shadow-indigo-950/60 hover:shadow-lg hover:shadow-indigo-900/60 border border-indigo-400/20 rounded-xl transition-all duration-200 active:scale-[0.97]'

export default function LobbyWaiting() {
  const { lobbySlots, hostId, roomCode, myPlayerId, numTeams, playersPerTeam, turnTimer, sequencesToWin, resetGame } = useGameStore()
  const isHost = myPlayerId === hostId
  const iAmInLobby = lobbySlots.some(s => s.playerId === myPlayerId)
  const allFilled = lobbySlots.length > 0 && lobbySlots.every(s => s.isAI || s.playerId !== null)
  const teamColors = (['blue', 'green', 'red'] as const).slice(0, numTeams)

  const [localTeams, setLocalTeams] = useState<2 | 3>(numTeams)
  const [localPPT, setLocalPPT] = useState<1 | 2 | 4>(playersPerTeam as 1 | 2 | 4)
  const [localTimer, setLocalTimer] = useState<15 | 30 | 60 | null>(turnTimer)
  const [localSeqToWin, setLocalSeqToWin] = useState<1 | 2 | 3>(sequencesToWin)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyRoomCode() {
    if (!roomCode) return
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (rulesOpen) {
      setLocalTeams(numTeams)
      setLocalPPT(playersPerTeam as 1 | 2 | 4)
      setLocalTimer(turnTimer)
      setLocalSeqToWin(sequencesToWin)
    }
  }, [rulesOpen, numTeams, playersPerTeam, turnTimer, sequencesToWin])

  function handleTeams(v: 2 | 3) { setLocalTeams(v); updateRules(v, localPPT, localTimer, localSeqToWin) }
  function handlePPT(v: 1 | 2 | 4) { setLocalPPT(v); updateRules(localTeams, v, localTimer, localSeqToWin) }
  function handleTimer(v: 15 | 30 | 60 | null) { setLocalTimer(v); updateRules(localTeams, localPPT, v, localSeqToWin) }
  function handleSeqToWin(v: 1 | 2 | 3) { setLocalSeqToWin(v); updateRules(localTeams, localPPT, localTimer, v) }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen gap-6 bg-gray-950 p-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <EtherealShadow
          color="rgba(99, 102, 241, 0.75)"
          animation={{ scale: 65, speed: 35 }}
          noise={{ opacity: 0.6, scale: 1.4 }}
          sizing="fill"
        />
      </div>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,transparent_30%,rgb(3,7,18)_80%)]" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full">

        <div className="text-center">
          <h1 className="text-4xl font-black text-white mb-1">SEQUENCE</h1>
          <p className="text-gray-500 text-sm mb-2">Share this code to invite players</p>
          <button
            onClick={copyRoomCode}
            className="group inline-flex items-center gap-2 bg-gray-900/80 hover:bg-gray-800/80 border border-white/10 hover:border-indigo-500/40 rounded-xl px-4 py-2 transition-all duration-200"
            title="Click to copy"
          >
            <span className="font-mono font-black text-2xl text-indigo-300 tracking-[0.25em]">{roomCode}</span>
            <span className="text-xs text-gray-600 group-hover:text-indigo-400 transition-colors duration-150 ml-1">
              {copied ? '✓ Copied' : 'Copy'}
            </span>
          </button>
          <AnimatePresence mode="wait" initial={false}>
            {!rulesOpen && (
              <motion.p
                key="rules-summary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } }}
                exit={{ opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } }}
                className="text-gray-600 text-xs mt-1"
              >
                {numTeams} teams · {playersPerTeam} per team
                {turnTimer ? ` · ${turnTimer}s timer` : ' · no timer'}
                {` · ${sequencesToWin} to win`}
                {isHost && (
                  <button onClick={() => setRulesOpen(true)} className="ml-2 text-indigo-500 hover:text-indigo-300 transition-colors duration-150">
                    Edit
                  </button>
                )}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {isHost && rulesOpen && (
            <motion.div
              key="rules-panel"
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
              exit={{ opacity: 0, scale: 0.92, y: 8, transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }}
              className="bg-gray-950/80 backdrop-blur-sm border border-white/8 rounded-2xl p-4 w-full max-w-xs flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Game Rules</span>
                <button onClick={() => setRulesOpen(false)} className="text-gray-500 hover:text-gray-300 text-xs transition-colors duration-150">Done</button>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Teams</label>
                <SegmentedControl options={[2, 3] as const} value={localTeams} onChange={handleTeams} label={n => `${n} Teams`} />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Players per team</label>
                <SegmentedControl options={[1, 2, 4] as const} value={localPPT} onChange={handlePPT} label={n => String(n)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Turn timer</label>
                <SegmentedControl options={[null, 15, 30, 60] as const} value={localTimer} onChange={handleTimer} label={t => t === null ? 'Off' : `${t}s`} />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Sequences to win</label>
                <SegmentedControl options={[1, 2, 3] as const} value={localSeqToWin} onChange={handleSeqToWin} label={n => String(n)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-4 w-full max-w-2xl">
          {teamColors.map(color => {
            const style = TEAM_STYLE[color]
            const slots = lobbySlots
              .map((s, i) => ({ slot: s, index: i }))
              .filter(({ slot }) => slot.color === color)

            return (
              <div key={color} className={`flex-1 ${style.bg} border ${style.border} rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-sm`}>
                <div className={`text-xs font-bold uppercase tracking-widest ${style.label}`}>
                  {color} team
                </div>

                {slots.map(({ slot, index }) => (
                  <div key={index} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 min-h-[44px] flex items-center overflow-hidden">
                    {slot.playerId ? (
                      <div className="flex items-center gap-2 w-full">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                        <span className="text-sm text-white font-medium truncate">{slot.playerName}</span>
                        {slot.playerId === myPlayerId && (
                          <span className="text-[10px] bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 px-1.5 py-0.5 rounded font-bold ml-auto flex-shrink-0">you</span>
                        )}
                      </div>
                    ) : slot.isAI ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                          <span className="text-sm text-violet-300 font-medium">AI</span>
                        </div>
                        {isHost && (
                          <button onClick={() => setSlotAI(index)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors duration-150 font-medium ml-2">
                            Remove
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 w-full min-w-0">
                        <span className="text-xs text-gray-600 italic">Waiting…</span>
                        <div className="flex items-center gap-2">
                          {iAmInLobby && (
                            <button onClick={() => switchSlot(index)} className="text-[11px] text-indigo-400 hover:text-indigo-200 font-semibold transition-colors duration-150 whitespace-nowrap">
                              Switch here
                            </button>
                          )}
                          {isHost && (
                            <button onClick={() => setSlotAI(index)} className="text-[11px] text-violet-400 hover:text-violet-200 font-semibold transition-colors duration-150 whitespace-nowrap">
                              Fill AI
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {isHost ? (
          <button
            onClick={() => startGame()}
            disabled={!allFilled}
            className={[
              'w-full max-w-xs py-3 text-sm',
              allFilled
                ? BTN_PRIMARY
                : 'bg-white/4 border border-white/8 text-gray-700 cursor-not-allowed rounded-xl font-semibold',
            ].join(' ')}
          >
            {allFilled ? 'Start Game' : 'Fill all slots to start'}
          </button>
        ) : (
          <p className="text-gray-600 text-sm animate-pulse">Waiting for host to start…</p>
        )}

        <div className="relative flex flex-col items-center" style={{ minHeight: '2.5rem' }}>
          <AnimatePresence mode="wait" initial={false}>
            {leaveConfirm ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.13, ease: 'easeIn' } }}
                className="flex flex-col items-center gap-2"
              >
                <p className="text-gray-400 text-sm">{isHost ? 'This will close the room for everyone.' : 'Are you sure you want to leave?'}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { quitGame(); setTimeout(resetGame, 400) }}
                    className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors duration-150"
                  >
                    Leave
                  </button>
                  <button
                    onClick={() => setLeaveConfirm(false)}
                    className="text-gray-500 hover:text-gray-300 text-sm transition-colors duration-150 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="leave-btn"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.13, ease: 'easeIn' } }}
                onClick={() => setLeaveConfirm(true)}
                className="text-gray-600 hover:text-gray-400 text-sm transition-colors duration-150 font-medium"
              >
                ← Leave room
              </motion.button>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}
