type Player = 'X' | 'O' | null;

const BOARD_SIZE = 15;

// Weighting for heuristic evaluation
const WIN_SCORE = 10000000;
const OPEN_4_SCORE = 100000;
const BLOCKED_4_SCORE = 10000;
const OPEN_3_SCORE = 1000;
const BLOCKED_3_SCORE = 100;
const OPEN_2_SCORE = 10;
const BLOCKED_2_SCORE = 1;

/**
 * Returns the search depth based on the user's level (1-50).
 */
export function getAIDepth(level: number): number {
    if (level <= 10) return 1; // Beginner: 1 move ahead
    if (level <= 25) return 2; // Intermediate: 2 moves ahead
    if (level <= 40) return 3; // Advanced: 3 moves ahead (keeping it performant in JS)
    return 4;                  // Expert: 4 moves ahead (adds more strategic depth)
}

/**
 * Returns a randomness factor (0.0 to 1.0) based on the user's level.
 * Lower level = higher chance to make a suboptimal move.
 */
export function getRandomnessFactor(level: number): number {
    if (level <= 10) return 0.20; // 20% chance to play randomly
    if (level <= 25) return 0.10; // 10% chance
    if (level <= 40) return 0.05; // 5% chance
    return 0.0;                   // 0% chance (Expert plays perfectly according to its depth)
}

export function getBestMove(board: Player[][], aiPlayer: 'X' | 'O', level: number): { row: number; col: number } {
    const humanPlayer = aiPlayer === 'X' ? 'O' : 'X';

    // Count how many pieces are on the board
    let piecesOnBoard = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] !== null) piecesOnBoard++;
        }
    }

    // Force Expert level (50) for the first 20 rounds (<= 40 pieces on board)
    const effectiveLevel = piecesOnBoard <= 40 ? 50 : level;

    const maxDepth = getAIDepth(effectiveLevel);
    const randomness = getRandomnessFactor(effectiveLevel);

    // 1. Find all candidate moves
    const candidates = getCandidateMoves(board);

    if (candidates.length === 0) {
        return { row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) };
    }
    if (candidates.length === 1 && board[Math.floor(BOARD_SIZE / 2)][Math.floor(BOARD_SIZE / 2)] === null) {
        return { row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) };
    }

    // Inject Randomness (Human Error) for lower levels
    if (Math.random() < randomness) {
        // Pick a completely random candidate
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    let bestScore = -Infinity;
    let bestMoves: { row: number; col: number }[] = [];

    // Sort candidates by heuristic value to improve pruning
    const evaluatedCandidates = candidates.map(move => {
        board[move.row][move.col] = aiPlayer;
        const score = evaluateBoard(board, aiPlayer, humanPlayer, effectiveLevel);
        board[move.row][move.col] = null;
        return { move, score };
    }).sort((a, b) => b.score - a.score);

    // Take top N candidates to avoid lag (Beam search flavor)
    // Higher level = evaluate more candidates for better strategic choice
    const numCandidatesToEvaluate = effectiveLevel >= 41 ? 30 : 15;
    const topCandidates = evaluatedCandidates.slice(0, numCandidatesToEvaluate).map(c => c.move);

    for (const move of topCandidates) {
        board[move.row][move.col] = aiPlayer;
        const score = minimax(board, maxDepth - 1, -Infinity, Infinity, false, aiPlayer, humanPlayer, effectiveLevel);
        board[move.row][move.col] = null;

        if (score > bestScore) {
            bestScore = score;
            bestMoves = [move];
        } else if (score === bestScore) {
            bestMoves.push(move);
        }
    }

    if (bestMoves.length > 0) {
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    return candidates[0]; // fallback
}

function minimax(board: Player[][], depth: number, alpha: number, beta: number, isMaximizing: boolean, aiPlayer: 'X' | 'O', humanPlayer: 'X' | 'O', level: number): number {
    const score = evaluateBoard(board, aiPlayer, humanPlayer, level);

    // Terminal states
    if (score >= WIN_SCORE / 2) return score + depth; // Favor faster wins
    if (score <= -WIN_SCORE / 2) return score - depth; // Delay losses
    if (depth === 0) return score;

    const candidates = getCandidateMoves(board);
    if (candidates.length === 0) return 0; // Draw

    let limitedCandidates = candidates;
    const branchingFactor = level >= 41 ? 15 : 8; // Deeper tree requires restricting branching more strictly
    if (candidates.length > branchingFactor) {
        limitedCandidates = candidates.slice(0, branchingFactor);
    }

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of limitedCandidates) {
            board[move.row][move.col] = aiPlayer;
            const ev = minimax(board, depth - 1, alpha, beta, false, aiPlayer, humanPlayer, level);
            board[move.row][move.col] = null;
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break; // Prune
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of limitedCandidates) {
            board[move.row][move.col] = humanPlayer;
            const ev = minimax(board, depth - 1, alpha, beta, true, aiPlayer, humanPlayer, level);
            board[move.row][move.col] = null;
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break; // Prune
        }
        return minEval;
    }
}

function getCandidateMoves(board: Player[][]): { row: number; col: number }[] {
    const moves: { row: number; col: number }[] = [];
    const considered = new Set<string>();

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] !== null) {
                // Add all empty cells within a 2-cell radius
                for (let dr = -2; dr <= 2; dr++) {
                    for (let dc = -2; dc <= 2; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                            if (board[nr][nc] === null) {
                                const key = `${nr},${nc}`;
                                if (!considered.has(key)) {
                                    considered.add(key);
                                    moves.push({ row: nr, col: nc });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return moves;
}

// Evaluate board from the perspective of the AI player
function evaluateBoard(board: Player[][], aiPlayer: 'X' | 'O', humanPlayer: 'X' | 'O', level: number): number {
    let score = 0;
    score += evaluateLines(board, aiPlayer, level);

    // The defensive bias. For beginners, they might ignore blocks.
    let defensiveBias = 1.1;
    if (level <= 10) {
        defensiveBias = 0.5; // Beginner ignores opponent threats often
    } else if (level <= 25) {
        defensiveBias = 1.2; // Intermediate focuses heavily on blocking (blocks lines of 4)
    } else {
        defensiveBias = 1.5; // Advanced/Expert are very defensive while planning attacks
    }

    score -= evaluateLines(board, humanPlayer, level) * defensiveBias;

    // Center Control heuristic for Experts
    if (level >= 41) {
        score += evaluateCenterControl(board, aiPlayer);
    }

    return score;
}

function evaluateCenterControl(board: Player[][], player: 'X' | 'O'): number {
    let score = 0;
    const center = Math.floor(BOARD_SIZE / 2);
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === player) {
                // Closer to center is better (max distance is ~10)
                const dist = Math.abs(r - center) + Math.abs(c - center);
                score += (10 - dist) * 2; // Minor point nudge for center
            }
        }
    }
    return score;
}

function evaluateLines(board: Player[][], player: 'X' | 'O', level: number): number {
    let totalScore = 0;
    const directions = [
        [1, 0],  // Horizontal
        [0, 1],  // Vertical
        [1, 1],  // Diagonal /
        [1, -1]  // Diagonal \
    ];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === player) {
                for (const [dx, dy] of directions) {
                    totalScore += evaluateDirection(board, r, c, dx, dy, player, level);
                }
            }
        }
    }
    return totalScore;
}

function evaluateDirection(board: Player[][], r: number, c: number, dx: number, dy: number, player: 'X' | 'O', level: number): number {
    let count = 1;
    let blockedFront = false;
    let blockedBack = false;

    // Check backward
    const br = r - dy;
    const bc = c - dx;
    if (br < 0 || br >= BOARD_SIZE || bc < 0 || bc >= BOARD_SIZE || board[br][bc] !== null) {
        if (br >= 0 && br < BOARD_SIZE && bc >= 0 && bc < BOARD_SIZE && board[br][bc] === player) {
            return 0; // Already counted when evaluating from the earlier piece
        }
        blockedBack = true;
    }

    // Check forward
    let fr = r + dy;
    let fc = c + dx;
    while (fr >= 0 && fr < BOARD_SIZE && fc >= 0 && fc < BOARD_SIZE && board[fr][fc] === player) {
        count++;
        fr += dy;
        fc += dx;
    }

    if (fr < 0 || fr >= BOARD_SIZE || fc < 0 || fc >= BOARD_SIZE || board[fr][fc] !== null) {
        blockedFront = true;
    }

    // Calculate score based on gomoku heuristics
    if (count >= 5) return WIN_SCORE;

    if (count === 4) {
        if (!blockedFront && !blockedBack) return OPEN_4_SCORE;
        if (!blockedFront || !blockedBack) return BLOCKED_4_SCORE;
    }

    if (count === 3) {
        // Beginners might not see open 3s
        if (level <= 10) return OPEN_3_SCORE / 10;

        if (!blockedFront && !blockedBack) return OPEN_3_SCORE;
        if (!blockedFront || !blockedBack) return BLOCKED_3_SCORE;
    }

    if (count === 2) {
        if (!blockedFront && !blockedBack) return OPEN_2_SCORE;
        if (!blockedFront || !blockedBack) return BLOCKED_2_SCORE;
    }

    return 0;
}
