import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { MopyonMatch, OnlinePlayer, MopyonMessage, UserProfile } from '../types';
import { sendChallenge, getMopyonMessages } from '../utils/mopyonMultiplayer';

interface MopyonSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserProfile;
    currentMatchId: string | null;
    onCreateRoom: () => Promise<string | null>;
    onlinePlayers: { id: string, username: string, status: string }[];
}

export const MopyonSidebar: React.FC<MopyonSidebarProps> = ({ isOpen, onClose, userProfile, currentMatchId, onCreateRoom, onlinePlayers }) => {
    const [activeTab, setActiveTab] = useState<'share' | 'search' | 'history'>('share');

    // Share Tab
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);

    // Search Tab
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // History Tab
    const [history, setHistory] = useState<MopyonMatch[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // Chat History Modal
    const [selectedChatMatchId, setSelectedChatMatchId] = useState<string | null>(null);
    const [chatHistoryMessages, setChatHistoryMessages] = useState<MopyonMessage[]>([]);
    const [isLoadingChat, setIsLoadingChat] = useState(false);

    const generateLink = async () => {
        let matchId = currentMatchId;
        if (!matchId) {
            matchId = await onCreateRoom();
            if (!matchId) return;
        }

        const url = new URL(window.location.href);
        url.search = ''; // clear exiting query params
        url.searchParams.set('room', matchId);
        setInviteLink(url.toString());
    };

    const handleCopy = async () => {
        if (!inviteLink) await generateLink();

        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Vini jwe Mòpyon avè m!',
                    text: 'Klike sou lyen sa pou w rantre nan match mwen an:',
                    url: inviteLink,
                });
            } else {
                await navigator.clipboard.writeText(inviteLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const searchPlayers = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, level')
            .ilike('username', `%${searchQuery}%`)
            .neq('id', userProfile.id)
            .limit(10);

        if (!error && data) {
            setSearchResults(data);
        }
        setIsSearching(false);
    }

    const loadHistory = async () => {
        setLoadingHistory(true);
        const { data, error } = await supabase
            .from('mopyon_matches')
            .select('*, creator:profiles!creator_id(username), joiner:profiles!joiner_id(username)')
            .or(`creator_id.eq.${userProfile.id},joiner_id.eq.${userProfile.id}`)
            .in('status', ['completed', 'abandoned'])
            .order('created_at', { ascending: false })
            .limit(10);

        if (!error && data) {
            setHistory(data as any);
        }
        setLoadingHistory(false);
    }

    useEffect(() => {
        if (isOpen && activeTab === 'history') {
            loadHistory();
        }
    }, [isOpen, activeTab]);

    const handleChallenge = async (opponentId: string) => {
        let matchId = currentMatchId;
        if (!matchId) {
            matchId = await onCreateRoom();
            if (!matchId) return;
        }
        sendChallenge(userProfile.id, opponentId, matchId);
        alert("Envitasyon an ale! Nap tann jwè an...");
    }

    const loadChatHistory = async (matchId: string) => {
        setSelectedChatMatchId(matchId);
        setIsLoadingChat(true);
        const messages = await getMopyonMessages(matchId);
        setChatHistoryMessages(messages);
        setIsLoadingChat(false);
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
                    />

                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 bottom-0 w-80 bg-slate-900 border-r-2 border-slate-700 z-50 flex flex-col shadow-2xl"
                    >
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
                            <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                                <span className="w-2 h-6 bg-indigo-500 rounded-full"></span> Multi
                            </h2>
                            <button onClick={onClose} className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition">
                                ✕
                            </button>
                        </div>

                        <div className="flex px-4 pt-4 space-x-2 shrink-0">
                            <TabButton active={activeTab === 'share'} onClick={() => setActiveTab('share')} icon="🔗" text="Pataje" />
                            <TabButton active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon="🔍" text="Rechèch" />
                            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon="⏱️" text="Istorik" />
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 h-full scrollbar-thin scrollbar-thumb-slate-700">
                            {/* SHARE TAB */}
                            {activeTab === 'share' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4">👥</div>
                                        <h3 className="text-lg font-black text-white mb-2">Envite yon Zanmi</h3>
                                        <p className="text-xs text-slate-400 font-bold">Kopye lyen sa a pou w jwe kote an dirèk fas a fas.</p>
                                    </div>

                                    <div className="bg-slate-800 p-2 rounded-xl flex items-center gap-2 border border-slate-700">
                                        <input
                                            type="text"
                                            readOnly
                                            value={inviteLink || "Klike anba pou jenerel..."}
                                            className="bg-transparent text-slate-300 text-xs py-2 px-2 w-full outline-none font-mono truncate"
                                        />
                                    </div>

                                    <button
                                        onClick={handleCopy}
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all"
                                    >
                                        {copied ? 'Kopye ak Siksè! ✓' : (inviteLink ? 'Kopye/Pataje Lyen' : 'Fè Lyen An Kounyea')}
                                    </button>
                                </div>
                            )}

                            {/* SEARCH TAB */}
                            {activeTab === 'search' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Chèche Jwè</h3>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && searchPlayers()}
                                            placeholder="Non itilizatè..."
                                            className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition"
                                        />
                                        <button
                                            onClick={searchPlayers}
                                            className="bg-slate-700 hover:bg-slate-600 px-4 rounded-xl text-white transition disabled:opacity-50 flex items-center justify-center"
                                            disabled={isSearching}
                                        >
                                            {isSearching ? '...' : '🔍'}
                                        </button>
                                    </div>

                                    <div className="space-y-3 mt-6">
                                        {searchResults.map(player => {
                                            const isOnline = onlinePlayers.some(op => op.id === player.id);
                                            return (
                                                <div key={player.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            {player.avatar_url ? (
                                                                <img src={player.avatar_url} className="w-10 h-10 rounded-lg object-cover" />
                                                            ) : (
                                                                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-lg">🦊</div>
                                                            )}
                                                            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-800 ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-white truncate max-w-[100px]">{player.username}</div>
                                                            <div className="text-[10px] text-indigo-400 font-black">Nivo {player.level || 1}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleChallenge(player.id)}
                                                        className="px-3 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition"
                                                    >
                                                        Défier
                                                    </button>
                                                </div>
                                            )
                                        })}
                                        {searchResults.length === 0 && !isSearching && searchQuery && (
                                            <div className="text-center text-slate-500 text-xs py-8">Nou pa jwenn jwè sa.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* HISTORY TAB */}
                            {activeTab === 'history' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Adversè Ansyen</h3>
                                    {loadingHistory ? (
                                        <div className="text-center py-8 text-slate-500"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>Chaje...</div>
                                    ) : history.length > 0 ? (
                                        history.map(match => {
                                            const isCreator = match.creator_id === userProfile.id;
                                            // If no joiner logic, it was an abandoned creation
                                            if (!match.joiner_id) return null;

                                            const opponentId = isCreator ? match.joiner_id : match.creator_id;
                                            const opponentName = isCreator ? (match as any).joiner?.username : (match as any).creator?.username;
                                            const didIWin = match.winner_id === userProfile.id;
                                            const isDraw = match.winner_id === null && match.status === 'completed';

                                            return (
                                                <div key={match.id} className="bg-slate-800 p-3 rounded-xl border-l-4 border-slate-700 flex flex-col gap-3 group"
                                                    style={{ borderLeftColor: didIWin ? '#22c55e' : isDraw ? '#64748b' : '#ef4444' }}
                                                >
                                                    <div className="flex justify-between items-center bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/50">
                                                        <div className="text-xs font-bold text-slate-300">vs <span className="text-white">{opponentName}</span></div>
                                                        <div className={`text-[10px] font-black px-2 py-1 rounded bg-slate-800 ${didIWin ? 'text-green-400' : isDraw ? 'text-slate-400' : 'text-red-400'}`}>
                                                            {didIWin ? 'VIKTWA' : isDraw ? 'NIL' : 'DÉFAITE'}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleChallenge(opponentId)}
                                                            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center transition gap-2"
                                                        >
                                                            <span>⚔️</span> Revanche
                                                        </button>
                                                        <button
                                                            onClick={() => loadChatHistory(match.id)}
                                                            className="flex-1 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center transition gap-2"
                                                        >
                                                            <span>💬</span> Chat
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="text-center text-slate-500 text-xs py-10 border-2 border-dashed border-slate-800 rounded-xl">
                                            Ou poko gen okenn match jwe ak yon lòt moun.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}

            {/* Chat History Modal (Rendered independently of side panel state if we want, but logically attached) */}
            {selectedChatMatchId && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        className="bg-slate-800 border-2 border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl"
                    >
                        <div className="p-4 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <span className="text-indigo-400">💬</span> Istorik Chat
                            </h3>
                            <button onClick={() => setSelectedChatMatchId(null)} className="text-slate-400 hover:text-white transition">✕</button>
                        </div>

                        <div className="p-4 h-64 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-600">
                            {isLoadingChat ? (
                                <div className="text-center py-10 text-slate-500">Ap chaje...</div>
                            ) : chatHistoryMessages.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 text-xs italic">Pa te gen okenn chat nan match sa a.</div>
                            ) : (
                                chatHistoryMessages.map(msg => {
                                    const isMe = msg.sender_id === userProfile.id;
                                    return (
                                        <div key={msg.id} className={`flex max-w-[90%] gap-2 ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                            <div className="shrink-0 pt-0.5">
                                                {msg.profiles?.avatar_url ? (
                                                    <img src={msg.profiles.avatar_url} className="w-5 h-5 rounded-md object-cover" />
                                                ) : (
                                                    <div className="w-5 h-5 bg-slate-700 rounded-md flex items-center justify-center text-[10px]">🦊</div>
                                                )}
                                            </div>
                                            <div className={`p-2 rounded-xl text-xs break-words ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-700 text-slate-200 rounded-tl-none'}`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Sub-component for tabs
const TabButton = ({ active, onClick, icon, text }: { active: boolean, onClick: () => void, icon: string, text: string }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-t-xl border-b-2 flex flex-col items-center gap-1 ${active ? 'border-indigo-500 text-indigo-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
            }`}
    >
        <span className="text-lg">{icon}</span>
        {text}
    </button>
);
