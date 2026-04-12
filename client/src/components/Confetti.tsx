import { useMemo } from 'react'

const COLORS = ['#6366f1', '#a78bfa', '#fbbf24', '#34d399', '#f87171', '#60a5fa', '#e879f9', '#fb923c']

function rand(a: number, b: number) { return a + Math.random() * (b - a) }

interface Piece {
  id: number; color: string; x: number
  delay: number; duration: number; size: number; circle: boolean
}

export default function Confetti() {
  const pieces = useMemo<Piece[]>(() =>
    Array.from({ length: 65 }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      x: rand(0, 100),
      delay: rand(0, 1.8),
      duration: rand(2.4, 4.8),
      size: rand(6, 13),
      circle: Math.random() > 0.45,
    })), [])

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '-20px',
            width: p.size,
            height: p.circle ? p.size : p.size * 0.55,
            backgroundColor: p.color,
            borderRadius: p.circle ? '50%' : '2px',
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  )
}
