import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface UserSearchParams {
    query: string;
}

export const AdminUsersManager: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [manualAmount, setManualAmount] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const isProcessingRef = useRef(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setUsers([]);

        try {
            // Search by username
            const { data: profilesByName } = await supabase
                .from('profiles')
                .select(`
          id, username, balance_htg,
          wallets(total_balance, total_deposited, total_withdrawn, total_won),
          user_payment_info(phone_number)
        `)
                .ilike('username', `%${searchQuery}%`)
                .limit(20);

            // Search by phone
            const { data: phones } = await supabase
                .from('user_payment_info')
                .select('user_id')
                .ilike('phone_number', `%${searchQuery}%`)
                .limit(20);

            const combinedIds = new Set<string>();
            profilesByName?.forEach(p => combinedIds.add(p.id));
            phones?.forEach(p => combinedIds.add(p.user_id));

            if (combinedIds.size > 0 && phones && phones.length > 0) {
                const { data: profilesByPhone } = await supabase
                    .from('profiles')
                    .select(`
            id, username, balance_htg,
            wallets(total_balance, total_deposited, total_withdrawn, total_won),
            user_payment_info(phone_number)
          `)
                    .in('id', Array.from(phones.map(p => p.user_id)));

                profilesByPhone?.forEach(p => {
                    if (!combinedIds.has(p.id)) combinedIds.add(p.id);
                });

                const allProfiles = [];
                if (profilesByName) allProfiles.push(...profilesByName);
                if (profilesByPhone) {
                    profilesByPhone.forEach(p => {
                        if (!allProfiles.find(x => x.id === p.id)) allProfiles.push(p);
                    });
                }
                setUsers(allProfiles);
            } else {
                setUsers(profilesByName || []);
            }

        } catch (err) {
            console.error(err);
            alert('Erè nan rechèch la');
        } finally {
            setIsSearching(false);
        }
    };

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
            // Insert completed transaction, trigger will update wallet and profile balance
            const orderId = `${userId}__manual_${crypto.randomUUID()}`;
            const { error } = await supabase.from('transactions').insert({
                id: orderId,
                user_id: userId,
                amount: amount,
                type: type,
                status: 'completed',
                description: type === 'deposit' ? 'Depo Manyèl pa Admin' : 'Retrè Manyèl pa Admin',
                payment_method: 'MANUAL',
                metadata: {
                    admin_handled: true,
                    handled_at: new Date().toISOString()
                }
            });

            if (error) throw error;

            alert("Tranzaksyon an fèt avèk siksè!");
            setEditingUserId(null);
            setManualAmount('');

            // Refresh list
            handleSearch({ preventDefault: () => { } } as any);
        } catch (err: any) {
            console.error(err);
            alert("Erè lè n ap fè tranzaksyon an: " + err.message);
        } finally {
            isProcessingRef.current = false;
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-3xl border border-white/5 shadow-xl">
                <h2 className="text-xl font-black text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                    <span className="text-2xl">👥</span> Jesyon Itilizatè
                </h2>

                <form onSubmit={handleSearch} className="flex gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Chache ak non oswa nimewo telefòn..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all"
                    >
                        {isSearching ? '...' : 'Chache'}
                    </button>
                </form>

                <div className="space-y-4">
                    {users.map(u => (
                        <div key={u.id} className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center group">
                            <div className="flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg font-black text-white">{u.username}</span>
                                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                                        {u.user_payment_info?.[0]?.phone_number || u.user_payment_info?.phone_number || 'Pa gen nimewo'}
                                    </span>
                                </div>
                                <div className="text-sm font-bold text-slate-400 mt-1 flex gap-4">
                                    <span>Balans: <strong className="text-green-400">{u.balance_htg} HTG</strong></span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {editingUserId === u.id ? (
                                    <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-xl border border-white/5">
                                        <input
                                            type="number"
                                            placeholder="HTG"
                                            value={manualAmount}
                                            onChange={e => setManualAmount(e.target.value)}
                                            className="w-24 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-bold outline-none text-sm"
                                        />
                                        <button
                                            onClick={() => handleManualTransaction(u.id, 'deposit')}
                                            disabled={isUpdating}
                                            className="p-2 bg-green-500/20 hover:bg-green-500/40 text-green-500 rounded-lg font-black uppercase text-[10px] transition-colors"
                                            title="Ajoute Kòb"
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => handleManualTransaction(u.id, 'withdrawal')}
                                            disabled={isUpdating}
                                            className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-lg font-black uppercase text-[10px] transition-colors"
                                            title="Retire Kòb"
                                        >
                                            -
                                        </button>
                                        <button
                                            onClick={() => { setEditingUserId(null); setManualAmount(''); }}
                                            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-black uppercase text-[10px] transition-colors"
                                        >
                                            X
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setEditingUserId(u.id)}
                                        className="px-4 py-2 bg-slate-800 border border-white/5 hover:border-blue-500/50 hover:bg-slate-800/80 text-blue-400 font-black rounded-xl text-[10px] uppercase tracking-widest transition-all"
                                    >
                                        Modifye Kòb
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {!isSearching && searchQuery && users.length === 0 && (
                        <p className="text-slate-500 text-center py-4 font-bold uppercase text-[10px] tracking-widest">Pa jwenn anyen.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
