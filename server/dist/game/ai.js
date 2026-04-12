"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseAIMove = chooseAIMove;
const rules_1 = require("./rules");
const board_1 = require("./board");
const rules_2 = require("./rules");
const sequenceDetector_1 = require("./sequenceDetector");
function countAlignedNeighbors(board, row, col, color) {
    const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
    let max = 0;
    for (const [dr, dc] of DIRS) {
        let count = 0;
        for (let i = -4; i <= 4; i++) {
            const r = row + dr * i;
            const c = col + dc * i;
            if (r < 0 || r >= 10 || c < 0 || c >= 10)
                continue;
            if (board[r][c].chip === color || board[r][c].card === 'FREE')
                count++;
            else
                count = 0;
            if (count > max)
                max = count;
        }
    }
    return max;
}
function centerBonus(row, col) {
    return Math.round((10 - Math.abs(row - 4.5) - Math.abs(col - 4.5)) * 3);
}
function scoreMove(move, state, aiColor, oppColor) {
    let score = 0;
    if (move.targetRow !== undefined && move.targetCol !== undefined) {
        const r = move.targetRow;
        const c = move.targetCol;
        const simBoard = (0, rules_2.applyChipPlacement)(state.board, r, c, aiColor);
        // Win immediately
        const newSeqs = (0, sequenceDetector_1.detectNewSequences)(simBoard, aiColor, r, c, state.sequences);
        if (newSeqs.length > 0)
            score += 10000;
        // Extend own run
        score += countAlignedNeighbors(state.board, r, c, aiColor) * 200;
        // Block opponent from winning
        const oppSim = (0, rules_2.applyChipPlacement)(state.board, r, c, oppColor);
        const oppSeqs = (0, sequenceDetector_1.detectNewSequences)(oppSim, oppColor, r, c, state.sequences);
        if (oppSeqs.length > 0)
            score += 8000;
        // Disrupt opponent run
        score += countAlignedNeighbors(state.board, r, c, oppColor) * 150;
        score += centerBonus(r, c);
    }
    if (move.removeRow !== undefined && move.removeCol !== undefined) {
        const r = move.removeRow;
        const c = move.removeCol;
        // Prefer removing chips that are part of long runs
        score += countAlignedNeighbors(state.board, r, c, oppColor) * 300 - 100;
    }
    return score;
}
function chooseAIMove(state, aiPlayerIndex) {
    const ai = state.players[aiPlayerIndex];
    const aiColor = ai.color;
    // All unique opponent team colors
    const oppColors = [...new Set(state.players
            .filter(p => p.color !== aiColor)
            .map(p => p.color)
            .filter((c) => c !== null))];
    // Focus on the opponent team with the most sequences (biggest threat)
    const primaryOppColor = oppColors.reduce((best, c) => {
        if (best === null)
            return c;
        const cSeqs = state.sequences.filter(s => s.color === c).length;
        const bestSeqs = state.sequences.filter(s => s.color === best).length;
        return cSeqs >= bestSeqs ? c : best;
    }, oppColors[0] ?? null);
    let bestScore = -Infinity;
    let bestMove = null;
    for (let cardIndex = 0; cardIndex < ai.hand.length; cardIndex++) {
        const card = ai.hand[cardIndex];
        // Exchange dead cards immediately
        if ((0, rules_1.isDeadCard)(card, state.board)) {
            return { cardIndex };
        }
        if (card.rank === 'J2') {
            // Two-eyed Jack: try every empty cell
            for (let r = 0; r < 10; r++) {
                for (let c = 0; c < 10; c++) {
                    const cell = state.board[r][c];
                    if (cell.chip !== null || cell.card === 'FREE')
                        continue;
                    const move = { cardIndex, targetRow: r, targetCol: c };
                    const s = scoreMove(move, state, aiColor, primaryOppColor);
                    if (s > bestScore) {
                        bestScore = s;
                        bestMove = move;
                    }
                }
            }
            continue;
        }
        if (card.rank === 'J1') {
            // One-eyed Jack: try removing any unlocked opponent chip
            for (let r = 0; r < 10; r++) {
                for (let c = 0; c < 10; c++) {
                    const cell = state.board[r][c];
                    const isOppChip = cell.chip !== null && cell.chip !== aiColor;
                    if (!isOppChip || cell.sequenceId !== null)
                        continue;
                    const move = { cardIndex, removeRow: r, removeCol: c };
                    const s = scoreMove(move, state, aiColor, cell.chip);
                    if (s > bestScore) {
                        bestScore = s;
                        bestMove = move;
                    }
                }
            }
            continue;
        }
        // Normal card: try valid positions
        const positions = (0, board_1.getBoardPositions)(card);
        for (const [r, c] of positions) {
            if (state.board[r][c].chip !== null)
                continue;
            const move = { cardIndex, targetRow: r, targetCol: c };
            const s = scoreMove(move, state, aiColor, primaryOppColor);
            if (s > bestScore) {
                bestScore = s;
                bestMove = move;
            }
        }
    }
    return bestMove ?? { cardIndex: 0 };
}
