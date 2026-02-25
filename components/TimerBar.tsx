import React from 'react';
import { motion } from 'framer-motion';

interface TimerBarProps {
    timeLeft: number;
    maxTime: number;
}

export const TimerBar: React.FC<TimerBarProps> = ({ timeLeft, maxTime }) => {
    const percentage = Math.max(0, (timeLeft / maxTime) * 100);

    // Decide color based on percentage
    let colorClass = 'bg-green-500';
    if (percentage <= 25) {
        colorClass = 'bg-red-500';
    } else if (percentage <= 50) {
        colorClass = 'bg-yellow-400';
    }

    return (
        <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden shadow-inner my-4 border border-white/5">
            <motion.div
                className={`h-full rounded-full ${colorClass}`}
                initial={{ width: '100%' }}
                animate={{ width: `${percentage}%` }}
                transition={{ type: 'tween', ease: 'linear', duration: 1 }} // 1 sec increments
            />
        </div>
    );
};
