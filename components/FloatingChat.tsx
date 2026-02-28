import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, ChatMessage } from '../types';
import { motion } from 'framer-motion';

interface FloatingChatProps {
    user: UserProfile;
}

export const FloatingChat: React.FC<FloatingChatProps> = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        // Fetch initial messages
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_user_id', user.id)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setMessages(data as ChatMessage[]);
                // Count unread from admins
                const unread = data.filter(m => m.sender_id !== user.id && !m.is_read).length;
                setUnreadCount(unread);
            }
        };
        fetchMessages();

        // Subscribe to new messages
        const subscription = supabase
            .channel(`chat_${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `conversation_user_id=eq.${user.id}`
            }, (payload) => {
                const newMsg = payload.new as ChatMessage;
                setMessages(prev => [...prev, newMsg]);
                if (newMsg.sender_id !== user.id && !isOpen) {
                    setUnreadCount(prev => prev + 1);
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user.id, isOpen]);

    useEffect(() => {
        // Mark as read when opened
        if (isOpen && unreadCount > 0) {
            setUnreadCount(0);
            supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('conversation_user_id', user.id)
                .neq('sender_id', user.id)
                .eq('is_read', false)
                .then();
        }
    }, [isOpen, unreadCount, user.id]);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            await supabase.from('chat_messages').insert({
                conversation_user_id: user.id,
                sender_id: user.id,
                message: newMessage.trim()
            });
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <motion.button
                drag="y"
                dragConstraints={{ top: -window.innerHeight + 100, bottom: 0 }}
                dragMomentum={false}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-[90] w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all outline-none border-2 border-white/10"
            >
                {isOpen ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                )}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-slate-900 animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </motion.button>

            {/* Chat Window */}
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-[85]"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="fixed bottom-24 right-6 z-[90] w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">

                    {/* Default Header Header */}
                    <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-4 shrink-0 flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">👨‍💻</div>
                            <div>
                                <h3 className="font-black text-white text-sm uppercase tracking-wider">Sipò QuizPam</h3>
                                <p className="text-[10px] text-blue-200 font-bold uppercase">Nou la pou ede w</p>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50 custom-scrollbar">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-2">
                                <span className="text-4xl">👋</span>
                                <p className="text-xs font-bold text-white uppercase tracking-widest">Kòman nou ka ede w?</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => {
                                const isMe = msg.sender_id === user.id;
                                return (
                                    <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 border border-white/5 text-slate-200 rounded-bl-none'}`}>
                                            <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                            <span className={`text-[9px] font-bold block mt-1 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-white/10 shrink-0">
                        <div className="flex items-center gap-2 bg-slate-800 rounded-full p-1 pl-4 border border-white/5 focus-within:border-blue-500/50 transition-colors">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Ekri yon mesaj..."
                                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || isSending}
                                className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-slate-700 rounded-full flex items-center justify-center transition-colors shrink-0"
                            >
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                            </button>
                        </div>
                    </form>
                </div>
                </>
            )}
        </>
    );
};
