import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface WinnerMessage {
    id: string;
    message: string;
    game_type: string;
    created_at: string;
    profiles: {
        username: string;
        avatar_url: string;
        avatars_url: string;
    };
}

export const WinnerMessagesTicker: React.FC = () => {
    const [messages, setMessages] = useState<WinnerMessage[]>([]);

    useEffect(() => {
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('winner_messages')
                .select(`
                    id, message, game_type, created_at,
                    profiles:user_id (username, avatar_url, avatars_url)
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            if (!error && data) {
                setMessages(data as any);
            }
        };

        fetchMessages();

        const subscription = supabase
            .channel('public:winner_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'winner_messages' }, () => {
                fetchMessages();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const displayMessages = messages.length > 0
        ? messages
        : [{
            id: 'default',
            message: 'Akoz pako gen chanpyon ki kite mesaj. Jwe pou w ka premye a!',
            game_type: 'système',
            created_at: new Date().toISOString(),
            profiles: { username: 'Gayan', avatar_url: '', avatars_url: '' }
        }];

    return (
        <div className="w-full bg-slate-900/80 border-y border-white/10 py-3 overflow-hidden relative flex items-center shadow-inner">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-900 to-transparent z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-900 to-transparent z-10"></div>

            <div className="whitespace-nowrap flex items-center animate-[marquee_20s_linear_infinite] hover:[animation-play-state:paused]">
                {/* We map twice to create an infinite loop effect if there are few messages */}
                {[...displayMessages, ...displayMessages].map((msg, i) => (
                    <div key={`${msg.id}-${i}`} className="inline-flex items-center gap-3 px-8">
                        <span className="text-xl line-clamp-1">🏆</span>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">
                                {msg.profiles?.username || 'Gayan'} • {msg.game_type === 'mopyon' ? 'Mòpyon' : 'Konkou'}
                            </span>
                            <span className="text-sm font-bold text-white italic">"{msg.message}"</span>
                        </div>
                        <span className="text-slate-600 font-black ml-4">•</span>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
};
