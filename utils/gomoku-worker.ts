import { getBestMove } from './gomoku-ai';

self.onmessage = (e) => {
  const { board, player, depth } = e.data;
  
  try {
    const move = getBestMove(board, player, depth);
    self.postMessage({ type: 'SUCCESS', move });
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', message: error.message });
  }
};
