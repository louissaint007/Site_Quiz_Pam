import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import { TimerBar } from './TimerBar';
import { WordList } from './WordList';
import { GridDisplay } from './GridDisplay';
import { generateInitialGrid, shuffleGrid, GridLetter } from '../utils/wordSearchGenerator';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { GameStory } from '../types';

const GAME_DURATION = 120; // 120 seconds
const SHUFFLE_INTERVAL = 15; // Every 15 seconds

interface Props {
    onExit: () => void;
}

export const MoKwazeDinamik: React.FC<Props> = ({ onExit }) => {
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [story, setStory] = useState<GameStory | null>(null);
    const [wordsToFind, setWordsToFind] = useState<string[]>([]);
    const [foundWords, setFoundWords] = useState<string[]>([]);
    const [grid, setGrid] = useState<GridLetter[]>([]);
    const [gamePhase, setGamePhase] = useState<'loading' | 'reading' | 'playing' | 'won' | 'lost'>('loading');
    const [showConfetti, setShowConfetti] = useState(false);
    const [showAdMobTrigger, setShowAdMobTrigger] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastShuffleTimeRef = useRef<number>(GAME_DURATION);

    // Fetch story on mount
    useEffect(() => {
        fetchRandomStory();
    }, []);

    const fetchRandomStory = async () => {
        setGamePhase('loading');
        const { data, error } = await supabase.from('game_stories').select('*');
        if (data && data.length > 0) {
            // Pick a random story
            const randomStory = data[Math.floor(Math.random() * data.length)];
            setStory(randomStory);
            // Select up to 10 words randomly from target_words
            const shuffledWords = [...randomStory.target_words].sort(() => 0.5 - Math.random());
            const selectedWords = shuffledWords.slice(0, 10);

            // If the story has no target words, we can't play
            if (selectedWords.length === 0) {
                setWordsToFind(["QUIZPAM", "AYITI"]); // Fallback
            } else {
                setWordsToFind(selectedWords);
            }
            setGamePhase('reading');
        } else {
            // Fallback mock mode if no stories
            const mockStory: GameStory = {
                id: 'mock',
                title: "Istwa Kouraj Ayisyen",
                category: "Histoire",
                content: "Ayiti se premye repiblik nwa endepandan. Ewo tankou Desalin ak tousen te goumen anpil pou sa. Jodi a nou kontinye kenbe flanbo a byen wo pou montre kouraj ak detèminasyon pèp la.",
                target_words: ["AYITI", "REPIBLIK", "ENDAPANDAN", "KOURAJ"],
                difficulty: "medium",
                created_at: "",
                updated_at: ""
            };
            setStory(mockStory);
            setWordsToFind(mockStory.target_words);
            setGamePhase('reading');
        }
    };

    const startGame = () => {
        setGrid(generateInitialGrid(wordsToFind));
        setGamePhase('playing');
        setTimeLeft(GAME_DURATION);
        lastShuffleTimeRef.current = GAME_DURATION;
        startTimer();
    };

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopTimer();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    // Handle Game Over Conditions
    useEffect(() => {
        if (timeLeft === 0 && gamePhase === 'playing') {
            const remainingCount = wordsToFind.length - foundWords.length;
            if (remainingCount > 0 && remainingCount <= 2) {
                setShowAdMobTrigger(true);
            } else {
                setGamePhase('lost');
            }
        }

        // Check Shuffle interval (Every 15s)
        if (gamePhase === 'playing' && timeLeft > 0 && timeLeft < GAME_DURATION) {
            if (lastShuffleTimeRef.current - timeLeft >= SHUFFLE_INTERVAL) {
                triggerShuffle();
            }
        }
    }, [timeLeft, gamePhase]);

    const triggerShuffle = () => {
        if (gamePhase !== 'playing') return;
        lastShuffleTimeRef.current = timeLeft;
        setGrid(prev => shuffleGrid(prev, wordsToFind.filter(w => !foundWords.includes(w))));
    };

    const handleWordFound = (word: string) => {
        if (gamePhase !== 'playing' || foundWords.includes(word)) return;

        // Haptic Feedback
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        const newFoundWords = [...foundWords, word];
        setFoundWords(newFoundWords);

        // Confetti if it's the last word or random mini effect handled by category
        if (newFoundWords.length === wordsToFind.length) {
            setShowConfetti(true);
            stopTimer();
            setGamePhase('won');
        } else {
            // Delay shuffle to let the visual effect play
            setTimeout(() => {
                triggerShuffle();
            }, 600);
        }
    };

    const handleMockAdMob = () => {
        setShowAdMobTrigger(false);
        setTimeLeft(15);
        lastShuffleTimeRef.current = 15;
        startTimer();
        triggerShuffle();
    };

    return (
        <div className="w-full max-w-lg mx-auto p-4 flex flex-col h-full min-h-[80vh] bg-slate-900 rounded-3xl shadow-2xl relative overflow-hidden">
            {showConfetti && <div className="absolute inset-0 pointer-events-none z-50"><Confetti numberOfPieces={200} recycle={false} /></div>}

            {/* Header mostly persistent across readings & playing to easily exit */}
            <div className="flex justify-between items-center mb-4 z-10 shrink-0">
                <button
                    onClick={onExit}
                    className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold uppercase text-xs hover:bg-slate-700 transition"
                >
                    &larr; Tounen
                </button>
                <span className="text-xl md:text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    {gamePhase === 'reading' ? 'LI ISTWA A' : 'MO KWAZE'}
                </span>
                <div className="w-20 font-mono text-xl font-black text-right text-white">
                    {gamePhase === 'reading' ? '...' : `${timeLeft}s`}
                </div>
            </div>

            <div className="flex-1 flex flex-col relative">
                <AnimatePresence mode="wait">
                    {gamePhase === 'loading' && (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </motion.div>
                    )}

                    {gamePhase === 'reading' && story && (
                        <motion.div
                            key="reading"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -50 }}
                            className="flex-1 flex flex-col bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-white/10"
                        >
                            <div className="text-center mb-6">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-slate-700 text-slate-300 px-3 py-1 rounded-full mb-2 inline-block shadow-inner">{story.category}</span>
                                <h2 className="text-3xl font-black text-white">{story.title}</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <p className="text-slate-300 text-lg leading-relaxed">{story.content}</p>
                            </div>
                            <button
                                onClick={startGame}
                                className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl uppercase tracking-widest shadow-lg hover:shadow-indigo-500/50 transition-all active:scale-95"
                            >
                                Mwen Fini Li, Kòmanse Jwe (120s)
                            </button>
                        </motion.div>
                    )}

                    {gamePhase === 'playing' && !showAdMobTrigger && (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="w-full flex flex-col h-full"
                        >
                            <TimerBar timeLeft={timeLeft} maxTime={GAME_DURATION} />
                            <WordList words={wordsToFind} foundWords={foundWords} />
                            <div className="flex-1 flex items-center justify-center">
                                <GridDisplay
                                    grid={grid}
                                    foundWords={foundWords}
                                    onWordFound={handleWordFound}
                                    category={story?.category || 'Histoire'}
                                />
                            </div>
                        </motion.div>
                    )}

                    {showAdMobTrigger && (
                        <motion.div
                            key="admob"
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md rounded-2xl z-20 p-6 text-center"
                        >
                            <span className="text-6xl mb-4 animate-bounce">⏱️</span>
                            <h2 className="text-2xl font-black text-white mb-2 uppercase">Tan Fini !</h2>
                            <p className="text-slate-300 mb-8 max-w-sm">
                                Li rete sèlman {wordsToFind.length - foundWords.length} mo ! Eske ou vle gade yon ti piblisite pou jwenn 15 segonn anplis ?
                            </p>
                            <button
                                onClick={handleMockAdMob}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 mb-4 border border-white/20"
                            >
                                📺 Gade Piblisite (+15s)
                            </button>
                            <button onClick={() => setGamePhase('lost')} className="text-slate-400 font-bold uppercase text-xs hover:text-white">
                                Non mèsi, klike pou pèdi
                            </button>
                        </motion.div>
                    )}

                    {gamePhase === 'won' && (
                        <motion.div key="win" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-slate-800 rounded-3xl p-8 m-auto">
                            <span className="text-8xl block mb-6">🏆</span>
                            <h2 className="text-4xl font-black text-white tracking-widest uppercase mb-4 text-shadow-lg shadow-green-500/50">Viktwa !</h2>
                            <p className="text-green-400 font-bold mb-8">Ou jwenn tout mo yo ak {timeLeft}s ki rete !</p>
                            <button onClick={onExit} className="bg-white text-slate-900 px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition">Kontinye</button>
                        </motion.div>
                    )}

                    {gamePhase === 'lost' && (
                        <motion.div key="lose" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-slate-800 rounded-3xl p-8 m-auto">
                            <span className="text-8xl block mb-6">⏰</span>
                            <h2 className="text-4xl font-black text-red-500 tracking-widest uppercase mb-4 text-shadow-lg shadow-red-500/50">Tan Fini</h2>
                            <p className="text-slate-300 font-bold mb-8">Ou pat gentan jwenn tout mo yo.</p>
                            <button onClick={onExit} className="bg-red-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition">Tounen</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
