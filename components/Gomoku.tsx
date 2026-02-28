import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { Mascotte3D } from './Mascotte3D';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { UserProfile } from '../types';

interface GomokuProps {
  user: UserProfile;
  onExit: () => void;
}

const BOARD_SIZE = 15;
type Player = 'X' | 'O' | null;
type Position = { row: number; col: number };

export const Gomoku: React.FC<GomokuProps> = ({ user, onExit }) => {
  const [board, setBoard] = useState<Player[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<Player | 'draw'>(null);
  const [winningLine, setWinningLine] = useState<Position[]>([]);
  const [gameState3D, setGameState3D] = useState<'idle' | 'win' | 'lose'>('idle');
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [gameMode, setGameMode] = useState<'pvp' | 'pve' | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [boardHistory, setBoardHistory] = useState<Player[][][]>([]);
  const [allowAdRevive, setAllowAdRevive] = useState<boolean>(false);
  const [showAd, setShowAd] = useState<boolean>(false);
  const [mascotUrl, setMascotUrl] = useState<string | undefined>(undefined);
  const [xpRewardToast, setXpRewardToast] = useState<string | null>(null);

  // Fetch site settings to check if ad revive is enabled and load custom mascot
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('allow_gomoku_ad_revive, mopyon_mascot_url').eq('id', 1).single();
      if (data?.allow_gomoku_ad_revive) {
        setAllowAdRevive(true);
      }
      if (data?.mopyon_mascot_url) {
        setMascotUrl(data.mopyon_mascot_url);
      }
    };
    fetchSettings();
  }, []);

  // Trigger AI move if it's PvE mode and it is O's turn
  useEffect(() => {
    if (gameMode === 'pve' && currentPlayer === 'O' && !winner) {
      setIsAiThinking(true);
      
      const worker = new Worker(new URL('../utils/gomoku-worker.ts', import.meta.url), { type: 'module' });
      
      worker.onmessage = (e) => {
        setIsAiThinking(false);
        if (e.data.type === 'SUCCESS') {
          const move = e.data.move;
          handleCellClick(move.row, move.col, true);
        } else {
          console.error("AI Worker Error:", e.data.message);
        }
        worker.terminate();
      };

      // Delay to let UI render the last move and feel "human"
      const timer = setTimeout(() => {
        worker.postMessage({ board, player: 'O', depth: 3 });
      }, 500);
      
      return () => {
        clearTimeout(timer);
        worker.terminate();
      };
    }
  }, [currentPlayer, gameMode, winner]); // Deliberately omit board, isAiThinking, and handleCellClick to prevent cancellation loops

  // Win checking logic (exactly 5 in a row)
  const checkWin = useCallback((currentBoard: Player[][], player: 'X' | 'O', lastMove: Position) => {
    const directions = [
      [1, 0],  // Horizontal
      [0, 1],  // Vertical
      [1, 1],  // Diagonal /
      [1, -1]  // Diagonal \
    ];

    for (const [dx, dy] of directions) {
      let count = 1;
      let line: Position[] = [{ ...lastMove }];

      // Check positive direction
      for (let i = 1; i < 5; i++) {
        const r = lastMove.row + i * dy;
        const c = lastMove.col + i * dx;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
          count++;
          line.push({ row: r, col: c });
        } else {
          break;
        }
      }

      // Check negative direction
      for (let i = 1; i < 5; i++) {
        const r = lastMove.row - i * dy;
        const c = lastMove.col - i * dx;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
          count++;
          line.push({ row: r, col: c });
        } else {
          break;
        }
      }

      // Exactly 5 in a row rules in traditional Gomoku
      if (count === 5) {
        return line;
      }
    }
    return null;
  }, []);

  const checkDraw = (currentBoard: Player[][]) => {
    return currentBoard.every(row => row.every(cell => cell !== null));
  };

  const handleCellClick = (row: number, col: number, isAiMove: boolean = false) => {
    if (!gameMode) return;
    if (gameMode === 'pve' && currentPlayer === 'O' && !isAiMove) return;
    if (winner || board[row][col] !== null) return;

    setBoardHistory(prev => [...prev, board.map(r => [...r])]);

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    const winLine = checkWin(newBoard, currentPlayer, { row, col });

    if (winLine) {
      setWinner(currentPlayer);
      setWinningLine(winLine);
      setScores(prev => ({ ...prev, [currentPlayer]: prev[currentPlayer] + 1 }));
      setGameState3D('win');
      saveMatchResult(currentPlayer);
    } else if (checkDraw(newBoard)) {
      setWinner('draw');
      setGameState3D('lose');
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };

  const resetGame = () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    setBoardHistory([]);
    setShowAd(false);
    setWinner(null);
    setWinningLine([]);
    setGameState3D('idle');
    // Start with the loser of the last match, or X by default
    setCurrentPlayer('X'); 
  };

  const saveMatchResult = async (winningPlayer: 'X' | 'O') => {
    // Stub for persistence logic as requested
    console.log(`Saving Mòpyon match... Winner: ${winningPlayer}, User: ${user.username}`);
    try {
      // Award XP to the human player if they win
      if (winningPlayer === 'X') {
        const newXp = (user.xp || 0) + 50;
        const newWins = (user.total_wins || 0) + 1;
        await supabase.from('profiles').update({ xp: newXp, total_wins: newWins }).eq('id', user.id);
        
        setXpRewardToast('+50 XP Jwenn!');
        setTimeout(() => setXpRewardToast(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isWinningCell = (r: number, c: number) => {
    return winningLine.some(pos => pos.row === r && pos.col === c);
  };

  const handleWatchAd = () => {
    setShowAd(true);
    // Simulate 3 seconds Ad
    setTimeout(() => {
      executeRewind();
      setShowAd(false);
    }, 3000);
  };

  const executeRewind = () => {
    if (boardHistory.length < 2) return;
    
    // Rewind 2 moves (undo AI's last move, and undo Player's last mistake move)
    const historyCopy = [...boardHistory];
    const previousBoard = historyCopy[historyCopy.length - 2];
    
    setBoard(previousBoard.map(r => [...r]));
    setBoardHistory(historyCopy.slice(0, historyCopy.length - 2));
    
    setWinner(null);
    setWinningLine([]);
    setGameState3D('idle');
    setCurrentPlayer('X'); // Back to player's turn (assuming player is always X in PvE)
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] max-w-7xl mx-auto gap-8 p-4">
        
      {/* HUD & 3D Mascot Panel (Left Side) */}
      <div className="lg:w-1/3 flex flex-col gap-6 bg-amber-50 rounded-[2.5rem] border-4 border-amber-900 shadow-[8px_8px_0_0_rgba(120,53,15,1)] p-6 overflow-hidden relative">
        <div className="flex justify-between items-center bg-amber-200/50 p-4 rounded-3xl border-2 border-amber-800/20">
            <button 
                onClick={onExit}
                className="bg-amber-900 text-amber-50 px-4 py-2 rounded-2xl font-black uppercase tracking-widest text-xs border-b-4 border-amber-950 active:translate-y-1 active:border-b-0 hover:bg-amber-800 transition-all"
            >
                ← Retounen
            </button>
            <h2 className="text-2xl font-black text-amber-900 tracking-tighter">MÒPYON</h2>
        </div>

        {/* Mascot Canvas */}
        <div className="flex-1 min-h-[250px] relative bg-amber-100/50 rounded-3xl border-2 border-amber-900/10 inner-shadow">
            {xpRewardToast && (
                <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-green-500 text-white px-4 py-2 rounded-full font-black text-xs shadow-lg shadow-green-500/20 border-2 border-green-400 whitespace-nowrap"
                >
                    ⚡ {xpRewardToast}
                </motion.div>
            )}
            <Canvas camera={{ position: [0, 1.5, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <Suspense fallback={null}>
                    <Mascotte3D gameState={gameState3D} modelUrl={mascotUrl} />
                </Suspense>
                <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={5} blur={2} far={4} />
                <Environment preset="city" />
            </Canvas>
        </div>

        {/* Score HUD */}
        <div className="bg-white rounded-3xl border-4 border-slate-800 shadow-[0_4px_0_0_rgba(30,41,59,1)] p-4 flex justify-between items-center">
            <div className={`flex flex-col items-center p-3 rounded-2xl flex-1 transition-colors ${currentPlayer === 'X' ? 'bg-blue-100' : 'bg-transparent'}`}>
                <span className="text-4xl text-blue-500 font-black drop-shadow-sm">X</span>
                <span className="text-xs font-black text-slate-500 uppercase mt-1">Jwè 1</span>
                <span className="text-2xl font-black text-slate-800">{scores.X}</span>
            </div>
            <div className="w-1 h-16 bg-slate-200 rounded-full mx-2"></div>
            <div className={`flex flex-col items-center p-3 rounded-2xl flex-1 transition-colors ${currentPlayer === 'O' ? 'bg-red-100' : 'bg-transparent'}`}>
                <span className="text-4xl text-red-500 font-black drop-shadow-sm">O</span>
                <span className="text-xs font-black text-slate-500 uppercase mt-1">
                    {gameMode === 'pve' ? (isAiThinking ? 'Odinatè (ap reflechi...)' : 'Odinatè') : 'Jwè 2'}
                </span>
                <span className="text-2xl font-black text-slate-800">{scores.O}</span>
            </div>
        </div>

        {winner && (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-100 rounded-3xl border-4 border-amber-500 p-4 text-center shadow-[0_4px_0_0_rgba(245,158,11,1)]"
            >
                <h3 className="text-xl font-black text-amber-900 uppercase">
                    {winner === 'draw' ? 'Match Nul!' : `Jwè ${winner} Genyen!`}
                </h3>
                
                {/* Ad Revive Button: Only show if allowed, it's PvE, and the user lost (O won) */}
                {allowAdRevive && gameMode === 'pve' && winner === 'O' && boardHistory.length >= 2 && (
                    <button 
                        onClick={handleWatchAd}
                        className="mt-4 w-full bg-indigo-500 text-white font-black py-3 px-2 rounded-2xl uppercase tracking-wider border-b-4 border-indigo-700 active:translate-y-1 active:border-b-0 hover:bg-indigo-400 transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                    >
                        <span>▶️</span> Gade Piblisite Pou Tounen Dèyè
                    </button>
                )}

                <div className="flex space-x-2 mt-3">
                    <button 
                        onClick={resetGame}
                        className="flex-1 bg-amber-500 text-white font-black py-3 rounded-2xl uppercase tracking-widest border-b-4 border-amber-600 active:translate-y-1 active:border-b-0 hover:bg-amber-400 transition-all shadow-lg text-sm"
                    >
                        Rejwe
                    </button>
                    <button 
                        onClick={onExit}
                        className="flex-1 bg-slate-800 text-white font-black py-3 rounded-2xl uppercase tracking-widest border-b-4 border-slate-900 active:translate-y-1 active:border-b-0 hover:bg-slate-700 transition-all shadow-lg text-sm"
                    >
                        Soti
                    </button>
                </div>
            </motion.div>
        )}
      </div>

      {/* Board Panel (Right Side) */}
      <div className="lg:w-2/3 flex items-center justify-center p-4">
        <div className="bg-amber-100 p-4 sm:p-6 md:p-8 rounded-[3rem] border-8 border-amber-900 shadow-[10px_10px_0_0_rgba(120,53,15,0.8)] relative">
            
            {/* Wooden Texture Overlay effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none rounded-[2.5rem]" 
                 style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #78350f 10px, #78350f 20px)' }}>
            </div>

            {!gameMode ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-amber-900/80 backdrop-blur-md rounded-[3rem]">
                <h3 className="text-4xl font-black text-amber-50 mb-8 drop-shadow-lg text-center">Chwazi Mòd Jwèt</h3>
                <div className="space-y-4 w-full max-w-sm">
                  <button 
                    onClick={() => setGameMode('pve')}
                    className="w-full bg-amber-50 text-amber-900 py-4 rounded-2xl font-black text-lg uppercase tracking-widest border-b-8 border-amber-200 active:translate-y-2 active:border-b-0 transition-transform shadow-xl hover:bg-white"
                  >
                    🤖 Jwe kont Odinatè
                  </button>
                  <button 
                    onClick={() => setGameMode('pvp')}
                    className="w-full bg-amber-600 text-amber-50 py-4 rounded-2xl font-black text-lg uppercase tracking-widest border-b-8 border-amber-800 active:translate-y-2 active:border-b-0 transition-transform shadow-xl hover:bg-amber-500"
                  >
                    👥 Jwe ak Zanmi (Local)
                  </button>
                </div>
              </div>
            ) : null}

            {showAd && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-900 overflow-hidden rounded-[3rem]">
                 <div className="relative w-full max-w-md aspect-video bg-black flex items-center justify-center rounded-2xl border-4 border-slate-700 shadow-2xl">
                    <span className="text-white font-black uppercase tracking-widest flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-4 border-white border-t-transparent animate-spin"></div> 
                        Simulation Piblisite...
                    </span>
                    <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded-full text-white text-xs font-bold">Ad 1 of 1</div>
                 </div>
              </div>
            )}

            <div 
                className="grid gap-1 relative z-10 bg-amber-200/50 p-2 rounded-2xl border-2 border-amber-800/20"
                style={{ 
                    gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(18px, 2.5rem))` 
                }}
            >
                {board.map((row, rIndex) => 
                    row.map((cell, cIndex) => {
                        const isWinNode = isWinningCell(rIndex, cIndex);
                        return (
                            <div 
                                key={`${rIndex}-${cIndex}`}
                                onClick={() => handleCellClick(rIndex, cIndex)}
                                className={`
                                    w-full aspect-square border-b-2 border-r-2 border-amber-800/30
                                    flex items-center justify-center cursor-pointer relative overflow-visible
                                    ${board[rIndex][cIndex] === null && !winner ? 'hover:bg-amber-50/50' : ''}
                                `}
                            >
                                {/* Cross intersection styling to look like a go board */}
                                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-amber-900/30 -z-10"></div>
                                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-amber-900/30 -z-10"></div>

                                {cell !== null && (
                                    <div
                                        className={`
                                            w-[80%] h-[80%] rounded-full shadow-md flex items-center justify-center font-black text-xl sm:text-2xl animate-in zoom-in duration-300
                                            ${cell === 'X' 
                                                ? 'bg-blue-500 text-white border-b-4 border-blue-700' 
                                                : 'bg-red-500 text-white border-b-4 border-red-700'
                                            }
                                            ${isWinNode ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-amber-200 animate-pulse' : ''}
                                        `}
                                    >
                                        {cell}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
