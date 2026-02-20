
/**
 * XP and Leveling Utility Functions
 * 
 * Formula: XP = 100 * Level ^ 2.6
 * This gives roughly:
 * Level 1: 0 XP
 * Level 5: 6,565 XP
 * Level 10: 39,810 XP
 * Level 20: 242,500 XP
 * 
 * Target:
 * LVL 10 ~ 35,000 XP
 * LVL 20 ~ 250,000 XP
 */

const BASE_XP = 100;
const EXPONENT = 2.6;

/**
 * Calculates the total XP required for a given level
 */
export const getXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    return Math.floor(BASE_XP * Math.pow(level - 1, EXPONENT));
};

/**
 * Calculates the current level based on total XP
 */
export const calculateLevel = (totalXp: number): number => {
    if (totalXp <= 0) return 1;
    // Level = (XP / BASE_XP)^(1 / EXPONENT) + 1
    return Math.floor(Math.pow(totalXp / BASE_XP, 1 / EXPONENT)) + 1;
};

/**
 * Calculates XP gained for a single question
 * Formula: 20 base XP + (3 * seconds left)
 * Max: 50 XP
 */
export const calculateQuestionXp = (
    isCorrect: boolean,
    timeLeft: number,
    isRepeated: boolean = false
): number => {
    if (!isCorrect) return 0;

    let xp = 20 + Math.floor(timeLeft * 3);
    xp = Math.min(xp, 50);

    if (isRepeated) {
        xp = Math.floor(xp * 0.5);
    }

    return xp;
};

/**
 * Returns formatted labels for honorary titles based on level
 */
export const getLevelTitle = (level: number): string => {
    if (level < 5) return 'Novice';
    if (level < 10) return 'Apprenti';
    if (level < 15) return 'Érudit';
    if (level < 20) return 'Expert';
    if (level < 25) return 'Maître';
    if (level < 30) return 'Grand Maître';
    return 'Légende';
};

/**
 * Returns prestige styles based on level
 */
export const getPrestigeStyle = (level: number) => {
    if (level >= 50) return {
        textClass: 'prestige-diamond',
        frameClass: 'frame-diamond',
        icon: '👑'
    };
    if (level >= 41) return {
        textClass: 'prestige-gold',
        frameClass: 'frame-gold',
        icon: '⚡'
    };
    if (level >= 26) return {
        textClass: 'prestige-silver',
        frameClass: 'frame-silver',
        icon: null
    };
    if (level >= 11) return {
        textClass: 'prestige-bronze',
        frameClass: 'frame-bronze',
        icon: null
    };
    return {
        textClass: 'text-white',
        frameClass: 'border-slate-700',
        icon: null
    };
};
