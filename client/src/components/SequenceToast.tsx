import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import type { ChipColor } from '../types/game'

const TEAM_STYLE: Record<string, { bg: string; border: string; label: string }> = {
  blue:  { bg: 'bg-blue-600',  border: 'border-blue-400',  label: 'Blue'  },
  green: { bg: 'bg-green-600', border: 'border-green-400', label: 'Green' },
  red:   { bg: 'bg-red-600',   border: 'border-red-400',   label: 'Red'   },
}

interface ToastItem {
  id: number
  color: ChipColor
  playerName: string
  isMe: boolean
  totalSeqs: number
}

function Toast({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter')
  const style = TEAM_STYLE[item.color ?? 'blue']

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 16)
    const t2 = setTimeout(() => setPhase('exit'), 2400)
    const t3 = setTimeout(onDone, 2700)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div className={[
      'flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-2xl ring-1 ring-white/10',
      'transition-all duration-300 pointer-events-none select-none',
      style.bg, style.border,
      phase === 'enter' ? 'opacity-0 -translate-y-4 scale-95' : '',
      phase === 'visible' ? 'opacity-100 translate-y-0 scale-100' : '',
      phase === 'exit' ? 'opacity-0 -translate-y-3 scale-95' : '',
    ].join(' ')}>
      <span className="text-2xl leading-none">
        {item.isMe ? '🎯' : '⚡'}
      </span>
      <div className="text-white">
        <div className="font-black text-sm leading-tight">
          {item.isMe
            ? 'You formed a sequence!'
            : `${item.playerName} formed a sequence!`}
        </div>
        <div className="text-xs opacity-75 leading-tight mt-0.5">
          {style.label} team &middot;&nbsp;
          {item.totalSeqs >= 2
            ? (item.isMe ? 'Winner!' : 'Game over!')
            : (item.isMe ? 'One more to win!' : 'Watch out!')}
        </div>
      </div>
    </div>
  )
}

export default function SequenceToast() {
  const { gameState, myColor } = useGameStore()
  const prevCount = useRef(0)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  useEffect(() => {
    const current = gameState?.sequences.length ?? 0
    const phase = gameState?.phase

    if (phase === 'playing' && current > prevCount.current) {
      const newSeqs = gameState!.sequences.slice(prevCount.current)
      newSeqs.forEach(seq => {
        const player = gameState!.players.find(p => p.color === seq.color)
        const totalSeqs = gameState!.sequences.filter(s => s.color === seq.color).length
        const id = ++nextId.current
        setToasts(prev => [...prev, {
          id,
          color: seq.color,
          playerName: player?.name ?? (seq.color ?? 'Unknown'),
          isMe: seq.color === myColor,
          totalSeqs,
        }])
      })
    }

    prevCount.current = current
  }, [gameState?.sequences.length, gameState?.phase, myColor])

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 items-center">
      {toasts.map(t => (
        <Toast key={t.id} item={t} onDone={() => remove(t.id)} />
      ))}
    </div>
  )
}
