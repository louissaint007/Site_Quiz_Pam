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

export function getBestMove(board: Player[][], aiPlayer: 'X' | 'O', maxDepth: number = 3): { row: number; col: number } {
  const humanPlayer = aiPlayer === 'X' ? 'O' : 'X';
  
  // 1. Find all candidate moves (cells adjacent to existing pieces up to distance 2)
  const candidates = getCandidateMoves(board);
  
  // If first move of game, play center or randomly near center
  if (candidates.length === 0) {
    return { row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) };
  }
  if (candidates.length === 1 && board[Math.floor(BOARD_SIZE / 2)][Math.floor(BOARD_SIZE / 2)] === null) {
      // just play center if only one piece exists and center is free
      return {row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2)};
  }

  let bestScore = -Infinity;
  let bestMoves: { row: number; col: number }[] = [];
  
  // Sort candidates roughly by heuristic value to improve alpha-beta pruning effectiveness
  const evaluatedCandidates = candidates.map(move => {
    board[move.row][move.col] = aiPlayer;
    const score = evaluateBoard(board, aiPlayer, humanPlayer);
    board[move.row][move.col] = null;
    return { move, score };
  }).sort((a, b) => b.score - a.score);

  // Take top N candidates to avoid lag (Beam search flavor)
  const topCandidates = evaluatedCandidates.slice(0, 20).map(c => c.move);

  for (const move of topCandidates) {
    board[move.row][move.col] = aiPlayer;
    const score = minimax(board, maxDepth - 1, -Infinity, Infinity, false, aiPlayer, humanPlayer);
    board[move.row][move.col] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  // Pick random among the best equivalent moves to add variety
  if (bestMoves.length > 0) {
      return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }
  
  return candidates[0]; // fallback
}

function minimax(board: Player[][], depth: number, alpha: number, beta: number, isMaximizing: boolean, aiPlayer: 'X' | 'O', humanPlayer: 'X' | 'O'): number {
  const score = evaluateBoard(board, aiPlayer, humanPlayer);
  
  // Terminal states
  if (score >= WIN_SCORE / 2) return score + depth; // Favor faster wins
  if (score <= -WIN_SCORE / 2) return score - depth; // Delay losses
  if (depth === 0) return score;

  const candidates = getCandidateMoves(board);
  if (candidates.length === 0) return 0; // Draw

  // Take top 10 moves for deeper layers to keep computation bounded < 1 second
  let limitedCandidates = candidates;
  if (candidates.length > 10) {
      limitedCandidates = candidates.slice(0, 10);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of limitedCandidates) {
      board[move.row][move.col] = aiPlayer;
      const ev = minimax(board, depth - 1, alpha, beta, false, aiPlayer, humanPlayer);
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
      const ev = minimax(board, depth - 1, alpha, beta, true, aiPlayer, humanPlayer);
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
function evaluateBoard(board: Player[][], aiPlayer: 'X' | 'O', humanPlayer: 'X' | 'O'): number {
  let score = 0;
  score += evaluateLines(board, aiPlayer);
  score -= evaluateLines(board, humanPlayer) * 1.1; // Bias slightly to block opponent (defensive)
  return score;
}

function evaluateLines(board: Player[][], player: 'X' | 'O'): number {
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
          totalScore += evaluateDirection(board, r, c, dx, dy, player);
        }
      }
    }
  }
  return totalScore;
}

function evaluateDirection(board: Player[][], r: number, c: number, dx: number, dy: number, player: 'X' | 'O'): number {
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
    if (!blockedFront && !blockedBack) return OPEN_3_SCORE;
    if (!blockedFront || !blockedBack) return BLOCKED_3_SCORE;
  }

  if (count === 2) {
      if (!blockedFront && !blockedBack) return OPEN_2_SCORE;
      if (!blockedFront || !blockedBack) return BLOCKED_2_SCORE;
  }

  return 0;
}
