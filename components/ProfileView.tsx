
import React from 'react';
import { UserProfile, Wallet } from '../types';

interface ProfileViewProps {
  user: UserProfile;
  wallet: Wallet | null;
  onBack: () => void;
  onDeposit: (amount: number) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, wallet, onBack, onDeposit }) => {
  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;

  const xpNextLevel = (user.level || 1) * 500;
  const xpProgress = ((user.xp || 0) / xpNextLevel) * 100;

  const formatCurrency = (val: number) => {
    return `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-slate-800 rounded-[3rem] border border-slate-700 overflow-hidden shadow-2xl">
        {/* Banner */}
        <div className="h-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
          <button onClick={onBack} className="absolute top-6 left-6 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all backdrop-blur-md">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
        </div>

        <div className="px-6 md:px-10 pb-10 -mt-20 relative flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="w-36 h-36 rounded-[2.5rem] bg-slate-900 border-8 border-slate-800 overflow-hidden shadow-2xl mb-6">
            <img src={user.avatar_url || defaultAvatar} alt="Profile" className="w-full h-full object-cover" />
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-4xl font-black text-white tracking-tighter">@{user.username}</h2>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-slate-500 font-black uppercase tracking-widest text-[10px] bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-700">
                {user.is_admin ? '🛡️ Administrateur' : `🎮 ${user.honorary_title || 'Novice'}`}
              </span>
              <span className="text-blue-400 font-black uppercase tracking-widest text-[10px] bg-blue-400/10 px-4 py-1.5 rounded-full border border-blue-400/20">
                Nivo {user.level || 0}
              </span>
            </div>
          </div>

          {/* XP Progress */}
          <div className="w-full max-w-md space-y-2 mb-10">
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              <span>XP: {user.xp || 0}</span>
              <span>Pwochen Nivo: {xpNextLevel}</span>
            </div>
            <div className="w-full h-4 bg-slate-900 rounded-full border border-slate-700 overflow-hidden p-1">
              <div
                className="h-full bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-1000"
                style={{ width: `${Math.min(100, xpProgress)}%` }}
              ></div>
            </div>
          </div>

          {/* Financial Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {/* Solde Actuel */}
            <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-700 flex flex-col items-center justify-center group hover:border-yellow-500/50 transition-all">
              <span className="w-10 h-10 bg-yellow-400/10 text-yellow-400 rounded-xl flex items-center justify-center mb-3">💰</span>
              <p className="text-2xl font-black text-yellow-400 tracking-tight">
                {formatCurrency(wallet?.total_balance || 0)}
              </p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Solde Actuel</p>
            </div>

            {/* Gains Totaux */}
            <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-700 flex flex-col items-center justify-center group hover:border-green-500/50 transition-all">
              <span className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center mb-3">🏆</span>
              <p className="text-2xl font-black text-green-400 tracking-tight">
                {formatCurrency(wallet?.total_won || 0)}
              </p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Gains Totaux</p>
            </div>

            {/* Dépôts */}
            <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-700 flex flex-col items-center justify-center group hover:border-blue-500/50 transition-all">
              <span className="w-10 h-10 bg-blue-400/10 text-blue-400 rounded-xl flex items-center justify-center mb-3">📥</span>
              <p className="text-2xl font-black text-blue-400 tracking-tight">
                {formatCurrency(wallet?.total_deposited || 0)}
              </p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Dépôts</p>
            </div>
          </div>

          {/* Action Button & Amount Selection */}
          <div className="w-full max-w-md mt-10 space-y-4">
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-700">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-left">Chwazi Montan Depo (HTG)</label>
              <div className="relative">
                <input
                  type="number"
                  defaultValue="500"
                  id="depositAmount"
                  className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl py-4 px-6 text-white font-black text-xl outline-none focus:border-yellow-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-black">HTG</span>
              </div>
            </div>

            <button
              onClick={() => {
                const amount = (document.getElementById('depositAmount') as HTMLInputElement)?.value;
                onDeposit(Number(amount) || 500);
              }}
              className="w-full py-5 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-slate-900 font-black rounded-[2.5rem] shadow-[0_8px_0_rgb(161,98,7)] active:translate-y-2 active:shadow-none transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
            >
              <span className="text-2xl">⚡</span>
              DEPOZE KÒB (MONCASH)
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Sekirite MonCash QuizPam</p>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
