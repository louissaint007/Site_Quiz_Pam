
import React from 'react';

interface FinalistArenaProps {
  onStartFinal: () => void;
  contestTitle: string;
}

const FinalistArena: React.FC<FinalistArenaProps> = ({ onStartFinal, contestTitle }) => {
  return (
    <div className="max-w-2xl mx-auto py-12 px-6 text-center animate-in zoom-in duration-500">
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-red-500/20 blur-[100px] rounded-full"></div>
        <div className="relative w-40 h-40 bg-slate-800 border-4 border-red-500 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl rotate-3">
          <span className="text-7xl">⚔️</span>
        </div>
      </div>

      <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4">
        Finalist <span className="text-red-500">Arena</span>
      </h1>
      
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">
        Ou nan yon egalite pafè pou konkou : <br/>
        <span className="text-white text-lg mt-2 block">{contestTitle}</span>
      </p>

      <div className="bg-slate-800/50 p-8 rounded-[2.5rem] border border-red-500/30 mb-10 text-left space-y-4">
        <h3 className="font-black text-red-400 uppercase text-sm tracking-widest">Règ Final la :</h3>
        <ul className="space-y-3 text-slate-300 text-sm font-medium">
          <li className="flex gap-3">
            <span className="text-red-500">●</span>
            Kesyon nivo <strong className="text-white">EXPERT</strong> sèlman.
          </li>
          <li className="flex gap-3">
            <span className="text-red-500">●</span>
            Chak milisegonn konte pou depataje nou.
          </li>
          <li className="flex gap-3">
            <span className="text-red-500">●</span>
            Sèl premye a ap genyen gwo pri a.
          </li>
        </ul>
      </div>

      <button 
        onClick={onStartFinal}
        className="w-full py-6 bg-red-600 hover:bg-red-500 text-white font-black rounded-[2rem] shadow-[0_8px_0_rgb(185,28,28)] active:translate-y-2 active:shadow-none transition-all uppercase tracking-[0.2em] text-sm"
      >
        ANTRE NAN ARENA A
      </button>
    </div>
  );
};

export default FinalistArena;
