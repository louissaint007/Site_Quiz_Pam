
import React from 'react';
import { Contest } from '../types';

interface JoinedContestsViewProps {
    contests: Contest[];
    joinedContests: { id: string, status: string }[];
    onBack: () => void;
    onEnterContest: (contest: Contest) => void;
    onViewRankings?: (contest: Contest) => void;
}

const JoinedContestsView: React.FC<JoinedContestsViewProps> = ({ contests, joinedContests, onBack, onEnterContest, onViewRankings }) => {
    const joinedList = contests
        .map(c => {
            const joinData = joinedContests.find(jc => jc.id === c.id);
            if (joinData) return { ...c, participantStatus: joinData.status };
            return null;
        })
        .filter(Boolean) as (Contest & { participantStatus: string })[];

    return (
        <div className="max-w-4xl mx-auto w-full p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-10">
                <button
                    onClick={onBack}
                    className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg active:scale-90"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white">Konkou Mwen Yo</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Tout konkou ou enskri ladan yo</p>
                </div>
            </div>

            {joinedList.length === 0 ? (
                <div className="bg-slate-800/40 rounded-[2.5rem] border border-slate-700 p-12 text-center border-dashed">
                    <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl">🏆</div>
                    <h3 className="text-xl font-black text-white mb-2 uppercase">Ou pa gen okenn konkou</h3>
                    <p className="text-slate-400 font-bold text-sm mb-8">Ou poko enskri nan okenn konkou pou kounye a.</p>
                    <button
                        onClick={onBack}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-600/20 active:translate-y-1"
                    >
                        Chèche yon konkou
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {joinedList.map(contest => {
                        const isLive = contest.status === 'active';
                        const isScheduled = contest.status === 'scheduled';
                        const isFinished = contest.status === 'finished';
                        const hasCompleted = contest.participantStatus === 'completed';
                        const scheduledDate = contest.scheduled_at ? new Date(contest.scheduled_at) : null;

                        return (
                            <div key={contest.id} className="group relative bg-slate-800/60 rounded-[2.5rem] border border-white/5 hover:border-blue-500/30 overflow-hidden transition-all duration-500">
                                <div className="flex flex-col md:flex-row p-6 md:p-8 gap-6 md:gap-10 items-center">
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border border-white/5 flex-shrink-0 relative">
                                        {contest.image_url ? (
                                            <img src={contest.image_url} alt={contest.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-4xl">🏆</div>
                                        )}
                                        {isLive && (
                                            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-600 px-2 py-1 rounded-lg animate-pulse border border-red-500/50">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                                <span className="text-[8px] font-black text-white uppercase tracking-widest">Live</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 text-center md:text-left space-y-4">
                                        <div>
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20 mb-2 inline-block">
                                                {contest.category_filter || 'Tout Kategori'}
                                            </span>
                                            <h3 className="text-xl md:text-2xl font-black text-white leading-tight mt-1">{contest.title}</h3>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dat Konkou</span>
                                                <span className="text-white font-bold text-sm">
                                                    {scheduledDate ? scheduledDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Ap vini talè'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col border-l border-white/5 pl-4 md:pl-8">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Lè</span>
                                                <span className="text-white font-bold text-sm">
                                                    {scheduledDate ? scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-- : --'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-auto flex flex-col gap-3">
                                        {hasCompleted ? (
                                            isFinished ? (
                                                <button
                                                    onClick={() => onViewRankings && onViewRankings(contest)}
                                                    className="w-full md:w-48 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg active:translate-y-1 bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-600/20"
                                                >
                                                    WÈ KLASMAN
                                                </button>
                                            ) : (
                                                <button
                                                    disabled
                                                    className="w-full md:w-auto px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all bg-green-900/50 text-green-500 border border-green-500/20 cursor-not-allowed"
                                                >
                                                    OU FINI ! TANN REZILTA...
                                                </button>
                                            )
                                        ) : (
                                            <>
                                                <button
                                                    disabled={!isLive}
                                                    onClick={() => onEnterContest(contest)}
                                                    className={`w-full md:w-48 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg active:translate-y-1 ${isLive
                                                        ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/20'
                                                        : 'bg-slate-700 text-slate-400 border border-white/5 cursor-not-allowed'
                                                        }`}
                                                >
                                                    {isLive ? 'ANTRE NAN KONKOU' : 'POKO KÒMANSE'}
                                                </button>
                                                {isScheduled && scheduledDate && (
                                                    <p className="text-[9px] font-black text-slate-500 text-center uppercase tracking-widest animate-pulse">Pare kò w!</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )
            }
        </div >
    );
};

export default JoinedContestsView;
