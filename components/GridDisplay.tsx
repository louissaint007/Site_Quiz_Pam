import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GridLetter } from '../utils/wordSearchGenerator';

interface GridDisplayProps {
    grid: GridLetter[];
    foundWords: string[];
    onWordFound: (word: string) => void;
    category?: string;
}

export const GridDisplay: React.FC<GridDisplayProps> = ({ grid, foundWords, onWordFound, category = 'Histoire' }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [startIndex, setStartIndex] = useState<number | null>(null);
    const [currentIndex, setCurrentIndex] = useState<number | null>(null);
    const [selectedPath, setSelectedPath] = useState<number[]>([]);

    // Convert 1D index back to x,y
    const getCoords = (index: number) => ({
        x: index % 10,
        y: Math.floor(index / 10)
    });

    // Calculate the straight line path between start and current
    useEffect(() => {
        if (startIndex !== null && currentIndex !== null) {
            const start = getCoords(startIndex);
            const current = getCoords(currentIndex);

            const dx = Math.sign(current.x - start.x);
            const dy = Math.sign(current.y - start.y);

            // Ensure it's a straight line (horizontal, vertical, or perfectly diagonal)
            const absDx = Math.abs(current.x - start.x);
            const absDy = Math.abs(current.y - start.y);

            if (dx === 0 || dy === 0 || absDx === absDy) {
                const path: number[] = [];
                let curX = start.x;
                let curY = start.y;

                const steps = Math.max(absDx, absDy);

                for (let i = 0; i <= steps; i++) {
                    path.push(curY * 10 + curX);
                    curX += dx;
                    curY += dy;
                }

                setSelectedPath(path);
            }
        } else {
            setSelectedPath([]);
        }
    }, [startIndex, currentIndex]);

    // Touch & Mouse Handlers
    const handlePointerDown = (index: number) => {
        setIsSelecting(true);
        setStartIndex(index);
        setCurrentIndex(index);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isSelecting || !containerRef.current) return;

        // Find the element under the pointer
        const touch = e.clientX ? e : (e as any).touches?.[0];
        if (!touch) return;

        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const indexStr = element?.getAttribute('data-index');
        if (indexStr) {
            setCurrentIndex(parseInt(indexStr, 10));
        }
    };

    const handlePointerUp = () => {
        if (isSelecting && selectedPath.length > 0) {
            // Form the word from the selected letters
            const word = selectedPath.map(idx => grid[idx].char).join('');
            const reverseWord = word.split('').reverse().join('');

            // Check if this path specifically hits a valid word placement in the grid
            // We check if all selected letters belong to the SAME valid word
            const wordOwner = grid[selectedPath[0]].isWordPartOf;
            const isPerfectMatch = wordOwner && selectedPath.every(idx => grid[idx].isWordPartOf === wordOwner);

            // If they perfectly dragged over the correct word, trigger it
            if (isPerfectMatch && (word === wordOwner || reverseWord === wordOwner) && !foundWords.includes(wordOwner)) {
                onWordFound(wordOwner);
            }
        }

        setIsSelecting(false);
        setStartIndex(null);
        setCurrentIndex(null);
        setSelectedPath([]);
    };

    // Category specific visual effects
    const effectMap: Record<string, { emoji: string, color: string, shadow: string, animation: any }> = {
        Technologie: {
            emoji: '⚡',
            color: 'rgba(59, 130, 246, 0.9)',
            shadow: '0 0 20px rgba(59, 130, 246, 0.8)',
            animation: {
                backgroundColor: ['rgba(30, 41, 59, 1)', 'rgba(59, 130, 246, 0.9)', 'rgba(234, 179, 8, 0.9)', 'rgba(59, 130, 246, 0.9)'],
                transition: { duration: 0.2, repeat: 3, repeatType: 'reverse' as const }
            }
        },
        Biologie: {
            emoji: '🌿',
            color: 'rgba(34, 197, 94, 0.9)',
            shadow: '0 0 20px rgba(34, 197, 94, 0.8)',
            animation: {
                scale: [1, 1.2, 0.9],
                backgroundColor: 'rgba(34, 197, 94, 0.9)',
                transition: { duration: 0.5, ease: "easeOut" }
            }
        },
        Science: {
            emoji: '🧪',
            color: 'rgba(168, 85, 247, 0.9)',
            shadow: '0 0 25px rgba(168, 85, 247, 0.8)',
            animation: {
                y: [0, -10, 0],
                backgroundColor: 'rgba(168, 85, 247, 0.9)',
                transition: { duration: 0.4, repeat: 2 }
            }
        },
        Culture: {
            emoji: '🎭',
            color: 'rgba(234, 179, 8, 0.9)',
            shadow: '0 0 20px rgba(234, 179, 8, 0.8)',
            animation: {
                scale: [1, 1.15, 0.9],
                backgroundColor: 'rgba(234, 179, 8, 0.9)',
                transition: { duration: 0.6 }
            }
        },
        Histoire: {
            emoji: '📜',
            color: 'rgba(217, 119, 6, 0.9)',
            shadow: '0 0 20px rgba(217, 119, 6, 0.8)',
            animation: {
                scale: [1, 1.1, 0.9],
                backgroundColor: 'rgba(217, 119, 6, 0.9)',
                transition: { duration: 0.6 }
            }
        },
    };

    const activeEffect = effectMap[category] || effectMap['Histoire'];

    return (
        <div
            ref={containerRef}
            className="w-full max-w-md mx-auto aspect-square bg-slate-900 rounded-2xl p-2 md:p-4 grid grid-cols-10 gap-1 touch-none border border-white/10 shadow-2xl relative"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            <AnimatePresence>
                {grid.map((cell, index) => {
                    const isSelected = selectedPath.includes(index);
                    const isFound = cell.isWordPartOf && foundWords.includes(cell.isWordPartOf);

                    // For staggered growth, we need to know the index of this letter within its word
                    // However, we'll keep it simple for now and use the index-based approach
                    const staggeredDelay = isFound ? (index % 10) * 0.05 : 0;

                    return (
                        <motion.div
                            layout
                            key={cell.id}
                            data-index={index}
                            onPointerDown={() => handlePointerDown(index)}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{
                                opacity: isFound ? 0.8 : 1,
                                scale: isFound ? activeEffect.animation.scale || 0.9 : (isSelected ? 1.1 : 1),
                                backgroundColor: isFound ? activeEffect.color : (isSelected ? 'rgba(79, 70, 229, 0.8)' : 'rgba(30, 41, 59, 1)'),
                                boxShadow: isFound ? activeEffect.shadow : (isSelected ? '0 0 10px rgba(79, 70, 229, 0.5)' : 'none'),
                                ... (isFound ? activeEffect.animation : {})
                            }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 25,
                                delay: isFound ? staggeredDelay : 0
                            }}
                            className={`
                                flex items-center justify-center relative
                                rounded-md sm:rounded-lg overflow-hidden
                                text-xl sm:text-2xl md:text-3xl font-black uppercase
                                cursor-pointer select-none
                                ${isSelected ? 'text-white z-10' : 'text-slate-300 border border-white/5 shadow-inner'}
                            `}
                        >
                            <span className={isFound ? 'opacity-0' : 'opacity-100'}>{cell.char}</span>

                            {isFound && (
                                <motion.span
                                    initial={{ scale: 0, opacity: 1, rotate: -45 }}
                                    animate={{ scale: 2.5, opacity: 0, rotate: 45 }}
                                    transition={{ duration: 0.6, ease: "easeOut", delay: staggeredDelay }}
                                    className="absolute inset-0 flex items-center justify-center z-50 drop-shadow-xl"
                                >
                                    {activeEffect.emoji}
                                </motion.span>
                            )}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};
