/**
 * Mo Kwaze Dinamik - Core Engine
 * 
 * Handles word placement in a 10x10 grid with overlap prevention
 * and intelligent reshuffling of remaining words while preserving unique IDs
 * for framer-motion layout animations.
 */

export interface GridLetter {
    id: string; // Unique ID that NEVER changes for this specific letter instance (for fluid animation)
    char: string;
    x: number;
    y: number;
    isWordPartOf: string | null; // Which word it belongs to (null if random filler)
}

const GRID_SIZE = 10;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Helper to get random letter
const getRandomChar = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

type Direction = 'HORIZONTAL' | 'VERTICAL' | 'DIAGONAL';

interface Placement {
    word: string;
    x: number;
    y: number;
    direction: Direction;
}

/**
 * Attempts to place a word in an empty logic grid
 */
const tryPlaceWord = (word: string, grid: (string | null)[][], maxAttempts = 100): Placement | null => {
    const directions: Direction[] = ['HORIZONTAL', 'VERTICAL', 'DIAGONAL'];
    const w = word.toUpperCase();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const dir = directions[Math.floor(Math.random() * directions.length)];
        let startX = 0, startY = 0;

        if (dir === 'HORIZONTAL') {
            startX = Math.floor(Math.random() * (GRID_SIZE - w.length));
            startY = Math.floor(Math.random() * GRID_SIZE);
        } else if (dir === 'VERTICAL') {
            startX = Math.floor(Math.random() * GRID_SIZE);
            startY = Math.floor(Math.random() * (GRID_SIZE - w.length));
        } else { // DIAGONAL (Top-Left to Bottom-Right)
            startX = Math.floor(Math.random() * (GRID_SIZE - w.length));
            startY = Math.floor(Math.random() * (GRID_SIZE - w.length));
        }

        // Check if path is clear (we don't allow overlaps in this fast-paced version for clarity)
        let canPlace = true;
        for (let i = 0; i < w.length; i++) {
            const cx = startX + (dir === 'HORIZONTAL' || dir === 'DIAGONAL' ? i : 0);
            const cy = startY + (dir === 'VERTICAL' || dir === 'DIAGONAL' ? i : 0);

            if (grid[cy][cx] !== null) {
                canPlace = false;
                break;
            }
        }

        if (canPlace) {
            for (let i = 0; i < w.length; i++) {
                const cx = startX + (dir === 'HORIZONTAL' || dir === 'DIAGONAL' ? i : 0);
                const cy = startY + (dir === 'VERTICAL' || dir === 'DIAGONAL' ? i : 0);
                grid[cy][cx] = w[i];
            }
            return { word: w, x: startX, y: startY, direction: dir };
        }
    }

    return null; // Failed to place
};

/**
 * Generates the initial grid with new unique IDs
 */
export const generateInitialGrid = (words: string[]): GridLetter[] => {
    // Logic grid for collision detection
    const logicalGrid: (string | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    const finalGrid: GridLetter[] = [];

    // Track which cell indices are part of which word
    const cellWordMap = new Map<string, string>();

    // Place real words
    words.forEach(word => {
        const placement = tryPlaceWord(word, logicalGrid);
        if (placement) {
            for (let i = 0; i < word.length; i++) {
                const cx = placement.x + (placement.direction === 'HORIZONTAL' || placement.direction === 'DIAGONAL' ? i : 0);
                const cy = placement.y + (placement.direction === 'VERTICAL' || placement.direction === 'DIAGONAL' ? i : 0);
                cellWordMap.set(`${cx},${cy}`, word);
            }
        } else {
            console.warn("Could not place word on initial board:", word);
        }
    });

    // Fill in grid and create specific GridLetter objects
    let idCounter = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const char = logicalGrid[y][x];
            const wordOwner = cellWordMap.get(`${x},${y}`) || null;

            finalGrid.push({
                id: `letter_${idCounter++}`, // Unique forever ID
                char: char || getRandomChar(),
                x,
                y,
                isWordPartOf: wordOwner
            });
        }
    }

    return finalGrid;
};

/**
 * Shuffles the board. Keeps the EXACT same number of un-guessed word letters
 * and filler letters, but completely recalculates their X,Y positions.
 * It does NOT destroy the IDs, it re-assigns the objects new X,Y coordinates
 * so framer-motion tracks them fluidly.
 */
export const shuffleGrid = (currentGrid: GridLetter[], remainingWords: string[]): GridLetter[] => {
    const newLogicalGrid: (string | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    const newCellWordMap = new Map<string, string>();

    // 1. Try to place the remaining words safely
    const placedWords: string[] = [];
    remainingWords.forEach(word => {
        const placement = tryPlaceWord(word, newLogicalGrid);
        if (placement) {
            placedWords.push(word);
            for (let i = 0; i < word.length; i++) {
                const cx = placement.x + (placement.direction === 'HORIZONTAL' || placement.direction === 'DIAGONAL' ? i : 0);
                const cy = placement.y + (placement.direction === 'VERTICAL' || placement.direction === 'DIAGONAL' ? i : 0);
                newCellWordMap.set(`${cx},${cy}`, word);
            }
        } else {
            console.warn("Could not place word during shuffle:", word);
        }
    });

    // 2. Separate all existing letters into pools so we can reuse their IDs
    // Pool for specific words (e.g. all letters belonging to 'LAPES')
    const specificWordLetterPools: Record<string, GridLetter[]> = {};
    remainingWords.forEach(w => specificWordLetterPools[w] = []);

    // Pool for random fillers
    const fillerPool: GridLetter[] = [];

    currentGrid.forEach(letter => {
        // If it belongs to a remaining word
        if (letter.isWordPartOf && remainingWords.includes(letter.isWordPartOf)) {
            specificWordLetterPools[letter.isWordPartOf].push(letter);
        } else {
            // It's a filler OR a letter from an already found word (which degrades to a filler)
            fillerPool.push(letter);
        }
    });

    // 3. Construct the newly shifted grid items
    const nextGrid: GridLetter[] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const expectedChar = newLogicalGrid[y][x];
            const wordOwner = newCellWordMap.get(`${x},${y}`);

            if (wordOwner && expectedChar) {
                // Find an exact match in the specific word pool
                const pool = specificWordLetterPools[wordOwner];
                const matchIndex = pool.findIndex(l => l.char === expectedChar);

                let targetItem: GridLetter;
                if (matchIndex !== -1) {
                    targetItem = pool.splice(matchIndex, 1)[0];
                } else {
                    // Fallback if pool dried up (shouldn't happen if math is right)
                    targetItem = fillerPool.pop()!;
                    targetItem.char = expectedChar;
                    targetItem.isWordPartOf = wordOwner;
                }

                // Update coordinate safely
                nextGrid.push({ ...targetItem, x, y, isWordPartOf: wordOwner });

            } else {
                // Needs a random filler
                if (fillerPool.length > 0) {
                    const targetItem = fillerPool.pop()!;
                    nextGrid.push({ ...targetItem, x, y, isWordPartOf: null });
                } else {
                    // We ran out of cells (highly unlikely on a strict 100 cell swap)
                    // Create a new phantom ID safely
                    nextGrid.push({
                        id: `letter_${Date.now()}_${x}_${y}`,
                        char: getRandomChar(),
                        x,
                        y,
                        isWordPartOf: null
                    });
                }
            }
        }
    }

    return nextGrid;
};
