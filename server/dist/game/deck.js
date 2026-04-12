"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeck = createDeck;
exports.shuffle = shuffle;
exports.deal = deal;
exports.reshuffleDiscards = reshuffleDiscards;
const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'Q', 'K', 'A'];
// One-eyed Jacks: JS, JC — anti-wild
// Two-eyed Jacks: JH, JD — wild
const JACKS = [
    { suit: 'S', rank: 'J1' },
    { suit: 'C', rank: 'J1' },
    { suit: 'H', rank: 'J2', twoEyed: true },
    { suit: 'D', rank: 'J2', twoEyed: true },
];
function buildDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
        deck.push(...JACKS.filter(j => j.suit === suit));
    }
    return deck;
}
function createDeck() {
    return [...buildDeck(), ...buildDeck()];
}
function shuffle(deck) {
    const d = [...deck];
    for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
}
function deal(deck, count) {
    return {
        hand: deck.slice(0, count),
        remaining: deck.slice(count),
    };
}
function reshuffleDiscards(discards) {
    return shuffle([...discards]);
}
