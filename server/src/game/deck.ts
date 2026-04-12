import { Card, Suit, Rank } from '../types/game'

const SUITS: Suit[] = ['S', 'H', 'D', 'C']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'Q', 'K', 'A']

// One-eyed Jacks: JS, JC — anti-wild
// Two-eyed Jacks: JH, JD — wild
const JACKS: Card[] = [
  { suit: 'S', rank: 'J1' },
  { suit: 'C', rank: 'J1' },
  { suit: 'H', rank: 'J2', twoEyed: true },
  { suit: 'D', rank: 'J2', twoEyed: true },
]

function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
    deck.push(...JACKS.filter(j => j.suit === suit))
  }
  return deck
}

export function createDeck(): Card[] {
  return [...buildDeck(), ...buildDeck()]
}

export function shuffle(deck: Card[]): Card[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

export function deal(deck: Card[], count: number): { hand: Card[]; remaining: Card[] } {
  return {
    hand: deck.slice(0, count),
    remaining: deck.slice(count),
  }
}

export function reshuffleDiscards(discards: Card[]): Card[] {
  return shuffle([...discards])
}
