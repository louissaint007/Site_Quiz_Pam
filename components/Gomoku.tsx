import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { Mascotte3D } from './Mascotte3D';
import { supabase } from '../lib/supabase';
import { UserProfile, OnlinePlayer } from '../types';
import { MopyonSidebar } from './MopyonSidebar';
import {
  initPresence, updatePresenceStatus, stopPresence,
  createMatch, joinMatch, getMatchStatus, updateMatchState,
  forfeitMatch, subscribeToMatch, leaveMatchChannel
} from '../utils/mopyonMultiplayer';

interface GomokuProps {
  user: UserProfile;
  onExit: () => void;
  roomId?: string | null;
}

const BOARD_SIZE = 15;
type Player = 'X' | 'O' | null;
type Position = { row: number; col: number };

export const Gomoku: React.FC<GomokuProps> = ({ user, onExit, roomId }) => {
  const [board, setBoard] = useState<Player[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<Player | 'draw'>(null);
  const [winningLine, setWinningLine] = useState<Position[]>([]);
  const [gameState3D, setGameState3D] = useState<'idle' | 'win' | 'lose' | 'waiting'>('idle');
  const [scores, setScores] = useState({ X: 0, O: 0 });

  // Multiply modes: pvp (local), pve (AI), multiplayer (online)
  const [gameMode, setGameMode] = useState<'pvp' | 'pve' | 'multiplayer' | null>(roomId ? 'multiplayer' : null);

  const [isAiThinking, setIsAiThinking] = useState(false);
  const [boardHistory, setBoardHistory] = useState<Player[][][]>([]);
  const [allowAdRevive, setAllowAdRevive] = useState<boolean>(false);
  const [showAd, setShowAd] = useState<boolean>(false);
  const [mascotUrl, setMascotUrl] = useState<string | undefined>(undefined);
  const [xpRewardToast, setXpRewardToast] = useState<string | null>(null);

  // Multiplayer States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(roomId || null);
  const [multiStatus, setMultiStatus] = useState<'waiting' | 'in_progress' | 'disconnected'>('waiting');
  const [opponentName, setOpponentName] = useState('Opozan');
  const [amICreator, setAmICreator] = useState(true);
  const disconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const mySymbol: 'X' | 'O' = amICreator ? 'X' : 'O';

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('allow_gomoku_ad_revive, mopyon_mascot_url').eq('id', 1).single();
      if (data?.allow_gomoku_ad_revive) setAllowAdRevive(true);
      if (data?.mopyon_mascot_url) setMascotUrl(data.mopyon_mascot_url);
    };
    fetchSettings();

    // Init Global Presence
    const me: OnlinePlayer = { id: user.id, username: user.username, avatar_url: user.avatars_url || null, status: 'online' };
    initPresence(me, (players) => {
      setOnlinePlayers(players);
    }, (challengerId, challengeMatchId) => {
      if (window.confirm("Ou gen yon defi Mòpyon soti nan yon lòt moun! Aksepte?")) {
        setGameMode('multiplayer');
        setCurrentMatchId(challengeMatchId);
        setIsSidebarOpen(false);
      }
    });

    return () => {
      stopPresence();
    };
  }, [user]);

  // Handle URL Match Auto-Join
  useEffect(() => {
    if (currentMatchId && gameMode === 'multiplayer') {
      handleInitMultiplayer(currentMatchId);
    }
    return () => {
      leaveMatchChannel();
    }
  }, [currentMatchId, gameMode]);

  const handleInitMultiplayer = async (matchId: string) => {
    const status = await getMatchStatus(matchId);
    if (!status) {
      alert("Match sa pa egziste oswa li fini deja.");
      setGameMode(null);
      return;
    }

    let creator = status.creator_id === user.id;
    setAmICreator(creator);

    if (!creator) {
      // Attempt to join
      const joined = await joinMatch(matchId, user.id);
      if (!joined && status.joiner_id !== user.id) {
        alert("Match sa gen 2 jwè ladan deja!");
        setGameMode(null);
        return;
      }
    }

    setMultiStatus(creator && !status.joiner_id ? 'waiting' : 'in_progress');
    if (creator && !status.joiner_id) setGameState3D('waiting');
    else setGameState3D('idle');

    if (status.board_state && Array.isArray(status.board_state) && status.board_state.length > 0) {
      setBoard(status.board_state);
    } else {
      setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    }
    setCurrentPlayer((status.current_turn === status.creator_id) ? 'X' : 'O');

    updatePresenceStatus('playing');

    // Fetch opponent name
    if (status.joiner_id || (!creator && status.creator_id)) {
      const oppId = creator ? status.joiner_id : status.creator_id;
      if (oppId) {
        const { data } = await supabase.from('profiles').select('username').eq('id', oppId).single();
        if (data) setOpponentName(data.username);
      }
    }

    subscribeToMatch(matchId,
      // On Update
      async (payload) => {
        // Clear disconnect timer if any response
        if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);

        setBoard(payload.board_state || Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
        setCurrentPlayer(payload.current_turn === payload.creator_id ? 'X' : 'O');

        if (payload.status === 'in_progress' && multiStatus === 'waiting') {
          setMultiStatus('in_progress');
          setGameState3D('idle');
          // we are creator, someone joined. get their name
          if (payload.joiner_id) {
            const { data } = await supabase.from('profiles').select('username').eq('id', payload.joiner_id).single();
            if (data) setOpponentName(data.username);
          }
        }

        if (payload.status === 'abandoned') {
          if (payload.winner_id === user.id) {
            setWinner(mySymbol);
            setGameState3D('win');
            setMultiStatus('disconnected');
          }
        }
      },
      // On Disconnect
      () => {
        if (multiStatus !== 'in_progress' || winner) return;
        setMultiStatus('disconnected');
        setGameState3D('waiting'); // Mascot waiting animation
        // Start 30s forfeit timer
        disconnectTimerRef.current = setTimeout(() => {
          alert("Adversè a pèdi koneksyon an. Ou genyen pa fòfè!");
          forfeitMatch(matchId, user.id);
        }, 30000);
      }
    );
  }

  const handleCreateRoom = async () => {
    const matchId = await createMatch(user.id);
    if (matchId) {
      setCurrentMatchId(matchId);
      setGameMode('multiplayer');
      setAmICreator(true);
    }
    return matchId;
  };

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
        worker.postMessage({ board, player: 'O', level: user.level || 1 });
      }, 500);

      return () => {
        clearTimeout(timer);
        worker.terminate();
      };
    }
  }, [currentPlayer, gameMode, winner]);

  // Win checking logic (exactly 5 in a row)
  const checkWin = useCallback((currentBoard: Player[][], player: 'X' | 'O', lastMove: Position) => {
    const directions = [
      [1, 0], [0, 1], [1, 1], [1, -1]
    ];

    for (const [dx, dy] of directions) {
      let count = 1;
      let line: Position[] = [{ ...lastMove }];

      for (let i = 1; i < 5; i++) {
        const r = lastMove.row + i * dy;
        const c = lastMove.col + i * dx;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
          count++; line.push({ row: r, col: c });
        } else break;
      }

      for (let i = 1; i < 5; i++) {
        const r = lastMove.row - i * dy;
        const c = lastMove.col - i * dx;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
          count++; line.push({ row: r, col: c });
        } else break;
      }

      if (count === 5) return line;
    }
    return null;
  }, []);

  const checkDraw = (currentBoard: Player[][]) => {
    return currentBoard.every(row => row.every(cell => cell !== null));
  };

  const handleCellClick = async (row: number, col: number, isAiMove: boolean = false) => {
    if (!gameMode) return;
    if (gameMode === 'pve' && currentPlayer === 'O' && !isAiMove) return;
    if (gameMode === 'multiplayer') {
      if (multiStatus !== 'in_progress') return;
      if (currentPlayer !== mySymbol) return; // Not my turn
    }

    if (winner || board[row][col] !== null) return;

    setBoardHistory(prev => [...prev, board.map(r => [...r])]);

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    const winLine = checkWin(newBoard, currentPlayer, { row, col });
    const isDraw = checkDraw(newBoard);

    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';

    if (winLine) {
      setWinner(currentPlayer);
      setWinningLine(winLine);
      setScores(prev => ({ ...prev, [currentPlayer]: prev[currentPlayer] + 1 }));
      setGameState3D(currentPlayer === mySymbol && gameMode === 'multiplayer' ? 'win' : 'lose');
      if (gameMode !== 'multiplayer') setGameState3D('win'); // Standard win screen for local
      saveMatchResult(currentPlayer);
    } else if (isDraw) {
      setWinner('draw');
      setGameState3D('lose');
    } else {
      setCurrentPlayer(nextPlayer);
    }

    // Broadcast if multiplayer
    if (gameMode === 'multiplayer' && currentMatchId) {
      // ID of the player who plays the next turn
      // In our simple model amICreator = X, so nextPlayer = 'X' means targetId = creator_id (we just use the target opponent id or myself based on role).
      // Actually, current_turn is the ID of the next player. Let's find the ID.
      let nextTurnId = null;
      if (winLine || isDraw) nextTurnId = null;
      else {
        const status = await getMatchStatus(currentMatchId);
        if (status) {
          nextTurnId = nextPlayer === 'X' ? status.creator_id : status.joiner_id;
        }
      }
      await updateMatchState(
        currentMatchId,
        newBoard,
        nextTurnId,
        winLine ? user.id : undefined,
        (winLine || isDraw) ? 'completed' : 'in_progress'
      );
    }
  };

  const resetGame = async () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    setBoardHistory([]);
    setShowAd(false);
    setWinner(null);
    setWinningLine([]);

    if (gameMode === 'multiplayer') {
      // To replay multiplayer, normally you create a new room. 
      // For simplicity, we just trigger the modal to say "Create Rematch?" or handle it through sidebar History
      alert("Pou rejwe avèk jwè sa a, itilize bouton 'Revanche' nan Istorik la.");
      setIsSidebarOpen(true);
      setGameState3D('idle');
      return;
    }

    setGameState3D('idle');
    setCurrentPlayer('X');
  };

  const saveMatchResult = async (winningPlayer: 'X' | 'O') => {
    try {
      if (winningPlayer === 'X' || (gameMode === 'multiplayer' && winningPlayer === mySymbol)) {
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
    setTimeout(() => {
      executeRewind();
      setShowAd(false);
    }, 3000);
  };

  const executeRewind = () => {
    if (boardHistory.length < 2) return;
    const historyCopy = [...boardHistory];
    const previousBoard = historyCopy[historyCopy.length - 2];

    setBoard(previousBoard.map(r => [...r]));
    setBoardHistory(historyCopy.slice(0, historyCopy.length - 2));

    setWinner(null);
    setWinningLine([]);
    setGameState3D('idle');
    setCurrentPlayer('X');
  };

  const getDifficultyBadge = (level: number) => {
    if (level <= 10) return { label: 'Débutant', color: 'bg-green-500 text-white shadow-green-500/30' };
    if (level <= 25) return { label: 'Intermédiaire', color: 'bg-blue-500 text-white shadow-blue-500/30' };
    if (level <= 40) return { label: 'Avancé', color: 'bg-purple-500 text-white shadow-purple-500/30' };
    return { label: 'Expert', color: 'bg-red-500 text-white shadow-red-500/30' };
  };

  const currentLevel = user.level || 1;
  const badge = getDifficultyBadge(currentLevel);

  return (
    <>
      <MopyonSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userProfile={user}
        currentMatchId={currentMatchId}
        onCreateRoom={handleCreateRoom}
        onlinePlayers={onlinePlayers}
      />

      <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] max-w-7xl mx-auto gap-8 p-4">

        {/* HUD & 3D Mascot Panel (Left Side) */}
        <div className="lg:w-1/3 flex flex-col gap-6 bg-slate-50 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0_0_rgba(15,23,42,1)] p-6 overflow-hidden relative">
          <div className="flex justify-between items-center bg-slate-200/50 p-4 rounded-3xl border-2 border-slate-800/20">
            <button
              onClick={() => {
                updatePresenceStatus('online');
                onExit();
              }}
              className="bg-slate-900 text-slate-50 px-4 py-2 rounded-2xl font-black uppercase tracking-widest text-xs border-b-4 border-slate-950 active:translate-y-1 active:border-b-0 hover:bg-slate-800 transition-all"
            >
              ← Retounen
            </button>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">MÒPYON</h2>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-10 h-10 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center font-bold relative hover:bg-indigo-600 transition"
            >
              👥
              {onlinePlayers.length > 1 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500 border border-white"></span>
                </span>
              )}
            </button>
          </div>

          {/* Level Progression & Difficulty Badge */}
          {gameMode === 'pve' && (
            <div className="bg-white rounded-3xl border-4 border-slate-800 p-4 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-slate-600 uppercase">Nivo Ou</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md ${badge.color}`}>
                  IA: {badge.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-slate-800">{currentLevel}</span>
                <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(user.xp || 0) % 100}%` }}></div>
                </div>
                <span className="text-sm font-black text-slate-400">{currentLevel + 1}</span>
              </div>
            </div>
          )}

          {/* Multiplayer Indicator */}
          {gameMode === 'multiplayer' && (
            <div className="bg-white rounded-3xl border-4 border-slate-800 p-4 shadow-sm flex flex-col gap-2 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 block mb-1">Entènasyonal Mòpyon</span>
              <div className="flex justify-between items-center">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-400">Ou menm</span>
                  <span className="font-black text-slate-800">{mySymbol}</span>
                </div>
                <div className="text-xl font-black text-slate-300 px-4">VS</div>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-400 truncate max-w-[80px]">{opponentName}</span>
                  <span className="font-black text-red-500">{mySymbol === 'X' ? 'O' : 'X'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Mascot Canvas */}
          <div className="flex-1 min-h-[250px] relative bg-slate-100/50 rounded-3xl border-2 border-slate-900/10 inner-shadow">
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

            {multiStatus === 'waiting' && gameMode === 'multiplayer' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-[2px] rounded-3xl pt-20">
                <div className="bg-white px-4 py-2 rounded-xl shadow-lg border-2 border-indigo-200">
                  <span className="text-xs font-black uppercase text-indigo-500 animate-pulse tracking-widest">N ap tann jwè an...</span>
                </div>
              </div>
            )}

            {multiStatus === 'disconnected' && !winner && gameMode === 'multiplayer' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-900/10 backdrop-blur-[2px] rounded-3xl pt-20">
                <div className="bg-red-50 px-4 py-2 rounded-xl shadow-lg border-2 border-red-200">
                  <span className="text-xs font-black uppercase text-red-500 animate-pulse tracking-widest">Adversè an pèdi koneksyon... Ap tann 30s.</span>
                </div>
              </div>
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
            <div className={`flex flex-col items-center p-3 rounded-2xl flex-1 transition-colors ${currentPlayer === 'X' ? 'bg-slate-100' : 'bg-transparent'}`}>
              <span className="text-4xl text-slate-900 font-black drop-shadow-sm">X</span>
              <span className="text-xs font-black text-slate-500 uppercase mt-1">Jwè 1</span>
              <span className="text-2xl font-black text-slate-800">{scores.X}</span>
            </div>
            <div className="w-1 h-16 bg-slate-200 rounded-full mx-2"></div>
            <div className={`flex flex-col items-center p-3 rounded-2xl flex-1 transition-colors ${currentPlayer === 'O' ? 'bg-red-100' : 'bg-transparent'}`}>
              <span className="text-4xl text-red-500 font-black drop-shadow-sm">O</span>
              <span className="text-xs font-black text-slate-500 uppercase mt-1">
                {gameMode === 'pve' ? (isAiThinking ? 'Odinatè (ap reflechi...)' : 'Odinatè') : 'Jwè 2'}
              </span>
              <span className="text-xl font-black text-slate-800">{scores.O}</span>
            </div>
          </div>

          {winner && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                className="bg-slate-100 rounded-3xl border-4 border-slate-800 p-6 md:p-8 text-center shadow-[0_8px_0_0_rgba(15,23,42,1)] max-w-sm w-full"
              >
                <div className="w-20 h-20 mx-auto bg-slate-200 rounded-full flex items-center justify-center mb-6 border-4 border-slate-800 shadow-inner">
                  <span className="text-4xl">{winner === 'draw' ? '🤝' : '🏆'}</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">
                  {winner === 'draw' ? 'Match Nul!' : `Jwè ${winner === 'X' ? '1' : '2'} Genyen!`}
                </h3>
                {winner !== 'draw' && (
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-6">
                    Bèl jwèt, bèl match!
                  </p>
                )}

                {/* Ad Revive Button: Only show if allowed, it's PvE, and the user lost (O won) */}
                {allowAdRevive && gameMode === 'pve' && winner === 'O' && boardHistory.length >= 2 && (
                  <button
                    onClick={handleWatchAd}
                    className="mb-4 w-full bg-indigo-500 text-white font-black py-4 px-4 rounded-2xl uppercase tracking-wider border-b-4 border-indigo-700 active:translate-y-1 active:border-b-0 hover:bg-indigo-400 transition-all shadow-lg flex items-center justify-center gap-3 text-sm"
                  >
                    <span>▶️</span> Tounen Dèyè (Piblisite)
                  </button>
                )}

                <div className="flex flex-col space-y-3">
                  <button
                    onClick={resetGame}
                    className="w-full bg-green-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest border-b-4 border-green-700 active:translate-y-1 active:border-b-0 hover:bg-green-400 transition-all shadow-lg text-lg"
                  >
                    {gameMode === 'multiplayer' ? 'Tounen nan Mòd Multiplayer' : 'Rejwe Menm Mòd'}
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        resetGame();
                        setGameMode(null);
                      }}
                      className="flex-1 bg-blue-500 text-white font-black py-3 rounded-2xl uppercase tracking-widest border-b-4 border-blue-700 active:translate-y-1 active:border-b-0 hover:bg-blue-400 transition-all shadow-md text-xs"
                    >
                      Lòt Mòd
                    </button>
                    <button
                      onClick={() => { updatePresenceStatus('online'); onExit(); }}
                      className="flex-1 bg-slate-800 text-white font-black py-3 rounded-2xl uppercase tracking-widest border-b-4 border-slate-900 active:translate-y-1 active:border-b-0 hover:bg-slate-700 transition-all shadow-md text-xs"
                    >
                      Soti
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Board Panel (Right Side) */}
        <div className="lg:w-2/3 flex items-center justify-center p-4">
          <div className="bg-slate-100 p-4 sm:p-6 md:p-8 rounded-[3rem] border-8 border-slate-900 shadow-[10px_10px_0_0_rgba(15,23,42,0.8)] relative">

            {/* Minimalist Grid Texture Overlay effect */}
            <div className="absolute inset-0 opacity-5 pointer-events-none rounded-[2.5rem]"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #0f172a 10px, #0f172a 20px)' }}>
            </div>

            {!gameMode ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md rounded-[3rem]">
                <h3 className="text-4xl font-black text-white mb-8 drop-shadow-lg text-center">Chwazi Mòd Jwèt</h3>
                <div className="space-y-4 w-full max-w-sm">
                  <button
                    onClick={() => setGameMode('pve')}
                    className="w-full bg-slate-50 text-slate-900 py-4 rounded-2xl font-black text-lg uppercase tracking-widest border-b-8 border-slate-300 active:translate-y-2 active:border-b-0 transition-transform shadow-xl hover:bg-white"
                  >
                    🤖 Jwe kont Odinatè
                  </button>
                  <button
                    onClick={() => setGameMode('pvp')}
                    className="w-full bg-slate-800 text-slate-50 py-4 rounded-2xl font-black text-lg uppercase tracking-widest border-b-8 border-slate-950 active:translate-y-2 active:border-b-0 transition-transform shadow-xl hover:bg-slate-700"
                  >
                    👥 Jwe ak Zanmi (Local)
                  </button>
                  <button
                    onClick={async () => {
                      const id = await handleCreateRoom();
                      if (id) setIsSidebarOpen(true);
                    }}
                    className="w-full relative overflow-hidden bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest border-b-8 border-indigo-900 active:translate-y-2 active:border-b-0 transition-transform shadow-xl hover:bg-indigo-500"
                  >
                    <div className="absolute inset-0 bg-white/20 -skew-x-12 -ml-10 w-4 group-hover:animate-ping pointer-events-none"></div>
                    🌍 Jwe An Liy
                  </button>
                </div>
              </div>
            ) : null}

            <div
              className={`grid gap-1 relative z-10 bg-white p-2 rounded-2xl border-2 border-slate-200 transition-opacity ${multiStatus === 'waiting' && gameMode === 'multiplayer' ? 'opacity-50 pointer-events-none grayscale' : ''}`}
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
                                      w-full aspect-square border-b-2 border-r-2 border-slate-200
                                      flex items-center justify-center cursor-pointer relative overflow-visible
                                      ${board[rIndex][cIndex] === null && !winner ? 'hover:bg-slate-50' : ''}
                                  `}
                    >
                      {/* Cross intersection styling to look like a go board */}
                      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-slate-300 -z-10"></div>
                      <div className="absolute inset-y-0 left-1/2 w-[1px] bg-slate-300 -z-10"></div>

                      {cell !== null && (
                        <div
                          className={`
                                              w-[80%] h-[80%] rounded-full shadow-md flex items-center justify-center font-black text-xl sm:text-2xl animate-in zoom-in duration-300
                                              ${cell === 'X'
                              ? 'bg-[#1e3a8a] text-transparent shadow-[inset_-2px_-4px_10px_rgba(0,0,0,0.5),0_4px_6px_rgba(30,58,138,0.5)]'
                              : 'bg-[#dc2626] text-transparent shadow-[inset_-2px_-4px_10px_rgba(0,0,0,0.5),0_4px_6px_rgba(220,38,38,0.5)]'
                            }
                                              ${isWinNode ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-100 animate-pulse' : ''}
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

            {/* Multiplayer Turns Overlay Info */}
            {gameMode === 'multiplayer' && multiStatus === 'in_progress' && !winner && (
              <div className="absolute top-2 right-6 z-20 bg-slate-900/80 backdrop-blur-sm text-white px-4 py-2 rounded-full font-black uppercase text-xs tracking-widest shadow-lg border border-slate-700/50">
                {currentPlayer === mySymbol ? <span className="text-green-400">✅ Tou pa w</span> : <span className="text-red-400 animate-pulse">⏳ Ap tann {opponentName}...</span>}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};
