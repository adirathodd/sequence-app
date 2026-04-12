import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { createRoom, joinRoom, startVsAI } from '../socket/socketClient'
import { EtherealShadow } from './ui/ethereal-shadow'
import SegmentedControl from './SegmentedControl'
import { LiquidToggle } from './ui/liquid-toggle'

type Mode = 'menu' | 'configure' | 'join'

const BTN_PRIMARY = 'bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 active:from-indigo-600 active:to-indigo-700 text-white font-semibold shadow-md shadow-indigo-950/60 hover:shadow-lg hover:shadow-indigo-900/60 border border-indigo-400/20 rounded-xl transition-all duration-200 active:scale-[0.97]'
const BTN_SECONDARY = 'bg-white/6 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 font-semibold rounded-xl shadow-sm transition-all duration-200 active:scale-[0.97]'
const BTN_GHOST = 'text-gray-500 hover:text-gray-300 transition-colors duration-150 font-medium'
const BTN_EMERALD = 'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:from-emerald-600 active:to-emerald-700 text-white font-semibold shadow-md shadow-emerald-950/60 hover:shadow-lg border border-emerald-400/20 rounded-xl transition-all duration-200 active:scale-[0.97]'
const INPUT = 'bg-gray-950/60 border border-white/10 focus:border-indigo-500/50 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder-gray-600 transition-colors duration-150'
const PANEL = 'bg-gray-950/80 backdrop-blur-sm border border-white/8 rounded-2xl p-6 w-full max-w-xs flex flex-col gap-5'

const panelAnim = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
}

export default function Lobby() {
  const [name, setName] = useState('')
  const [mode, setMode] = useState<Mode>('menu')
  const [joinCode, setJoinCode] = useState('')
  const [numTeams, setNumTeams] = useState<2 | 3>(2)
  const [playersPerTeam, setPlayersPerTeam] = useState<1 | 2 | 3 | 4>(1)
  const [turnTimer, setTurnTimer] = useState<15 | 30 | 60 | null>(null)
  const [sequencesToWin, setSequencesToWin] = useState<1 | 2 | 3>(2)
  const [hintsEnabled, setHintsEnabled] = useState(true)
  const { error } = useGameStore()

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
          <h1 className="text-5xl font-black tracking-tight text-white mb-1">SEQUENCE</h1>
          <p className="text-gray-500 text-sm">Online multiplayer board game</p>
        </div>

        {error && (
          <div className="bg-red-950/60 text-red-300 border border-red-800/60 px-4 py-2 rounded-lg text-sm backdrop-blur-sm">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>

          {mode === 'menu' && (
            <motion.div key="menu" {...panelAnim}
              className="flex flex-col gap-3 w-full max-w-xs">
              <input className={INPUT} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
              <button onClick={() => setMode('configure')} className={`${BTN_PRIMARY} w-full py-3`}>
                Create Game
              </button>
              <button onClick={() => setMode('join')} className={`${BTN_SECONDARY} w-full py-3`}>
                Join Game
              </button>
              <button onClick={() => startVsAI(name || 'Player')} className={`${BTN_GHOST} py-2 text-sm`}>
                Quick play vs AI →
              </button>
            </motion.div>
          )}

          {mode === 'configure' && (
            <motion.div key="configure" {...panelAnim}
              className={PANEL}>
              <h2 className="font-bold text-lg text-white">Game Setup</h2>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Teams</label>
                <SegmentedControl
                  options={[2, 3] as const}
                  value={numTeams}
                  onChange={setNumTeams}
                  label={n => `${n} Teams`}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Players per team</label>
                <SegmentedControl
                  options={[1, 2, 3, 4] as const}
                  value={playersPerTeam}
                  onChange={setPlayersPerTeam}
                  label={n => String(n)}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Turn timer</label>
                <SegmentedControl
                  options={[null, 15, 30, 60] as const}
                  value={turnTimer}
                  onChange={setTurnTimer}
                  label={t => t === null ? 'Off' : `${t}s`}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Sequences to win</label>
                <SegmentedControl
                  options={[1, 2, 3] as const}
                  value={sequencesToWin}
                  onChange={setSequencesToWin}
                  label={n => String(n)}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Hints</label>
                <LiquidToggle checked={hintsEnabled} onCheckedChange={setHintsEnabled} />
              </div>

              <p className="text-xs text-gray-600 text-center">
                {numTeams * playersPerTeam} total players · {numTeams} teams
              </p>

              <button onClick={() => createRoom(name || 'Player', numTeams, playersPerTeam, turnTimer, sequencesToWin, hintsEnabled)} className={`${BTN_PRIMARY} py-2.5`}>
                Create Room
              </button>
              <button onClick={() => setMode('menu')} className={`${BTN_GHOST} text-sm`}>
                Back
              </button>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div key="join" {...panelAnim}
              className={`${PANEL} gap-4`}>
              <h2 className="font-bold text-lg text-white">Join a Game</h2>
              <input className={INPUT} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
              <input
                className={`${INPUT} font-mono uppercase tracking-widest`}
                placeholder="Room code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
              />
              <button onClick={() => joinRoom(joinCode, name || 'Player')} className={`${BTN_EMERALD} py-2.5`}>
                Join Room
              </button>
              <button onClick={() => setMode('menu')} className={`${BTN_GHOST} text-sm`}>
                Back
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
