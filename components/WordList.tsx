import React from 'react';

interface WordListProps {
    words: string[];
    foundWords: string[];
}

export const WordList: React.FC<WordListProps> = ({ words, foundWords }) => {
    return (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 p-4 bg-slate-800/50 rounded-2xl border border-white/5 shadow-inner">
            {words.map((word) => {
                const isFound = foundWords.includes(word);
                return (
                    <span
                        key={word}
                        className={`
              px-3 py-1 rounded-lg text-sm md:text-md font-black uppercase tracking-wider transition-all duration-500
              ${isFound
                                ? 'bg-slate-700/50 text-slate-500 line-through decoration-white/30 decoration-2 scale-95 opacity-50'
                                : 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)] text-white scale-100'}
            `}
                    >
                        {word}
                    </span>
                );
            })}
        </div>
    );
};
