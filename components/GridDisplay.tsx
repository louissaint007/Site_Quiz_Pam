import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GridLetter } from '../utils/wordSearchGenerator';
import { sounds } from '../utils/soundEffects';

interface GridDisplayProps {
    grid: GridLetter[];
    foundWords: string[];
    onWordFound: (word: string) => void;
    category?: string;
    isShuffling?: boolean;
}

export const GridDisplay: React.FC<GridDisplayProps> = ({ grid, foundWords, onWordFound, category = 'Histoire', isShuffling = false }) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [currentSelection, setCurrentSelection] = useState<number[]>([]);
    const size = Math.sqrt(grid.length);

    // Convert 1D index back to x,y
    const getCoords = (index: number) => ({
        x: index % size,
        y: Math.floor(index / size)
    });

    const isAdjacent = (lastIndex: number, newIndex: number) => {
        const last = getCoords(lastIndex);
        const curr = getCoords(newIndex);
        const dx = Math.abs(curr.x - last.x);
        const dy = Math.abs(curr.y - last.y);

        // Allow horizontal, vertical, and diagonal consecutive cells
        return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
    };

    const isSameDirection = (history: number[], newIndex: number) => {
        if (history.length < 2) return true;

        const first = getCoords(history[0]);
        const second = getCoords(history[1]);
        const current = getCoords(newIndex);

        const dx1 = second.x - first.x;
        const dy1 = second.y - first.y;

        const expectedX = first.x + (dx1 * history.length);
        const expectedY = first.y + (dy1 * history.length);

        return current.x === expectedX && current.y === expectedY;
    };

    // Touch & Mouse Handlers
    const handlePointerDown = (index: number) => {
        setIsSelecting(true);
        setCurrentSelection([index]);
        sounds.playPop(); // Initial touch POP
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isSelecting) return;

        // Determine which element is currently under the pointer
        const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
        if (!target) return;

        const indexStr = target.getAttribute('data-index');
        if (!indexStr) return;

        const index = parseInt(indexStr, 10);
        if (currentSelection.includes(index)) return; // Already selected

        const lastIndex = currentSelection[currentSelection.length - 1];

        if (isAdjacent(lastIndex, index) && isSameDirection(currentSelection, index)) {
            setCurrentSelection(prev => [...prev, index]);
            sounds.playPop(); // Satisfying pop on each letter swiped over
        }
    };

    const handlePointerUp = () => {
        if (isSelecting && currentSelection.length > 0) {
            // Form the word from the selected letters
            const word = currentSelection.map(idx => grid[idx].char).join('');
            const reverseWord = word.split('').reverse().join('');

            // Check if this path specifically hits a valid word placement in the grid
            // We check if all selected letters belong to the SAME valid word
            const wordOwner = grid[currentSelection[0]].isWordPartOf;
            const isPerfectMatch = wordOwner && currentSelection.every(idx => grid[idx].isWordPartOf === wordOwner);

            // If they perfectly dragged over the correct word, trigger it
            if (isPerfectMatch && (word === wordOwner || reverseWord === wordOwner) && !foundWords.includes(wordOwner)) {
                onWordFound(wordOwner);
            }
        }

        setIsSelecting(false);
        setCurrentSelection([]);
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

    const startIndex = currentSelection.length > 0 ? currentSelection[0] : null;
    const currentIndex = currentSelection.length > 0 ? currentSelection[currentSelection.length - 1] : null;

    return (
        <div
            ref={gridRef}
            className="w-full max-w-md mx-auto aspect-square bg-white rounded-xl touch-none border-2 border-slate-300 shadow-[0_0_30px_rgba(0,0,0,0.1)] relative overflow-hidden"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-0 z-0">
                <AnimatePresence>
                    {grid.map((cell, index) => {
                        const isSelected = currentSelection.includes(index);
                        const isFound = cell.isWordPartOf && foundWords.includes(cell.isWordPartOf);

                        const staggeredDelay = isFound ? (index % 10) * 0.05 : 0;
                        const defaultBg = (Math.floor(index / 10) + index % 10) % 2 === 0 ? 'rgba(241, 245, 249, 1)' : 'rgba(255, 255, 255, 1)'; // slate-100 / white

                        return (
                            <motion.div
                                key={cell.id} // using cell.id ensures framer-motion does a FLUID layout animate when the array shuffles!
                                layout // <--- MAGICAL FLUID SHUFFLE
                                data-index={index}
                                onPointerDown={() => handlePointerDown(index)}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{
                                    opacity: isShuffling ? 0.5 : 1,
                                    scale: isShuffling ? 0.9 : 1,
                                    backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.2)' : defaultBg,
                                    boxShadow: isSelected ? 'inset 0 0 15px rgba(79, 70, 229, 0.4)' : 'none',
                                }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 25,
                                    delay: isFound && !isShuffling ? staggeredDelay : 0
                                }}
                                className={`
                                    flex items-center justify-center relative
                                    text-2xl sm:text-3xl md:text-4xl font-bold uppercase
                                    cursor-pointer select-none
                                    border-r border-b border-slate-200
                                    ${isSelected ? 'text-indigo-600 z-10' : 'text-slate-900'}
                                    overflow-visible
                                `}
                            >
                                {/* Word Letter */}
                                <motion.span
                                    animate={isFound && !isShuffling ? activeEffect.animation : {}}
                                    className={isFound && !isShuffling ? 'text-white drop-shadow-md z-10 block pointer-events-none' : 'block pointer-events-none'}
                                >
                                    {cell.char}
                                </motion.span>

                                {/* Effect Overlay Emoji */}
                                {isFound && !isShuffling && (
                                    <motion.span
                                        initial={{ scale: 0, opacity: 1, y: 20 }}
                                        animate={{ scale: [0, 2.5, 2, 0], opacity: [0, 1, 1, 0], y: [20, -30, -50, -60] }}
                                        transition={{ duration: 1.5, ease: "easeOut", delay: staggeredDelay }}
                                        className="absolute z-50 drop-shadow-xl pointer-events-none text-2xl sm:text-3xl"
                                    >
                                        {activeEffect.emoji}
                                    </motion.span>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* SVG Overlay for drawing the arrow/line */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-20">
                <defs>
                    <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="rgba(250, 204, 21, 0.9)" />
                    </marker>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {startIndex !== null && currentIndex !== null && (
                    <line
                        x1={getCoords(startIndex).x * 10 + 5}
                        y1={getCoords(startIndex).y * 10 + 5}
                        x2={getCoords(currentIndex).x * 10 + 5}
                        y2={getCoords(currentIndex).y * 10 + 5}
                        stroke="rgba(250, 204, 21, 0.9)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        markerEnd="url(#arrowhead)"
                        filter="url(#glow)"
                    />
                )}
            </svg>
        </div>
    );
};
