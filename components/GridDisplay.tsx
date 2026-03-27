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
    const [gridRect, setGridRect] = useState<DOMRect | null>(null);
    const [firstClickedIndex, setFirstClickedIndex] = useState<number | null>(null);
    const size = Math.sqrt(grid.length);

    // Update dimensions strictly to ensure reliable math
    useEffect(() => {
        const updateRect = () => {
            if (gridRef.current) {
                setGridRect(gridRef.current.getBoundingClientRect());
            }
        };
        // Initial tiny delay to let layout settle
        const timer = setTimeout(updateRect, 100);
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect);
        };
    }, []);

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

    // Helper to get all indices in a straight line between two points
    const getLineIndices = (startIdx: number, endIdx: number) => {
        const start = getCoords(startIdx);
        const end = getCoords(endIdx);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        if (steps === 0) return [startIdx];
        
        // Only allow horizontal, vertical, or 45-degree diagonal lines
        const isHorizontal = dy === 0;
        const isVertical = dx === 0;
        const isDiagonal = Math.abs(dx) === Math.abs(dy);
        
        if (!isHorizontal && !isVertical && !isDiagonal) return null;
        
        const xStep = dx / steps;
        const yStep = dy / steps;
        
        const indices = [];
        for (let i = 0; i <= steps; i++) {
            const x = Math.round(start.x + i * xStep);
            const y = Math.round(start.y + i * yStep);
            indices.push(y * size + x);
        }
        return indices;
    };


    // Touch & Mouse Handlers
    const handlePointerDown = (index: number) => {
        if (firstClickedIndex === null) {
            // First click
            setFirstClickedIndex(index);
            setIsSelecting(true);
            setCurrentSelection([index]);
            sounds.playPop();
        } else if (firstClickedIndex === index) {
            // Cancel selection if clicking the same cell
            setFirstClickedIndex(null);
            setIsSelecting(false);
            setCurrentSelection([]);
        } else {
            // Second click: check for line
            const line = getLineIndices(firstClickedIndex, index);
            if (line) {
                setCurrentSelection(line);
                checkAndSubmitWord(line);
                setFirstClickedIndex(null);
                setIsSelecting(false);
            } else {
                // Not a valid line, restart selection from here
                setFirstClickedIndex(index);
                setCurrentSelection([index]);
                sounds.playPop();
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        // If we are in click-to-click mode (down was already released but selection stays), 
        // we might want to show a preview line
        if (!isSelecting || !gridRect) return;

        // Calculate relative coordinates
        const relX = e.clientX - gridRect.left;
        const relY = e.clientY - gridRect.top;

        if (relX < 0 || relY < 0 || relX > gridRect.width || relY > gridRect.height) return;

        const col = Math.floor(relX / (gridRect.width / size));
        const row = Math.floor(relY / (gridRect.height / size));
        const hoverIndex = (row * size) + col;

        if (hoverIndex < 0 || hoverIndex >= grid.length) return;

        // If we have a first click, show a preview line to the hover index
        if (firstClickedIndex !== null && hoverIndex !== firstClickedIndex) {
            const line = getLineIndices(firstClickedIndex, hoverIndex);
            if (line) {
                if (JSON.stringify(line) !== JSON.stringify(currentSelection)) {
                    setCurrentSelection(line);
                    sounds.playPop();
                }
            } else {
                // If not a straight line, just show the hover cell if adjacent or just the start
                const lastIdx = currentSelection[currentSelection.length - 1];
                if (isAdjacent(lastIdx, hoverIndex) && !currentSelection.includes(hoverIndex)) {
                     setCurrentSelection(prev => [...prev, hoverIndex]);
                     sounds.playPop();
                }
            }
            return;
        }

        // Standard swipe logic (if no first click yet)
        if (currentSelection.includes(hoverIndex)) {
            // Backward selection undo
            if (currentSelection.length >= 2 && hoverIndex === currentSelection[currentSelection.length - 2]) {
                setCurrentSelection(prev => prev.slice(0, -1));
                if (navigator.vibrate) navigator.vibrate(20);
            }
            return;
        }

        const lastIndex = currentSelection[currentSelection.length - 1];
        if (isAdjacent(lastIndex, hoverIndex)) {
            setCurrentSelection(prev => [...prev, hoverIndex]);
            sounds.playPop();
        }
    };

    const checkAndSubmitWord = (selection: number[]) => {
        if (selection.length < 2) return;
        
        const word = selection.map(idx => grid[idx].char).join('');
        const reverseWord = word.split('').reverse().join('');
        const wordOwner = grid[selection[0]].isWordPartOf;
        
        const isPerfectMatch = wordOwner && selection.every(idx => grid[idx].isWordPartOf === wordOwner);

        if (isPerfectMatch && (word === wordOwner || reverseWord === wordOwner) && !foundWords.includes(wordOwner)) {
            onWordFound(wordOwner);
            return true;
        }
        return false;
    };

    const handlePointerUp = () => {
        // In click-to-click mode, we don't clear until the second click or word found
        // However, if the user swiped (more than 2 cells), we can treat it as a swipe selection
        if (isSelecting && currentSelection.length > 1) {
            // Check if it was a swipe (held down)
            // But we'll let the second click logic handle it for simplicity, 
            // OR check here if they released far from start
            const found = checkAndSubmitWord(currentSelection);
            if (found || currentSelection.length > 2) {
                 setIsSelecting(false);
                 setCurrentSelection([]);
                 setFirstClickedIndex(null);
            }
        }
        // If only 1 cell, we keep it for click-to-click
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
                                    text-[14px] sm:text-2xl md:text-3xl font-bold uppercase
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
                                        className="absolute z-50 drop-shadow-xl pointer-events-none text-xl sm:text-2xl md:text-3xl"
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
