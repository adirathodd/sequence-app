import { useRef, useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import Cell from './Cell'
import { playCard, exchangeDeadCard } from '../socket/socketClient'
import { getBestRunCells } from '../utils/sequenceHint'
import type { Cell as CellType, Sequence } from '../types/game'

// Fixed cell dimensions matching Tailwind w-11 (44px) + gap-0.5 (2px)
const CELL_SIZE = 44
const GAP = 2
const STRIDE = CELL_SIZE + GAP
const SVG_DIM = 10 * CELL_SIZE + 9 * GAP // 458px

const SEQ_STROKE: Record<string, string> = {
  blue: '#60a5fa',   // blue-400
  green: '#4ade80',  // green-400
  red: '#f87171',    // red-400
}

function sequenceLine(seq: Sequence) {
  if (seq.cells.length === 0) return null
  const sorted = [...seq.cells].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1])
  const [r1, c1] = sorted[0]
  const [r2, c2] = sorted[sorted.length - 1]
  return {
    x1: c1 * STRIDE + CELL_SIZE / 2,
    y1: r1 * STRIDE + CELL_SIZE / 2,
    x2: c2 * STRIDE + CELL_SIZE / 2,
    y2: r2 * STRIDE + CELL_SIZE / 2,
    color: SEQ_STROKE[seq.color ?? 'blue'] ?? '#94a3b8',
  }
}

export default function Board() {
  const {
    gameState, selectedCardIndex, highlightedCells, hintCells, highlightMode,
    myColor, myPlayerId, clearSelection, pendingDeadCardIndex,
  } = useGameStore()

  const prevBoardRef = useRef<CellType[][] | null>(null)
  const [animatingCell, setAnimatingCell] = useState<string | null>(null)

  const prevSeqCountRef = useRef(0)
  const [flashingCells, setFlashingCells] = useState<Map<string, string>>(new Map())
  const [contributingCells, setContributingCells] = useState<Set<string>>(new Set())

  const SEQ_FLASH_COLOR: Record<string, string> = {
    blue: '#93c5fd', green: '#86efac', red: '#fca5a5',
  }

  useEffect(() => {
    if (!gameState) { prevSeqCountRef.current = 0; return }
    if (gameState.sequences.length > prevSeqCountRef.current) {
      const cells = new Map<string, string>()
      gameState.sequences.slice(prevSeqCountRef.current).forEach(seq => {
        const color = SEQ_FLASH_COLOR[seq.color ?? 'blue'] ?? '#cbd5e1'
        seq.cells.forEach(([r, c]) => cells.set(`${r}-${c}`, color))
      })
      setFlashingCells(cells)
      const t = setTimeout(() => setFlashingCells(new Map()), 900)
      prevSeqCountRef.current = gameState.sequences.length
      return () => clearTimeout(t)
    }
    prevSeqCountRef.current = gameState.sequences.length
  }, [gameState?.sequences.length])

  useEffect(() => {
    if (!gameState) { prevBoardRef.current = null; return }
    const prev = prevBoardRef.current
    let t: ReturnType<typeof setTimeout> | null = null
    if (prev) {
      outer: for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (!prev[r][c].chip && gameState.board[r][c].chip) {
            setAnimatingCell(`${r}-${c}`)
            t = setTimeout(() => setAnimatingCell(null), 400)
            break outer
          }
        }
      }
    }
    prevBoardRef.current = gameState.board
    return () => { if (t) clearTimeout(t) }
  }, [gameState?.board])

  if (!gameState) return null

  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === myPlayerId
  const me = gameState.players.find(p => p.id === myPlayerId)
  const hasSelection = isMyTurn && selectedCardIndex !== null
  const isWildcard = selectedCardIndex !== null ? me?.hand[selectedCardIndex]?.rank === 'J2' : false

  function handleCellMouseEnter(r: number, c: number) {
    if (!isHighlighted(r, c) || !myColor) return
    const cells = getBestRunCells(gameState!.board, r, c, myColor)
    setContributingCells(new Set(cells.map(([cr, cc]) => `${cr}-${cc}`)))
  }

  function handleCellMouseLeave() {
    setContributingCells(new Set())
  }

  function isHighlighted(r: number, c: number): boolean {
    return hasSelection && highlightedCells.some(([hr, hc]) => hr === r && hc === c)
  }

  function isDimmed(r: number, c: number): boolean {
    return hasSelection && !isHighlighted(r, c)
  }

  function handleCellClick(r: number, c: number) {
    if (!isMyTurn || selectedCardIndex === null) return
    if (!isHighlighted(r, c)) return

    const card = me?.hand[selectedCardIndex]
    if (!card) return

    if (card.rank === 'J1') {
      playCard({ cardIndex: selectedCardIndex, removeRow: r, removeCol: c })
    } else {
      playCard({ cardIndex: selectedCardIndex, targetRow: r, targetCol: c })
    }

    clearSelection()

    if (pendingDeadCardIndex !== null) {
      exchangeDeadCard(pendingDeadCardIndex)
    }
  }

  return (
    <div className="overflow-auto p-2">
      <div className="relative inline-block rounded-xl border border-white/8 shadow-[0_0_0_1px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] bg-gray-950/60 p-2 backdrop-blur-sm">
        {/* Cell grid */}
        <div
          className="inline-grid gap-0.5"
          style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }}
        >
          {gameState.board.map((row, r) =>
            row.map((cell, c) => (
              <Cell
                key={`${r}-${c}`}
                cell={cell}
                isHighlighted={isHighlighted(r, c)}
                isDimmed={isDimmed(r, c)}
                highlightMode={highlightMode}
                sequenceHint={hintCells[`${r}-${c}`]}
                chipColor={myColor}
                isNew={animatingCell === `${r}-${c}`}
                flashColor={flashingCells.get(`${r}-${c}`)}
                isWildcard={isWildcard}
                isContributing={contributingCells.has(`${r}-${c}`)}
                onMouseEnter={() => handleCellMouseEnter(r, c)}
                onMouseLeave={handleCellMouseLeave}
                onClick={() => handleCellClick(r, c)}
              />
            ))
          )}
        </div>

        {/* Sequence line overlay */}
        {gameState.sequences.length > 0 && (
          <svg
            className="absolute top-2 left-2 pointer-events-none"
            width={SVG_DIM}
            height={SVG_DIM}
            xmlns="http://www.w3.org/2000/svg"
          >
            {gameState.sequences.map((seq, i) => {
              const line = sequenceLine(seq)
              if (!line) return null
              return (
                <line
                  key={i}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={line.color}
                  strokeWidth={CELL_SIZE * 0.8}
                  strokeLinecap="round"
                  opacity={hasSelection ? 0.18 : 0.65}
                />
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}
