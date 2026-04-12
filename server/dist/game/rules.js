"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDeadCard = isDeadCard;
exports.validateTurn = validateTurn;
exports.applyChipPlacement = applyChipPlacement;
exports.removeChip = removeChip;
const board_1 = require("./board");
function isDeadCard(card, board) {
    if (card.rank === 'J1' || card.rank === 'J2')
        return false;
    const positions = (0, board_1.getBoardPositions)(card);
    return positions.every(([r, c]) => board[r][c].chip !== null);
}
function validateTurn(payload, playerIndex, state) {
    if (state.currentPlayerIndex !== playerIndex) {
        return { valid: false, error: 'Not your turn' };
    }
    const player = state.players[playerIndex];
    const { cardIndex, targetRow, targetCol, removeRow, removeCol } = payload;
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
        return { valid: false, error: 'Invalid card index' };
    }
    const card = player.hand[cardIndex];
    // Two-eyed Jack: place chip on any empty cell
    if (card.rank === 'J2') {
        if (targetRow === undefined || targetCol === undefined) {
            return { valid: false, error: 'Two-eyed Jack requires a target cell' };
        }
        const cell = state.board[targetRow][targetCol];
        if (cell.card === 'FREE')
            return { valid: false, error: 'Cannot target a FREE corner' };
        if (cell.chip !== null)
            return { valid: false, error: 'Cell is already occupied' };
        return { valid: true };
    }
    // One-eyed Jack: remove an opponent chip
    if (card.rank === 'J1') {
        if (removeRow === undefined || removeCol === undefined) {
            return { valid: false, error: 'One-eyed Jack requires a target cell to remove' };
        }
        const cell = state.board[removeRow][removeCol];
        if (cell.chip === null || cell.chip === player.color) {
            return { valid: false, error: 'Can only remove an opponent chip' };
        }
        if (cell.sequenceId !== null) {
            return { valid: false, error: 'Cannot remove a chip from a completed sequence' };
        }
        return { valid: true };
    }
    // Normal card
    if (targetRow === undefined || targetCol === undefined) {
        return { valid: false, error: 'Must select a target cell' };
    }
    const cell = state.board[targetRow][targetCol];
    if (cell.card === 'FREE')
        return { valid: false, error: 'Cannot target a FREE corner directly' };
    if (cell.chip !== null)
        return { valid: false, error: 'Cell is already occupied' };
    const cellCardKey = `${cell.card.rank}${cell.card.suit}`;
    const playedCardKey = `${card.rank}${card.suit}`;
    if (cellCardKey !== playedCardKey) {
        return { valid: false, error: 'Card does not match target cell' };
    }
    return { valid: true };
}
function applyChipPlacement(board, row, col, color) {
    const next = board.map(r => r.map(c => ({ ...c })));
    next[row][col] = { ...next[row][col], chip: color };
    return next;
}
function removeChip(board, row, col) {
    const next = board.map(r => r.map(c => ({ ...c })));
    next[row][col] = { ...next[row][col], chip: null };
    return next;
}
