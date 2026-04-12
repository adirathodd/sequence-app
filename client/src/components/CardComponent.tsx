import type { Card } from '../types/game'

const SUIT_SYMBOLS: Record<string, string> = {
  S: '♠', H: '♥', D: '♦', C: '♣',
}
const SUIT_COLORS: Record<string, string> = {
  S: 'text-gray-900', H: 'text-red-600', D: 'text-red-600', C: 'text-gray-900',
}
const RANK_DISPLAY: Record<string, string> = {
  T: '10', Q: 'Q', K: 'K', A: 'A',
}

interface Props {
  card: Card
  selected?: boolean
  isDead?: boolean
  isPending?: boolean
  dimmed?: boolean
  onClick?: () => void
  disabled?: boolean
}

export default function CardComponent({ card, selected, isDead, isPending, dimmed, onClick, disabled }: Props) {
  if (card.hidden) {
    return (
      <div className="w-14 h-20 rounded bg-blue-800 border border-blue-600 flex items-center justify-center text-white text-2xl select-none">
        🂠
      </div>
    )
  }

  const isTwoEyed = card.rank === 'J2'
  const isOneEyed = card.rank === 'J1'
  const isJack = isTwoEyed || isOneEyed

  if (isJack) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={isTwoEyed ? 'Two-eyed Jack — place your chip anywhere' : 'One-eyed Jack — remove an opponent chip'}
        className={[
          'relative w-14 h-20 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all select-none overflow-hidden',
          isTwoEyed
            ? 'bg-gradient-to-b from-amber-900 to-amber-950 border-amber-600/50'
            : 'bg-gradient-to-b from-red-950 to-gray-950 border-red-700/50',
          selected
            ? isTwoEyed
              ? 'ring-2 ring-amber-400/80 -translate-y-2 shadow-lg shadow-amber-900/60'
              : 'ring-2 ring-red-500/80 -translate-y-2 shadow-lg shadow-red-900/60'
            : 'hover:-translate-y-1',
          isDead ? 'opacity-40' : '',
          dimmed ? 'opacity-30 scale-95' : '',
          disabled ? 'cursor-default' : 'cursor-pointer',
        ].join(' ')}
      >
        {/* Subtle shimmer stripe */}
        <div className={[
          'absolute inset-0 opacity-10',
          isTwoEyed
            ? 'bg-gradient-to-br from-amber-300 via-transparent to-transparent'
            : 'bg-gradient-to-br from-red-400 via-transparent to-transparent',
        ].join(' ')} />

        {/* Icon */}
        <span className={[
          'text-lg leading-none font-black relative z-10',
          isTwoEyed ? 'text-amber-300' : 'text-red-400',
        ].join(' ')}>
          {isTwoEyed ? '✦' : '✕'}
        </span>

        {/* Label */}
        <span className={[
          'text-[8px] font-black uppercase tracking-widest leading-none relative z-10',
          isTwoEyed ? 'text-amber-400/90' : 'text-red-400/90',
        ].join(' ')}>
          {isTwoEyed ? 'WILD' : 'REMOVE'}
        </span>

        {/* Suit */}
        <span className={[
          'text-[9px] leading-none relative z-10 opacity-40',
          isTwoEyed ? 'text-amber-200' : 'text-red-300',
        ].join(' ')}>
          {SUIT_SYMBOLS[card.suit]}
        </span>

        {isDead && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg">
            <div className="w-full h-px bg-gray-400 rotate-45" />
          </div>
        )}
      </button>
    )
  }

  const rank = RANK_DISPLAY[card.rank] ?? card.rank
  const suit = SUIT_SYMBOLS[card.suit]
  const color = SUIT_COLORS[card.suit]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'relative w-14 h-20 rounded border flex flex-col items-start justify-start p-1.5 text-sm font-bold transition-all select-none',
        isDead ? 'bg-amber-50 border-amber-300' : 'bg-white shadow-sm border-gray-200',
        selected
          ? 'ring-2 ring-yellow-400 -translate-y-2 shadow-lg shadow-yellow-300/30'
          : isPending
          ? 'ring-2 ring-amber-400 -translate-y-3 shadow-lg shadow-amber-400/40 border-amber-400'
          : 'hover:-translate-y-1',
        isDead && !isPending ? 'opacity-60' : '',
        dimmed ? 'opacity-25 scale-95' : '',
        disabled ? 'cursor-default' : 'cursor-pointer',
        color,
      ].join(' ')}
    >
      <span>{rank}</span>
      <span className="text-base leading-none">{suit}</span>
      {isDead && !isPending && (
        <div className="absolute inset-0 flex items-end justify-end rounded pointer-events-none p-0.5">
          <span className="text-[7px] font-black uppercase tracking-tight text-red-500/80 bg-red-100 px-0.5 py-px rounded leading-none">dead</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-px bg-red-400/50 rotate-45" />
          </div>
        </div>
      )}
    </button>
  )
}
