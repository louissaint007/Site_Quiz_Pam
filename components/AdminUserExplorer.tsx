import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const AdminUserExplorer: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'balance_desc' | 'xp_desc'>('balance_desc');

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [userActivities, setUserActivities] = useState<any[]>([]);
    const [isLoadingActivities, setIsLoadingActivities] = useState(false);

    const [manualAmount, setManualAmount] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select(`
          id, username, balance_htg, xp, level, created_at,
          wallets(total_balance, total_deposited, total_withdrawn, total_won),
          user_payment_info(phone_number)
        `)
                .order('balance_htg', { ascending: false });

            if (data) {
                setUsers(data);
                setFilteredUsers(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let result = [...users];

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(u =>
                u.username?.toLowerCase().includes(q) ||
                u.user_payment_info?.[0]?.phone_number?.includes(q) ||
                u.user_payment_info?.phone_number?.includes(q) ||
                u.id.includes(q)
            );
        }

        // Sort
        if (sortBy === 'balance_desc') {
            result.sort((a, b) => (b.balance_htg || 0) - (a.balance_htg || 0));
        } else if (sortBy === 'xp_desc') {
            result.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        }

        setFilteredUsers(result);
    }, [searchQuery, sortBy, users]);

    const handleManualTransaction = async (userId: string, type: 'deposit' | 'withdrawal') => {
        if (isProcessingRef.current) return;
        const amount = Number(manualAmount);
        if (!amount || amount <= 0) {
            alert("Tanpri mete yon montan valab");
            return;
        }

        isProcessingRef.current = true;
        setIsUpdating(true);
        try {
            const orderId = `${userId}__manual_${crypto.randomUUID()}`;
            const { error } = await supabase.from('transactions').insert({
                id: orderId,
                user_id: userId,
                amount: amount,
                type: type,
                status: 'completed',
                description: type === 'deposit' ? 'Depo Manyèl pa Admin' : 'Retrè Manyèl pa Admin',
                payment_method: 'MANUAL',
                metadata: { admin_handled: true, handled_at: new Date().toISOString() }
            });

            if (error) throw error;

            alert("Tranzaksyon an fèt avèk siksè!");
            setManualAmount('');
            fetchUsers(); // Refresh
        } catch (err: any) {
            console.error(err);
            alert("Erè lè n ap fè tranzaksyon an: " + err.message);
        } finally {
            isProcessingRef.current = false;
            setIsUpdating(false);
        }
    };

    const fetchUserActivities = async (userId: string) => {
        setSelectedUserId(userId);
        setIsLoadingActivities(true);
        setUserActivities([]);
        try {
            const { data } = await supabase
                .from('user_activities')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(100);

            if (data) setUserActivities(data);
        } catch (err) {
            console.error('Error fetching activities:', err);
        } finally {
            setIsLoadingActivities(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-3xl border border-white/5 shadow-xl">
                <h2 className="text-xl font-black text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                    <span className="text-2xl">🕵️‍♂️</span> Esploratè Itilizatè (Odit & Kòb)
                </h2>

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Chache ak non, telefòn, id..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500"
                    />
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                        className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none"
                    >
                        <option value="balance_desc">Pi gwo balans</option>
                        <option value="xp_desc">Pi gwo XP (Pwen)</option>
                    </select>
                </div>

                {/* Layout: Main List (Left) / Detail View (Right) */}
                <div className="flex flex-col lg:flex-row gap-6 h-[600px]">

                    {/* User List */}
                    <div className="flex-1 bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden flex flex-col">
                        <div className="p-3 bg-slate-800 border-b border-white/5 grid grid-cols-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <div className="col-span-2">Itilizatè</div>
                            <div>Balans HTG</div>
                            <div className="text-right">Aksyon</div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {isLoading ? (
                                <div className="text-center py-10 opacity-50 animate-pulse">Chajman...</div>
                            ) : filteredUsers.map(u => (
                                <div
                                    key={u.id}
                                    className={`p-3 rounded-xl border transition-colors cursor-pointer ${selectedUserId === u.id ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-900 border-white/5 hover:border-white/20'}`}
                                    onClick={() => fetchUserActivities(u.id)}
                                >
                                    <div className="grid grid-cols-4 items-center">
                                        <div className="col-span-2">
                                            <p className="font-bold text-white truncate">{u.username}</p>
                                            <p className="text-[10px] text-slate-500 font-mono truncate">{u.id.split('-')[0]}***</p>
                                        </div>
                                        <div>
                                            <span className="font-black text-green-400">{u.balance_htg} HTG</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-yellow-400 font-bold">Nivo {u.level}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* User Details & Audit */}
                    <div className="flex-1 bg-slate-900 rounded-2xl border border-white/5 flex flex-col overflow-hidden">
                        {selectedUserId ? (() => {
                            const u = users.find(x => x.id === selectedUserId);
                            if (!u) return null;

                            return (
                                <>
                                    {/* Top: Modifying Balances */}
                                    <div className="p-4 bg-slate-800 border-b border-white/5 shrink-0">
                                        <h3 className="font-black text-white text-lg mb-1">{u.username}</h3>
                                        <p className="text-xs text-slate-400 mb-4">Phone: {u.user_payment_info?.[0]?.phone_number || u.user_payment_info?.phone_number || 'N/A'}</p>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                placeholder="Montan HTG"
                                                value={manualAmount}
                                                onChange={e => setManualAmount(e.target.value)}
                                                className="w-32 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-bold outline-none text-sm"
                                            />
                                            <button
                                                onClick={() => handleManualTransaction(u.id, 'deposit')}
                                                disabled={isUpdating}
                                                className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-black uppercase text-[10px] transition-colors"
                                            >
                                                + Depoze
                                            </button>
                                            <button
                                                onClick={() => handleManualTransaction(u.id, 'withdrawal')}
                                                disabled={isUpdating}
                                                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-black uppercase text-[10px] transition-colors"
                                            >
                                                - Retire
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bottom: Activity Log */}
                                    <div className="p-3 bg-slate-800/50 border-b border-white/5 flex justify-between items-center shrink-0">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jounal Aktivite (Audit Log)</h4>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                                        {isLoadingActivities ? (
                                            <div className="text-center py-4 opacity-50 animate-pulse">Chajman aktivite...</div>
                                        ) : userActivities.length === 0 ? (
                                            <div className="text-center py-10 opacity-50 text-xs">Pa gen aktivite anrejistre pou itilizatè sa a.</div>
                                        ) : (
                                            userActivities.map(act => (
                                                <div key={act.id} className="bg-slate-800/80 border border-white/5 rounded-xl p-3 flex gap-3">
                                                    <div className="shrink-0 pt-1">
                                                        {act.action_type === 'login' && <span className="text-blue-400">🔑</span>}
                                                        {act.action_type === 'finish_solo' && <span className="text-yellow-400">🎮</span>}
                                                        {act.action_type === 'join_contest' && <span className="text-purple-400">🏆</span>}
                                                        {act.action_type === 'deposit' && <span className="text-green-400">💸</span>}
                                                        {act.action_type === 'withdraw' && <span className="text-red-400">🏦</span>}
                                                        {act.action_type === 'logout' && <span className="text-slate-500">🚪</span>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-baseline mb-1">
                                                            <span className="font-bold text-white text-sm uppercase">{act.action_type}</span>
                                                            <span className="text-[9px] text-slate-500 font-mono">
                                                                {new Date(act.created_at).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <pre className="text-[10px] text-slate-400 font-mono bg-slate-900 p-2 rounded-lg overflow-x-auto">
                                                            {JSON.stringify(act.details, null, 2)}
                                                        </pre>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            );
                        })() : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <span className="text-4xl mb-4 opacity-50">👈</span>
                                <p className="font-bold uppercase tracking-widest text-xs">Chwazi yon itilizatè a goch</p>
                                <p className="text-[10px] mt-2 max-w-[200px] text-center opacity-80">
                                    Pou w wè dènye aksyon li, si l ap jwe legal, epi pou modifye balans li.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
