import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ContactMessage } from '../types';

export const AdminContactMessages: React.FC = () => {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('contact_messages')
            .select(`
                *,
                profiles:user_id ( username, email )
            `)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setMessages(data as ContactMessage[]);
        }
        setIsLoading(false);
    };

    const markAsResolved = async (id: string) => {
        try {
            await supabase.from('contact_messages').update({
                status: 'resolved',
                resolved_at: new Date().toISOString()
            }).eq('id', id);
            await fetchMessages();
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) return <div className="text-white text-center p-8">Chajman Tikè Sipò yo...</div>;

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                Bwat Resepsyon Sipò
            </h2>

            <div className="space-y-4">
                {messages.length === 0 ? (
                    <div className="bg-slate-800 border-2 border-dashed border-slate-700 p-12 rounded-2xl text-center">
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Ou pa gen okenn mesaj kounye a.</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className={`bg-slate-800 border ${msg.status === 'resolved' ? 'border-slate-700/50 opacity-60' : 'border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'} p-6 rounded-2xl transition-all`}>
                            <div className="flex justify-between items-start gap-4 cursor-pointer" onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${msg.status === 'resolved' ? 'bg-slate-700 text-slate-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                            {msg.status === 'resolved' ? 'Fèmen' : 'Nouvo'}
                                        </span>
                                        <span className="text-sm font-bold text-white">{msg.subject}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium">Soti nan: <span className="text-blue-400">{msg.profiles?.username || 'N/A'}</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(msg.created_at).toLocaleString('ht-HT')}</p>
                                    {msg.status === 'pending' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); markAsResolved(msg.id); }}
                                            className="mt-2 text-[10px] bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white px-3 py-1 rounded-lg font-black uppercase transition-colors"
                                        >
                                            ✔️ Make kòm Rezoud
                                        </button>
                                    )}
                                </div>
                            </div>

                            {expandedId === msg.id && (
                                <div className="mt-4 pt-4 border-t border-slate-700">
                                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{msg.message}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
