import { EtherealShadow } from './ethereal-shadow'

const SUITS = ['♠', '♥', '♦', '♣']

interface SuitProps {
  char: string
  className: string
}
function SuitMark({ char, className }: SuitProps) {
  return (
    <span
      aria-hidden="true"
      className={`absolute select-none pointer-events-none font-black text-white/[0.04] ${className}`}
    >
      {char}
    </span>
  )
}

/** Full-screen background for lobby & waiting screens. */
export function LobbyBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">

      {/* Base colour */}
      <div className="absolute inset-0 bg-[#030712]" />

      {/* ── Primary animated blob – indigo/blue, top-right ── */}
      <div className="absolute -top-1/4 -right-1/4 w-3/4 h-3/4 lobby-glow-a opacity-90">
        <EtherealShadow
          color="rgba(67, 56, 202, 1)"
          animation={{ scale: 70, speed: 28 }}
          noise={{ opacity: 0, scale: 1 }}
          sizing="fill"
        />
      </div>

      {/* ── Secondary animated blob – violet/purple, bottom-left ── */}
      <div className="absolute -bottom-1/4 -left-1/4 w-2/3 h-2/3 lobby-glow-b opacity-75">
        <EtherealShadow
          color="rgba(139, 92, 246, 1)"
          animation={{ scale: 55, speed: 22 }}
          noise={{ opacity: 0, scale: 1 }}
          sizing="fill"
        />
      </div>

      {/* ── Noise layer (single instance shared above both blobs) ── */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: `url("https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png")`,
          backgroundSize: '260px',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* ── Vignette – dark ellipse punched out of the centre ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_50%,transparent_40%,#030712_88%)]" />

      {/* ── Top-edge fade so nothing bleeds into the header gap ── */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#030712] to-transparent" />

      {/* ── Card-suit watermarks ── */}
      <SuitMark char="♠" className="top-[8%]  left-[6%]  text-[7rem] rotate-[-12deg]" />
      <SuitMark char="♥" className="top-[12%] right-[7%] text-[9rem] rotate-[8deg]  text-red-400/[0.05]" />
      <SuitMark char="♦" className="bottom-[10%] left-[8%]  text-[8rem] rotate-[15deg] text-red-400/[0.05]" />
      <SuitMark char="♣" className="bottom-[8%]  right-[6%] text-[7rem] rotate-[-9deg]" />
    </div>
  )
}

/** Subtle static background for the in-game screen. */
export function GameBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">

      {/* Base */}
      <div className="absolute inset-0 bg-[#030712]" />

      {/* Dot grid — echoes the board's own grid */}
      <div className="absolute inset-0 game-dot-grid" />

      {/* Corner glows — stay out of the board area */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_0%_0%,rgba(99,102,241,0.10)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_100%,rgba(59,130,246,0.08)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_100%_0%,rgba(168,85,247,0.07)_0%,transparent_70%)]" />

      {/* Strong centre suppression — keeps the board area near-black */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,transparent_20%,rgba(3,7,18,0.55)_70%)]" />
    </div>
  )
}

export { SUITS }
