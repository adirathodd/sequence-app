import { useGameStore } from '../store/gameStore'
import CardComponent from './CardComponent'
import { isDeadCard } from '../utils/cardUtils'
import { getCardPotential } from '../utils/sequenceHint'
import { exchangeDeadCard } from '../socket/socketClient'

export default function Hand() {
  const {
    gameState, myColor, myPlayerId, selectedCardIndex, highlightMode, highlightedCells,
    selectCard, setPendingDeadCard, pendingDeadCardIndex,
  } = useGameStore()

  if (!gameState) return null

  const me = gameState.players.find(p => p.id === myPlayerId)
  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === myPlayerId

  if (!me) return null

  function handleCardClick(index: number) {
    if (!isMyTurn || !gameState) return
    const card = me!.hand[index]
    if (!card || card.hidden) return

    const dead = isDeadCard(card, gameState.board)
    if (dead) {
      setPendingDeadCard(index)
      return
    }

    selectCard(selectedCardIndex === index ? null : index)
  }

  function confirmDeadCard() {
    if (pendingDeadCardIndex === null) return
    exchangeDeadCard(pendingDeadCardIndex)
    setPendingDeadCard(null)
  }

  const moveCount = highlightedCells.length
  const selectedCard = selectedCardIndex !== null ? me.hand[selectedCardIndex] : null
  const hasPending = pendingDeadCardIndex !== null

  const keyCounts = new Map<string, number>()

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2 flex-wrap justify-center">
        {me.hand.map((card, i) => {
          const dead = !card.hidden && isDeadCard(card, gameState!.board)
          const isSelected = selectedCardIndex === i
          const isPending = pendingDeadCardIndex === i
          const dimmed = isMyTurn && (
            (selectedCardIndex !== null && !isSelected) ||
            (hasPending && !isPending)
          )
          const baseKey = card.hidden ? 'hidden' : `${card.rank}${card.suit}`
          const n = keyCounts.get(baseKey) ?? 0
          keyCounts.set(baseKey, n + 1)
          const cardKey = `${baseKey}-${n}`
          const potential = isMyTurn && !dead && !hasPending
            ? getCardPotential(card, gameState!.board, myColor, gameState!.sequences)
            : null
          return (
            <div key={cardKey} className="relative animate-card-deal" style={{ animationDelay: `${i * 35}ms` }}>
              {isPending && (
                <div className="absolute -top-[92px] left-1/2 -translate-x-1/2 z-40 w-max">
                  <div className="relative bg-gray-950 border border-amber-500/40 rounded-xl px-3 py-2.5 flex flex-col items-center gap-2 shadow-2xl shadow-black/70">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">Dead Card</span>
                      <span className="text-[10px] text-gray-500">Both spots taken · costs your turn</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={confirmDeadCard}
                        className="bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:from-amber-500 active:to-amber-600 text-amber-950 font-semibold rounded-lg px-3 py-1 text-xs border border-amber-300/30 shadow-sm active:scale-95 transition-all duration-150"
                      >
                        Exchange
                      </button>
                      <button
                        onClick={() => setPendingDeadCard(null)}
                        className="text-gray-500 hover:text-gray-300 font-medium text-xs transition-colors duration-150"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-950 border-r border-b border-amber-500/40 rotate-45" />
                  </div>
                </div>
              )}
              {potential === 'complete' && (
                <span className="absolute -top-1 -right-1 z-20 w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.7)] ring-1 ring-gray-950" />
              )}
              {potential === 'near' && (
                <span className="absolute -top-1 -right-1 z-20 w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_6px_2px_rgba(251,191,36,0.6)] ring-1 ring-gray-950" />
              )}
              <CardComponent
                card={card}
                selected={isSelected}
                isDead={dead}
                isPending={isPending}
                dimmed={dimmed}
                onClick={() => handleCardClick(i)}
                disabled={!isMyTurn}
              />
            </div>
          )
        })}
      </div>

      {/* Contextual hint row */}
      {selectedCardIndex !== null && selectedCard && !selectedCard.hidden && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {highlightMode === 'remove' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block flex-shrink-0" />
              <span>One-eyed Jack — tap a highlighted chip to remove it</span>
            </>
          ) : selectedCard.rank === 'J2' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block flex-shrink-0" />
              <span>Wild Jack — tap any empty cell to place your chip</span>
            </>
          ) : null}
          {moveCount > 0 && (
            <span className="ml-1 bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
              {moveCount} {moveCount === 1 ? 'move' : 'moves'}
            </span>
          )}
          {moveCount === 0 && (
            <span className="ml-1 bg-gray-900/60 border border-white/8 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0">
              no moves
            </span>
          )}
        </div>
      )}
    </div>
  )
}
