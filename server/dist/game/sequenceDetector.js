"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectNewSequences = detectNewSequences;
exports.lockSequences = lockSequences;
const DIRECTIONS = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal ↘
    [1, -1], // diagonal ↙
];
function cellMatchesColor(cell, color) {
    return cell.chip === color || cell.card === 'FREE';
}
function coordsInSequence(seq, r, c) {
    return seq.cells.some(([sr, sc]) => sr === r && sc === c);
}
function detectNewSequences(board, color, placedRow, placedCol, existing) {
    const found = [];
    for (const [dr, dc] of DIRECTIONS) {
        // Collect the full run of matching cells along this direction through the placed cell
        const run = [];
        // Start 4 steps back and collect up to 9 cells
        for (let i = -4; i <= 4; i++) {
            const r = placedRow + dr * i;
            const c = placedCol + dc * i;
            if (r < 0 || r >= 10 || c < 0 || c >= 10)
                continue;
            if (cellMatchesColor(board[r][c], color)) {
                run.push([r, c]);
            }
            else {
                // Non-matching cell breaks the run — check what we have so far
                if (run.length >= 5)
                    tryAddSequence(run, existing, found, color, placedRow, placedCol);
                run.length = 0;
            }
        }
        if (run.length >= 5)
            tryAddSequence(run, existing, found, color, placedRow, placedCol);
    }
    return found;
}
function tryAddSequence(run, existing, found, color, placedRow, placedCol) {
    for (let start = 0; start <= run.length - 5; start++) {
        const window = run.slice(start, start + 5);
        // Must include the newly placed cell
        if (!window.some(([r, c]) => r === placedRow && c === placedCol))
            continue;
        // Each existing same-color sequence may share at most 1 cell with this window.
        // (The game rule: you may reuse "any one space" from a prior sequence.)
        const invalidOverlap = [...existing, ...found].some(seq => {
            if (seq.color !== color)
                return false;
            const shared = window.filter(([r, c]) => coordsInSequence(seq, r, c)).length;
            return shared > 1;
        });
        if (invalidOverlap)
            continue;
        found.push({ color, cells: window });
        break;
    }
}
function lockSequences(board, sequences) {
    const next = board.map(r => r.map(c => ({ ...c })));
    for (const seq of sequences) {
        const id = sequences.indexOf(seq);
        for (const [r, c] of seq.cells) {
            if (next[r][c].sequenceId === null) {
                next[r][c] = { ...next[r][c], sequenceId: id };
            }
        }
    }
    return next;
}
