"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const boardLayout_1 = require("./boardLayout");
(0, vitest_1.describe)('BOARD_LAYOUT', () => {
    (0, vitest_1.it)('is a 10x10 grid', () => {
        (0, vitest_1.expect)(boardLayout_1.BOARD_LAYOUT).toHaveLength(10);
        (0, vitest_1.expect)(boardLayout_1.BOARD_LAYOUT.every(row => row.length === 10)).toBe(true);
    });
    (0, vitest_1.it)('has exactly 4 FREE corners', () => {
        const free = boardLayout_1.BOARD_LAYOUT.flat().filter(c => c === 'XX');
        (0, vitest_1.expect)(free).toHaveLength(4);
    });
    (0, vitest_1.it)('FREE corners are at the four corners', () => {
        (0, vitest_1.expect)(boardLayout_1.BOARD_LAYOUT[0][0]).toBe('XX');
        (0, vitest_1.expect)(boardLayout_1.BOARD_LAYOUT[0][9]).toBe('XX');
        (0, vitest_1.expect)(boardLayout_1.BOARD_LAYOUT[9][0]).toBe('XX');
        (0, vitest_1.expect)(boardLayout_1.BOARD_LAYOUT[9][9]).toBe('XX');
    });
    (0, vitest_1.it)('has 96 non-FREE cells', () => {
        const nonFree = boardLayout_1.BOARD_LAYOUT.flat().filter(c => c !== 'XX');
        (0, vitest_1.expect)(nonFree).toHaveLength(96);
    });
    (0, vitest_1.it)('every non-Jack card appears exactly twice', () => {
        const counts = {};
        for (const cell of boardLayout_1.BOARD_LAYOUT.flat()) {
            if (cell === 'XX')
                continue;
            counts[cell] = (counts[cell] ?? 0) + 1;
        }
        const suits = ['S', 'H', 'D', 'C'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'Q', 'K', 'A'];
        for (const r of ranks) {
            for (const s of suits) {
                (0, vitest_1.expect)(counts[`${r}${s}`]).toBe(2);
            }
        }
    });
    (0, vitest_1.it)('no Jacks appear on the board', () => {
        const jacks = boardLayout_1.BOARD_LAYOUT.flat().filter(c => c.startsWith('J'));
        (0, vitest_1.expect)(jacks).toHaveLength(0);
    });
});
