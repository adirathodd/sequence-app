"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initBoard = initBoard;
exports.getBoardPositions = getBoardPositions;
const boardLayout_1 = require("../constants/boardLayout");
function parseCard(str) {
    const suit = str.slice(-1);
    const rank = str.slice(0, -1);
    const twoEyed = rank === 'J2' ? true : undefined;
    return { suit, rank, ...(twoEyed ? { twoEyed } : {}) };
}
function initBoard() {
    return boardLayout_1.BOARD_LAYOUT.map(row => row.map(str => ({
        card: str === 'XX' ? 'FREE' : parseCard(str),
        chip: null,
        sequenceId: null,
    })));
}
function getBoardPositions(card) {
    const key = `${card.rank}${card.suit}`;
    const positions = [];
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            if (boardLayout_1.BOARD_LAYOUT[r][c] === key)
                positions.push([r, c]);
        }
    }
    return positions;
}
