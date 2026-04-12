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

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2 flex-wrap justify-center">
        {me.hand.map((card, i) => {
          const dead = !card.hidden && isDeadCard(card, gameState!.board)
          const isSelected = selectedCardIndex === i
          const otherSelected = selectedCardIndex !== null && !isSelected
          const cardKey = card.hidden ? `hidden-${i}` : `${card.rank}${card.suit}`
          const potential = isMyTurn && !dead ? getCardPotential(card, gameState!.board, myColor) : null
          return (
            <div key={cardKey} className="relative animate-card-deal" style={{ animationDelay: `${i * 35}ms` }}>
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
                dimmed={otherSelected && isMyTurn}
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

      {pendingDeadCardIndex !== null && (
        <div className="flex items-center gap-3 bg-gray-950/80 backdrop-blur-sm border border-white/8 rounded-xl px-4 py-2.5 text-sm text-gray-300">
          <span className="text-yellow-400 text-base flex-shrink-0">⚠️</span>
          <span>Dead card — both spots taken. Exchange it? <span className="text-gray-600">(costs your turn)</span></span>
          <div className="flex gap-2 ml-1 flex-shrink-0">
            <button
              onClick={confirmDeadCard}
              className="bg-gradient-to-b from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 active:from-yellow-500 active:to-yellow-600 text-yellow-950 font-semibold shadow-sm shadow-yellow-900/30 border border-yellow-300/30 rounded-lg transition-all duration-200 active:scale-[0.97] px-3 py-1 text-xs"
            >
              Exchange
            </button>
            <button
              onClick={() => setPendingDeadCard(null)}
              className="text-gray-600 hover:text-gray-300 transition-colors duration-150 font-medium text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
