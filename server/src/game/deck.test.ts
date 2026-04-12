import { describe, it, expect } from 'vitest'
import { createDeck, shuffle, deal, reshuffleDiscards } from './deck'

describe('createDeck', () => {
  it('produces 104 cards', () => {
    expect(createDeck()).toHaveLength(104)
  })

  it('has exactly 4 one-eyed Jacks (J1)', () => {
    const j1 = createDeck().filter(c => c.rank === 'J1')
    expect(j1).toHaveLength(4)
  })

  it('has exactly 4 two-eyed Jacks (J2)', () => {
    const j2 = createDeck().filter(c => c.rank === 'J2')
    expect(j2).toHaveLength(4)
  })

  it('two-eyed Jacks have twoEyed: true', () => {
    const j2 = createDeck().filter(c => c.rank === 'J2')
    expect(j2.every(c => c.twoEyed === true)).toBe(true)
  })

  it('has no jokers or unknown ranks', () => {
    const validRanks = new Set(['2','3','4','5','6','7','8','9','T','Q','K','A','J1','J2'])
    expect(createDeck().every(c => validRanks.has(c.rank))).toBe(true)
  })
})

describe('shuffle', () => {
  it('returns same number of cards', () => {
    const deck = createDeck()
    expect(shuffle(deck)).toHaveLength(104)
  })

  it('does not mutate the input deck', () => {
    const deck = createDeck()
    const copy = [...deck]
    shuffle(deck)
    expect(deck).toEqual(copy)
  })
})

describe('deal', () => {
  it('returns correct hand size and remaining deck', () => {
    const deck = createDeck()
    const { hand, remaining } = deal(deck, 7)
    expect(hand).toHaveLength(7)
    expect(remaining).toHaveLength(97)
  })
})

describe('reshuffleDiscards', () => {
  it('returns same number of cards as discards', () => {
    const discards = createDeck().slice(0, 20)
    expect(reshuffleDiscards(discards)).toHaveLength(20)
  })
})
