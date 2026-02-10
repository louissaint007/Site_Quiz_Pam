
import React from 'react';
import { Question } from '../types';

interface QuizCardProps {
  question: Question;
  onSelect: (index: number) => void;
  selectedId: number | null;
  showCorrect: boolean;
}

const QuizCard: React.FC<QuizCardProps> = ({ question, onSelect, selectedId, showCorrect }) => {
  if (!question) return null;

  const getDifficultyLabel = (diff: string | number) => {
    if (typeof diff === 'string') {
      const lower = diff.toLowerCase();
      if (lower === 'easy' || lower === 'facile') return 'Facile';
      if (lower === 'medium' || lower === 'médium' || lower === 'moyen') return 'Moyen';
      if (lower === 'hard' || lower === 'difficile') return 'Difficile';
      if (lower === 'expert') return 'Expert';
      const parsed = parseInt(diff, 10);
      if (!isNaN(parsed)) return getDifficultyLabel(parsed);
      return diff.charAt(0).toUpperCase() + diff.slice(1);
    }
    switch (diff) {
      case 1: return 'Facile';
      case 2: return 'Moyen';
      case 3: return 'Difficile';
      case 4: return 'Expert';
      default: return 'Général';
    }
  };

  return (
    <div className="bg-slate-800 rounded-[2.5rem] border border-slate-700 shadow-2xl p-6 md:p-10 animate-in fade-in zoom-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <span className="inline-block px-4 py-1.5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
          {question.category || 'IA'}
        </span>
        <span className="inline-block px-4 py-1.5 rounded-full bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-700">
          {getDifficultyLabel(question.difficulty)}
        </span>
      </div>
      
      <h2 className="text-2xl md:text-3xl font-black text-white mb-10 leading-tight tracking-tight">
        {question.question_text}
      </h2>

      <div className="grid grid-cols-1 gap-4">
        {question.options.map((option, idx) => {
          let buttonClass = "w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center group ";
          
          if (showCorrect) {
            // Se sèlman si li te chwazi yon repons nou montre koulè vèt/wouj
            if (idx === question.correct_index) {
              buttonClass += "bg-green-500/20 border-green-500 text-green-400 ring-4 ring-green-500/10";
            } else if (idx === selectedId) {
              buttonClass += "bg-red-500/20 border-red-500 text-red-400";
            } else {
              buttonClass += "bg-slate-900/40 border-slate-700 text-slate-500 opacity-40";
            }
          } else if (selectedId === idx) {
            buttonClass += "bg-blue-600 border-blue-400 text-white ring-4 ring-blue-500/20 scale-[1.02]";
          } else {
            // Tèks blan nèt pou kontras maksimòm
            buttonClass += "bg-slate-900 border-slate-700 text-white hover:border-slate-500 hover:bg-slate-700 transition-colors";
          }

          return (
            <button
              key={idx}
              onClick={() => !showCorrect && onSelect(idx)}
              disabled={showCorrect}
              className={buttonClass}
            >
              <span className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm mr-5 shrink-0 transition-colors ${
                selectedId === idx ? 'bg-white text-blue-600' : 'bg-slate-800 text-blue-400'
              }`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="font-bold text-lg">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuizCard;
