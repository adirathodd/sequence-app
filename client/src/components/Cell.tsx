import { cn } from '../lib/utils'
import type { Cell as CellType, Card, ChipColor } from '../types/game'
import type { HighlightMode } from '../store/gameStore'

const SUIT_SYMBOLS: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }
const SUIT_COLORS: Record<string, string> = {
  S: 'text-gray-800', H: 'text-red-600', D: 'text-red-600', C: 'text-gray-800',
}
const CHIP_BG: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
}
// Border color matches chip color so team ownership is visible at a glance
const CHIP_BORDER: Record<string, string> = {
  blue: 'border-blue-300',
  green: 'border-green-300',
  red: 'border-red-300',
}
const SEQ_RING: Record<string, string> = {
  blue: 'ring-blue-400',
  green: 'ring-green-400',
  red: 'ring-red-400',
}
const SEQ_SHADOW: Record<string, string> = {
  blue: 'shadow-blue-400/50',
  green: 'shadow-green-400/50',
  red: 'shadow-red-400/50',
}

interface Props {
  cell: CellType
  isHighlighted: boolean
  isDimmed: boolean
  highlightMode: HighlightMode
  sequenceHint?: 'complete' | 'near'
  chipColor: ChipColor
  isNew?: boolean
  flashColor?: string
  /** True when the selected card is a two-eyed Jack (J2) — suppresses ring-offset to avoid overlap across ~80 adjacent highlighted cells */
  isWildcard?: boolean
  onClick: () => void
}

export default function Cell({ cell, isHighlighted, isDimmed, highlightMode, sequenceHint, chipColor, isNew, flashColor, isWildcard, onClick }: Props) {
  const isFree = cell.card === 'FREE'
  const isLocked = cell.sequenceId !== null
  const isRemove = isHighlighted && highlightMode === 'remove'
  const isPlace = isHighlighted && highlightMode === 'place'
  const isComplete = isPlace && sequenceHint === 'complete'
  const isNear = isPlace && sequenceHint === 'near'

  // For locked cells, use the chip color for the ring (chip is always present except FREE corners)
  const seqColor = isLocked ? (cell.chip ?? null) : null
  const seqRing = seqColor ? SEQ_RING[seqColor] : 'ring-yellow-400'
  const seqShadow = seqColor ? SEQ_SHADOW[seqColor] : 'shadow-yellow-400/40'

  // Base border: chip-colored when occupied and not actively highlighted, so team ownership is visible
  const baseBorder = isFree
    ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
    : cell.chip && !isHighlighted
    ? `bg-white ${CHIP_BORDER[cell.chip]}`
    : 'bg-white border-gray-200'

  // Placement highlight:
  // - complete/near: colored ring (amber or gold) so the player knows the significance
  // - regular: no colored ring or dot — just visible (not dimmed) with a subtle border lift
  // Wildcard J2 uses ring-1 (no ring-offset) to prevent adjacent rings overlapping in the 2px gap
  const placeClass = (() => {
    if (!isPlace) return ''
    if (!isWildcard) {
      if (isComplete) return 'bg-yellow-100 border-yellow-500 ring-[6px] ring-yellow-500 ring-offset-1 ring-offset-gray-900 shadow-lg shadow-yellow-500/60 cursor-pointer z-10 hover:scale-110 hover:shadow-xl hover:shadow-yellow-400/80 hover:bg-yellow-100'
      if (isNear)     return 'bg-amber-100 border-amber-500 ring-[6px] ring-amber-500 ring-offset-1 ring-offset-gray-900 shadow-lg shadow-amber-500/60 cursor-pointer z-10 hover:scale-110 hover:shadow-xl hover:shadow-amber-400/80 hover:bg-amber-100'
      return                 'border-gray-400 cursor-pointer z-10 hover:scale-105 hover:bg-gray-50'
    }
    // Wildcard: ring-[3px] (no ring-offset) — sits flush against the cell edge, non-overlapping
    if (isComplete) return 'bg-yellow-100 border-yellow-500 ring-[3px] ring-yellow-500 shadow-md shadow-yellow-500/50 cursor-pointer z-10 hover:scale-105 hover:shadow-lg hover:shadow-yellow-400/70 hover:bg-yellow-100'
    if (isNear)     return 'bg-amber-100 border-amber-500 ring-[3px] ring-amber-500 shadow-md shadow-amber-500/50 cursor-pointer z-10 hover:scale-105 hover:shadow-lg hover:shadow-amber-400/70 hover:bg-amber-100'
    return                 'border-gray-300 cursor-pointer hover:scale-105 hover:bg-gray-50'
  })()

  const cardKey = isFree ? null : (() => {
    const c = cell.card as Card
    const rank = c.rank === 'T' ? '10' : c.rank
    return { rank, suit: SUIT_SYMBOLS[c.suit], color: SUIT_COLORS[c.suit] }
  })()

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-11 h-11 rounded border flex flex-col items-center justify-center transition-all duration-150',
        baseBorder,
        // Locked sequence — colored ring + glow (suppressed while actively highlighted)
        !isPlace && !isRemove && isLocked
          ? `ring-2 ${seqRing} ring-offset-1 ring-offset-gray-900 shadow-md ${seqShadow}`
          : '',
        // Dimmed — not a valid target when a card is selected
        isDimmed ? 'opacity-25 cursor-default scale-[0.97]' : '',
        // Placement highlight
        placeClass,
        // Remove highlight
        isRemove
          ? 'bg-red-50 border-red-400 ring-2 ring-red-400 ring-offset-1 ring-offset-gray-900 cursor-pointer z-10 hover:scale-110 hover:shadow-lg hover:shadow-red-400/40 hover:bg-red-100'
          : '',
        // Default non-highlighted cursor
        !isHighlighted && !isDimmed ? 'cursor-default' : '',
      )}
    >
      {/* Card label */}
      {isFree ? (
        <svg className="w-5 h-5 text-yellow-500 select-none" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 1.5l2.39 4.84 5.35.78-3.87 3.77.91 5.33L10 13.77l-4.78 2.45.91-5.33L2.26 7.12l5.35-.78L10 1.5z" />
        </svg>
      ) : (
        <div className={`flex flex-col items-center leading-none select-none ${cardKey?.color}`}>
          <span className="text-[11px] font-bold">{cardKey?.rank}</span>
          <span className="text-sm leading-none">{cardKey?.suit}</span>
        </div>
      )}

      {/* Existing chip */}
      {cell.chip && (
        <div className={cn(
          'absolute inset-1.5 rounded-full shadow-inner',
          CHIP_BG[cell.chip],
          isLocked ? 'opacity-100' : 'opacity-85',
          isRemove ? 'opacity-60' : '',
          isNew ? 'animate-chip-pop' : '',
        )}>
          {/* Gloss highlight */}
          <div className="absolute top-0.5 left-1 right-1 h-1/3 rounded-full bg-white/35 blur-[1px]" />
          {/* Inner depth ring */}
          <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/20" />
        </div>
      )}

      {/* Ghost chip preview on hover for empty place targets */}
      {isPlace && !cell.chip && chipColor && (
        <div className={cn(
          'absolute inset-1.5 rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-100 pointer-events-none',
          CHIP_BG[chipColor],
        )}>
          <div className="absolute top-0.5 left-1 right-1 h-1/3 rounded-full bg-white/35 blur-[1px]" />
        </div>
      )}

      {/* Remove overlay — red X */}
      {isRemove && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <svg className="w-5 h-5 text-red-600 drop-shadow-sm" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      )}


      {/* Sequence flash overlay */}
      {flashColor && (
        <div
          className="absolute inset-0 rounded pointer-events-none z-30 animate-seq-flash"
          style={{ backgroundColor: flashColor }}
        />
      )}
    </button>
  )
}
