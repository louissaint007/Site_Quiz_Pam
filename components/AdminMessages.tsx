import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types';

export const AdminMessages: React.FC = () => {
    const [conversations, setConversations] = useState<{ userId: string, username: string, messages: ChatMessage[], unread: number }[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const adminIdRef = useRef<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            adminIdRef.current = data.session?.user.id || null;
        });

        fetchConversations();

        const subscription = supabase
            .channel('admin_chat_all')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages'
            }, () => {
                // Simple reload on new message to keep it properly grouped
                fetchConversations();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchConversations = async () => {
        try {
            // Grouping logic: fetch the latest 500 messages
            const { data, error } = await supabase
                .from('chat_messages')
                .select(`
          id, conversation_user_id, sender_id, message, is_read, created_at,
          profiles!chat_messages_conversation_user_id_fkey(username)
        `)
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) throw error;

            const grouped = new Map<string, any>();
            (data || []).forEach((msg: any) => {
                const cId = msg.conversation_user_id;
                if (!grouped.has(cId)) {
                    grouped.set(cId, {
                        userId: cId,
                        username: msg.profiles?.username || 'Sila a',
                        messages: [],
                        unread: 0
                    });
                }

                const group = grouped.get(cId);
                group.messages.unshift({
                    id: msg.id,
                    conversation_user_id: cId,
                    sender_id: msg.sender_id,
                    message: msg.message,
                    is_read: msg.is_read,
                    created_at: msg.created_at
                });

                if (!msg.is_read && msg.sender_id === cId) {
                    group.unread += 1;
                }
            });

            setConversations(Array.from(grouped.values()));
        } catch (err) {
            console.error(err);
        }
    };

    const handleSelectConversation = async (userId: string) => {
        setSelectedUserId(userId);

        // Mark as read
        await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .eq('conversation_user_id', userId)
            .eq('sender_id', userId)
            .eq('is_read', false);

        fetchConversations();
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedUserId, conversations]);

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedUserId || !adminIdRef.current) return;

        setIsSending(true);
        try {
            await supabase.from('chat_messages').insert({
                conversation_user_id: selectedUserId,
                sender_id: adminIdRef.current,
                message: replyMessage.trim()
            });
            setReplyMessage('');
            fetchConversations();
        } catch (err) {
            console.error(err);
            alert('Erè lè n ap voye mesaj la.');
        } finally {
            setIsSending(false);
        }
    };

    const selectedConversation = conversations.find(c => c.userId === selectedUserId);

    return (
        <div className="bg-slate-800 p-6 rounded-3xl border border-white/5 shadow-xl h-[600px] flex overflow-hidden">
            {/* Sidebar: Conversation List */}
            <div className="w-1/3 border-r border-white/5 pr-4 flex flex-col">
                <h2 className="text-xl font-black text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                    <span className="text-2xl">💬</span> Mesaj
                </h2>

                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                    {conversations.length === 0 ? (
                        <p className="text-slate-500 text-center font-bold text-xs mt-10 uppercase">Pa gen mesaj</p>
                    ) : (
                        conversations.map(c => (
                            <button
                                key={c.userId}
                                onClick={() => handleSelectConversation(c.userId)}
                                className={`w-full text-left p-4 rounded-2xl flex items-center justify-between transition-colors ${selectedUserId === c.userId ? 'bg-slate-700 border border-white/10' : 'bg-slate-900/50 hover:bg-slate-800 border border-white/5'}`}
                            >
                                <div>
                                    <p className={`font-bold ${c.unread > 0 ? 'text-white' : 'text-slate-300'}`}>@{c.username}</p>
                                    <p className="text-[10px] text-slate-500 truncate w-32 mt-1">{c.messages[c.messages.length - 1]?.message}</p>
                                </div>
                                {c.unread > 0 && (
                                    <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black text-white">{c.unread}</span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Area: Chat History */}
            <div className="flex-1 pl-4 flex flex-col h-full">
                {selectedConversation ? (
                    <>
                        <div className="pb-4 border-b border-white/5 shrink-0 flex items-center gap-3">
                            <span className="text-xl">👤</span>
                            <h3 className="font-black text-white text-lg">@{selectedConversation.username}</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {selectedConversation.messages.map((msg, i) => {
                                const isAdmin = msg.sender_id !== selectedConversation.userId;
                                return (
                                    <div key={msg.id || i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isAdmin ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none border border-white/5'}`}>
                                            <p className="text-sm">{msg.message}</p>
                                            <span className="text-[9px] font-bold block mt-1 opacity-50 block w-full text-right">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleReply} className="pt-4 border-t border-white/5 shrink-0">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={replyMessage}
                                    onChange={e => setReplyMessage(e.target.value)}
                                    placeholder="Reponn itilizatè a..."
                                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!replyMessage.trim() || isSending}
                                    className="w-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                        <span className="text-4xl mb-2 opacity-50">💬</span>
                        <p>Chwazi yon konvèsasyon pou kòmanse</p>
                    </div>
                )}
            </div>
        </div>
    );
};
