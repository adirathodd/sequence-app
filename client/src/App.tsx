import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from './store/gameStore'
import { useSocket } from './hooks/useSocket'
import Lobby from './components/Lobby'
import LobbyWaiting from './components/LobbyWaiting'
import Board from './components/Board'
import Hand from './components/Hand'
import GameStatus from './components/GameStatus'
import SequenceToast from './components/SequenceToast'
import { EtherealShadow } from './components/ui/ethereal-shadow'
import { LiquidGooFilter } from './components/ui/liquid-toggle'
import { quitGame, renamePlayer } from './socket/socketClient'

const pageAnim = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.35, ease: 'easeIn' as const } },
}

export default function App() {
  useSocket()

  const { gameState, myColor, resetGame, roomCode } = useGameStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmingQuit, setConfirmingQuit] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const inGame = gameState && gameState.phase !== 'lobby'

  const myName = gameState?.players.find(p => p.color === myColor)?.name ?? ''

  useEffect(() => {
    if (settingsOpen) { setNameInput(myName); setNameSaved(false); setConfirmingQuit(false) }
  }, [settingsOpen])

  useEffect(() => { setSettingsOpen(false) }, [gameState?.roomCode])

  function handleQuit() { setSettingsOpen(false); setConfirmingQuit(false); quitGame(); resetGame() }

  function handleSaveName() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === myName) return
    renamePlayer(trimmed)
    setNameSaved(true)
    setTimeout(() => { setSettingsOpen(false); setNameSaved(false) }, 800)
  }

  const screenKey = inGame ? 'game' : roomCode ? 'waiting' : 'lobby'

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-950">
    <LiquidGooFilter />
    <AnimatePresence mode="sync" initial={false}>

      {screenKey === 'lobby' && (
        <motion.div key="lobby" {...pageAnim} className="absolute inset-0 w-full">
          <Lobby />
        </motion.div>
      )}

      {screenKey === 'waiting' && (
        <motion.div key="waiting" {...pageAnim} className="absolute inset-0 w-full">
          <LobbyWaiting />
        </motion.div>
      )}

      {screenKey === 'game' && (
        <motion.div key="game" {...pageAnim} className="absolute inset-0 h-screen bg-gray-950 text-white flex flex-col items-center overflow-hidden w-full">
          <div className="absolute inset-0 pointer-events-none">
            <EtherealShadow
              color="rgba(99, 102, 241, 0.75)"
              animation={{ scale: 65, speed: 35 }}
              noise={{ opacity: 0.6, scale: 1.4 }}
              sizing="fill"
            />
          </div>
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,transparent_30%,rgb(3,7,18)_80%)]" />

          <div className="relative z-10 w-full h-full flex flex-col items-center gap-2 py-3 px-4">

            <SequenceToast />

            {/* Settings modal */}
            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  key="settings-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.2 } }}
                  exit={{ opacity: 0, transition: { duration: 0.22 } }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                  onClick={() => { setSettingsOpen(false); setConfirmingQuit(false) }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.93, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
                    exit={{ opacity: 0, scale: 0.93, y: 16, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
                    className="flex flex-col gap-5 rounded-2xl shadow-2xl px-6 py-6 mx-4 w-full max-w-xs bg-gray-950/95 backdrop-blur-md border border-white/8"
                    onClick={e => e.stopPropagation()}
                  >

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Settings</span>
                      <button onClick={() => { setSettingsOpen(false); setConfirmingQuit(false) }} className="text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none">✕</button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Display name</label>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-gray-900 border border-white/10 focus:border-indigo-500/50 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-gray-600 transition-colors"
                          value={nameInput}
                          onChange={e => { setNameInput(e.target.value); setNameSaved(false) }}
                          onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                          maxLength={20}
                          placeholder="Your name"
                        />
                        <button
                          onClick={handleSaveName}
                          disabled={!nameInput.trim() || nameInput.trim() === myName}
                          className="px-3 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all duration-150 active:scale-[0.97] flex-shrink-0"
                        >
                          {nameSaved ? '✓' : 'Save'}
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-white/6" />

                    <AnimatePresence mode="wait" initial={false}>
                      {!confirmingQuit ? (
                        <motion.button
                          key="quit-btn"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0, transition: { duration: 0.16, ease: 'easeOut' } }}
                          exit={{ opacity: 0, y: -4, transition: { duration: 0.12, ease: 'easeIn' } }}
                          onClick={() => setConfirmingQuit(true)}
                          className="w-full py-2.5 text-sm font-semibold rounded-xl bg-white/5 hover:bg-red-950/50 border border-white/8 hover:border-red-800/50 text-gray-400 hover:text-red-400 transition-all duration-200 active:scale-[0.97]"
                        >
                          Quit game
                        </motion.button>
                      ) : (
                        <motion.div
                          key="quit-confirm"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0, transition: { duration: 0.16, ease: 'easeOut' } }}
                          exit={{ opacity: 0, y: -4, transition: { duration: 0.12, ease: 'easeIn' } }}
                          className="flex flex-col gap-2"
                        >
                          <p className="text-xs text-gray-500 text-center">Your opponent will be notified and the game will end.</p>
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmingQuit(false)} className="flex-1 py-2 text-sm bg-white/6 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold rounded-xl transition-all duration-200 active:scale-[0.97]">
                              Cancel
                            </button>
                            <button onClick={handleQuit} className="flex-1 py-2 text-sm bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-semibold shadow-md shadow-red-950/60 border border-red-400/20 rounded-xl transition-all duration-200 active:scale-[0.97]">
                              Yes, quit
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Settings button */}
            <div className="w-full max-w-2xl flex justify-end flex-shrink-0">
              <button
                onClick={() => setSettingsOpen(true)}
                className="text-gray-600 hover:text-gray-300 transition-colors duration-150 p-1"
                title="Settings"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="w-full max-w-2xl flex-shrink-0">
              <GameStatus />
            </div>
            <div className="flex-shrink-0">
              <Board />
            </div>
            <div className="w-full max-w-2xl flex-shrink-0">
              <Hand />
            </div>

          </div>
        </motion.div>
      )}

    </AnimatePresence>
    </div>
  )
}
