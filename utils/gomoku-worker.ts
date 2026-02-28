import { getBestMove } from './mopyonEngine';

self.onmessage = (e) => {
  const { board, player, level } = e.data;

  try {
    const move = getBestMove(board, player, level || 1);
    self.postMessage({ type: 'SUCCESS', move });
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', message: error.message });
  }
};
