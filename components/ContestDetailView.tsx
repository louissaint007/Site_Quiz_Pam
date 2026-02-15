
import React from 'react';
import { Contest } from '../types';

interface ContestDetailViewProps {
  contest: Contest;
  userBalance: number;
  onBack: () => void;
  onJoin: (id: string) => void;
}

const ContestDetailView: React.FC<ContestDetailViewProps> = ({ contest, userBalance, onBack, onJoin }) => {
  const prizePool = contest.grand_prize || 0;
  const entryFee = contest.entry_fee || contest.entry_fee_htg || 0;
  const canAfford = userBalance >= entryFee;

  // Calculer un "Pousantaj Preferans" fictif basé sur le remplissage pour le marketing
  const preferencePercent = Math.min(99, Math.floor(((contest.current_participants || 0) / (contest.min_participants || 1)) * 100) + 12);

  // Liste complète des prix calculés sur le pool (1 à 10)
  const prizes = [
    { label: '1e Plas', percent: contest.first_prize_percent, color: 'from-yellow-400 to-yellow-600' },
    { label: '2e Plas', percent: contest.second_prize_percent, color: 'from-slate-300 to-slate-500' },
    { label: '3e Plas', percent: contest.third_prize_percent, color: 'from-orange-400 to-orange-600' },
    { label: '4e Plas', percent: contest.fourth_prize_percent, color: 'from-blue-400 to-blue-600' },
    { label: '5e Plas', percent: contest.fifth_prize_percent, color: 'from-blue-400 to-blue-600' },
    { label: '6e Plas', percent: contest.sixth_prize_percent, color: 'from-indigo-400 to-indigo-600' },
    { label: '7e Plas', percent: contest.seventh_prize_percent, color: 'from-indigo-400 to-indigo-600' },
    { label: '8e Plas', percent: contest.eighth_prize_percent, color: 'from-indigo-400 to-indigo-600' },
    { label: '9e Plas', percent: contest.ninth_prize_percent, color: 'from-indigo-400 to-indigo-600' },
    { label: '10e Plas', percent: contest.tenth_prize_percent, color: 'from-indigo-400 to-indigo-600' },
  ].filter(p => (p.percent || 0) > 0);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-500 pb-20">
      <div className="relative mb-8">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 z-10 p-3 bg-slate-900/60 backdrop-blur-md hover:bg-slate-900 rounded-2xl text-white border border-white/10 transition-all group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>

        <div
          className="h-64 md:h-80 w-full rounded-[3rem] bg-slate-800 bg-cover bg-center border border-slate-700 overflow-hidden relative shadow-2xl"
          style={contest.image_url ? { backgroundImage: `linear-gradient(to bottom, transparent, rgba(15, 23, 42, 0.95)), url(${contest.image_url})` } : {}}
        >
          {!contest.image_url && <div className="absolute inset-0 flex items-center justify-center text-9xl opacity-5">🏆</div>}
          <div className="absolute bottom-10 left-10 right-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg animate-pulse">
                {contest.status === 'active' ? 'AN KOU KOUNYE A' : 'AP TANN JWÈ'}
              </span>
              <span className="bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-300 border border-white/10">
                {contest.category_filter || 'TOUT KATEGORI'}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase drop-shadow-2xl">{contest.title}</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Section Distribution des Prix */}
          <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8 rounded-[2.5rem] shadow-xl">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
              <span className="w-2 h-8 bg-green-500 rounded-full"></span>
              Gwo rekonpans yo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prizes.map((p, i) => (
                <div key={i} className="bg-slate-900/60 p-5 rounded-3xl border border-slate-700 flex items-center justify-between group hover:border-blue-500/50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center font-black text-white shadow-lg`}>
                      {i + 1}
                    </div>
                    <span className="font-black uppercase text-xs text-slate-400 tracking-widest">{p.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-white">{(prizePool * (p.percent || 0) / 100).toLocaleString()} HTG</div>
                  </div>
                </div>
              ))}
            </div>
            {prizes.length === 0 && (
              <p className="text-center text-slate-500 italic py-4">Pa gen pri ki konfigirasyon pou plas sa yo.</p>
            )}
          </section>

          {/* Section Règles */}
          <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8 rounded-[2.5rem] shadow-xl">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
              <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
              Règ Jwèt la
            </h3>
            <ul className="space-y-4">
              {[
                "Chak kesyon gen yon limit tan (10 segonn).",
                "Plis ou reponn vit, plis ou fè pwen.",
                "Ou dwe reponn omwen 70% kesyon yo byen pou w kalifye.",
                "Konkou a ap kòmanse lè limit preferans la atenn."
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-4 text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                  <span className="text-sm font-bold leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sidebar Card Action */}
        <div className="space-y-6">
          <div className="bg-slate-800 border-2 border-blue-500 p-8 rounded-[3rem] shadow-2xl sticky top-24">
            <div className="text-center mb-8 space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">FRÈ ANTRE</p>
              <div className="text-5xl font-black text-yellow-400 tracking-tighter">
                {entryFee.toLocaleString()} <span className="text-sm">HTG</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                <span className="text-[10px] font-black text-slate-500 uppercase">Pool Total</span>
                <span className="text-sm font-black text-green-400">{(prizePool).toLocaleString()} HTG</span>
              </div>
              <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                <span className="text-[10px] font-black text-slate-500 uppercase">Preferans</span>
                <span className="text-sm font-black text-white">{preferencePercent}%</span>
              </div>
            </div>

            {!canAfford && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-4 text-center">
                <p className="text-[10px] font-black text-red-500 uppercase leading-relaxed">Ou pa gen ase kòb sou balans ou pou patisipe.</p>
              </div>
            )}

            <button
              onClick={() => onJoin(contest.id)}
              disabled={!canAfford}
              className={`w-full py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all shadow-xl flex flex-col items-center justify-center gap-1 ${canAfford
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_8px_0_rgb(29,78,216)] active:translate-y-2 active:shadow-none'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                }`}
            >
              <span>KONFIME PATISIPASYON</span>
              <span className="text-[8px] opacity-60 font-bold">Lajan an ap dedwi otomatikman</span>
            </button>

            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sistèm Peman QuizPam Sekirize</p>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestDetailView;
