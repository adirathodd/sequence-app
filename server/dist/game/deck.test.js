"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const deck_1 = require("./deck");
(0, vitest_1.describe)('createDeck', () => {
    (0, vitest_1.it)('produces 104 cards', () => {
        (0, vitest_1.expect)((0, deck_1.createDeck)()).toHaveLength(104);
    });
    (0, vitest_1.it)('has exactly 4 one-eyed Jacks (J1)', () => {
        const j1 = (0, deck_1.createDeck)().filter(c => c.rank === 'J1');
        (0, vitest_1.expect)(j1).toHaveLength(4);
    });
    (0, vitest_1.it)('has exactly 4 two-eyed Jacks (J2)', () => {
        const j2 = (0, deck_1.createDeck)().filter(c => c.rank === 'J2');
        (0, vitest_1.expect)(j2).toHaveLength(4);
    });
    (0, vitest_1.it)('two-eyed Jacks have twoEyed: true', () => {
        const j2 = (0, deck_1.createDeck)().filter(c => c.rank === 'J2');
        (0, vitest_1.expect)(j2.every(c => c.twoEyed === true)).toBe(true);
    });
    (0, vitest_1.it)('has no jokers or unknown ranks', () => {
        const validRanks = new Set(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'Q', 'K', 'A', 'J1', 'J2']);
        (0, vitest_1.expect)((0, deck_1.createDeck)().every(c => validRanks.has(c.rank))).toBe(true);
    });
});
(0, vitest_1.describe)('shuffle', () => {
    (0, vitest_1.it)('returns same number of cards', () => {
        const deck = (0, deck_1.createDeck)();
        (0, vitest_1.expect)((0, deck_1.shuffle)(deck)).toHaveLength(104);
    });
    (0, vitest_1.it)('does not mutate the input deck', () => {
        const deck = (0, deck_1.createDeck)();
        const copy = [...deck];
        (0, deck_1.shuffle)(deck);
        (0, vitest_1.expect)(deck).toEqual(copy);
    });
});
(0, vitest_1.describe)('deal', () => {
    (0, vitest_1.it)('returns correct hand size and remaining deck', () => {
        const deck = (0, deck_1.createDeck)();
        const { hand, remaining } = (0, deck_1.deal)(deck, 7);
        (0, vitest_1.expect)(hand).toHaveLength(7);
        (0, vitest_1.expect)(remaining).toHaveLength(97);
    });
});
(0, vitest_1.describe)('reshuffleDiscards', () => {
    (0, vitest_1.it)('returns same number of cards as discards', () => {
        const discards = (0, deck_1.createDeck)().slice(0, 20);
        (0, vitest_1.expect)((0, deck_1.reshuffleDiscards)(discards)).toHaveLength(20);
    });
});
