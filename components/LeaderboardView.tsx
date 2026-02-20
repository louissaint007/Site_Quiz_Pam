import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Contest } from '../types';
import { getPrestigeStyle } from '../utils/xp';

interface LeaderboardViewProps {
    contest: Contest;
    currentUserId: string;
    onBack: () => void;
}

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ contest, currentUserId, onBack }) => {
    const [participants, setParticipants] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const { data, error } = await supabase
                    .from('contest_participants')
                    .select(`
            user_id,
            score,
            completed_at,
            profiles:user_id ( username, avatars_url, level, honorary_title )
          `)
                    .eq('contest_id', contest.id)
                    .order('score', { ascending: false });

                if (error) throw error;
                setParticipants(data || []);
            } catch (err) {
                console.error('Error fetching leaderboard:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboard();
    }, [contest.id]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animation-pulse">Ap chaje klasman an...</p>
            </div>
        );
    }

    // Find current user's rank
    const currentUserIndex = participants.findIndex(p => p.user_id === currentUserId);
    const currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : null;

    // Filter logic: if user is ranked > 100, do not show users ranked below them.
    let displayedParticipants = participants;
    if (currentUserRank && currentUserRank > 100) {
        // Show top 100 + current user (which is already included if we just slice up to currentUserRank)
        displayedParticipants = participants.slice(0, currentUserRank);
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500 pb-20 p-4">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-white transition-all border border-white/5">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div>
                    <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-white">Klasman Final</h1>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{contest.title}</p>
                </div>
            </div>

            <div className="bg-slate-800/50 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                <div className="p-6 md:p-8 border-b border-white/5 bg-slate-800/80">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-white uppercase flex items-center gap-3">
                            <span className="text-2xl">🏆</span> TOP JWÈ YO
                        </h2>
                        {currentUserRank && (
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pozisyon w</p>
                                <div className="text-2xl font-black text-yellow-400">#{currentUserRank}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="divide-y divide-white/5">
                    {displayedParticipants.map((p, idx) => {
                        const isCurrentUser = p.user_id === currentUserId;
                        const rank = idx + 1;
                        const prestige = getPrestigeStyle(p.profiles?.level || 1);

                        return (
                            <div key={p.user_id || idx} className={`p-4 md:p-6 flex items-center justify-between transition-colors ${isCurrentUser ? 'bg-yellow-500/10 border-l-4 border-yellow-500' : 'hover:bg-white/5'}`}>
                                <div className="flex items-center gap-4 md:gap-6">
                                    <div className={`w-8 md:w-12 text-center font-black ${rank <= 3 ? 'text-2xl md:text-3xl' : 'text-lg text-slate-500'}`}>
                                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                                    </div>

                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden bg-slate-900 avatar-frame ${prestige.frameClass}`}>
                                        <img src={p.profiles?.avatars_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.profiles?.username}`} className="w-full h-full object-cover rounded-[8px]" alt={p.profiles?.username} />
                                    </div>

                                    <div className="flex flex-col">
                                        <span className={`font-black text-sm md:text-base ${isCurrentUser ? 'text-yellow-400' : 'text-white'} ${prestige.textClass}`}>
                                            {p.profiles?.username} {prestige.icon} {isCurrentUser && <span className="text-[10px] ml-2 bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full uppercase tracking-widest">Ou menm</span>}
                                        </span>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                                            {p.profiles?.honorary_title || 'Novice'}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="text-lg md:text-2xl font-black text-blue-400">{p.score || 0}</span>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pwen</p>
                                </div>
                            </div>
                        );
                    })}

                    {displayedParticipants.length === 0 && (
                        <div className="p-12 text-center">
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Pa gen rezilta ankò</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeaderboardView;
