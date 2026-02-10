
import React, { useState, useEffect } from 'react';

interface GameTimerProps {
  duration: number; // in seconds
  onTimeUp: () => void;
  isActive: boolean;
  onTick?: (remaining: number) => void;
}

const GameTimer: React.FC<GameTimerProps> = ({ duration, onTimeUp, isActive, onTick }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    // Si timer la pa aktif, nou soti
    if (!isActive) return;

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      setTimeLeft(remaining);
      if (onTick) onTick(remaining);

      if (remaining <= 0) {
        clearInterval(intervalId);
        onTimeUp();
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [isActive, duration]); // onTimeUp retire nan depandans pou evite rale initefil

  const progress = (timeLeft / duration) * 100;

  return (
    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mt-8 border border-slate-700 shadow-inner">
      <div 
        className={`h-full transition-all duration-300 ease-linear ${
          timeLeft <= 3 ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
        }`}
        style={{ width: `${progress}%` }}
      />
      <div className="flex justify-between mt-2 px-1">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Limit Tan</span>
        <span className={`text-sm font-black ${timeLeft <= 3 ? 'text-red-500' : 'text-blue-400'}`}>
          {timeLeft}s
        </span>
      </div>
    </div>
  );
};

export default GameTimer;
