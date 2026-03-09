import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { OnlinePlayer } from '../types';

interface RivalNotificationProps {
    currentUserId: string;
}

interface RivalMessage {
    id: string;
    message: string;
    profiles: {
        username: string;
        avatar_url: string;
    };
    user_id: string;
}

export const RivalNotification: React.FC<RivalNotificationProps> = ({ currentUserId }) => {
    const [rivalsOnline, setRivalsOnline] = useState<{ userId: string; username: string; message: string; avatar: string }[]>([]);
    const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());
    const [rivalMessages, setRivalMessages] = useState<Record<string, RivalMessage>>({});

    useEffect(() => {
        if (!currentUserId) return;

        // Fetch messages where the current user is the "opponent" (they lost against these users)
        const fetchRivalMessages = async () => {
            const { data, error } = await supabase
                .from('winner_messages')
                .select(`
                    id, 
                    message, 
                    user_id,
                    profiles:user_id(username, avatar_url)
                `)
                .eq('opponent_id', currentUserId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                // Keep only the most recent message per winner
                const messagesByRival: Record<string, RivalMessage> = {};
                for (const msg of data as any) {
                    if (!messagesByRival[msg.user_id]) {
                        messagesByRival[msg.user_id] = msg;
                    }
                }
                setRivalMessages(messagesByRival);
            }
        };

        fetchRivalMessages();
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId || Object.keys(rivalMessages).length === 0) return;

        // Listen for presence changes
        const channel = supabase.channel('mopyon_global_lobby');

        const presenceHandler = () => {
            const state = channel.presenceState();
            const onlineRivals: { userId: string; username: string; message: string; avatar: string }[] = [];

            for (const key in state) {
                const presence = state[key][0] as any;
                if (presence && presence.id && rivalMessages[presence.id]) {
                    const rivalMsg = rivalMessages[presence.id];
                    // If we haven't shown a notification for this specific message ID yet
                    if (!shownNotifications.has(rivalMsg.id)) {
                        onlineRivals.push({
                            userId: presence.id,
                            username: rivalMsg.profiles.username || 'Un joueur',
                            message: rivalMsg.message,
                            avatar: rivalMsg.profiles.avatar_url,
                        });

                        // Mark as shown so we don't spam if they reconnect multiple times in this session
                        setShownNotifications(prev => {
                            const newSet = new Set(prev);
                            newSet.add(rivalMsg.id);
                            return newSet;
                        });
                    }
                }
            }

            if (onlineRivals.length > 0) {
                setRivalsOnline(prev => [...prev, ...onlineRivals]);

                // Auto-hide after 8 seconds
                setTimeout(() => {
                    setRivalsOnline(prev => prev.filter(r => !onlineRivals.find(o => o.userId === r.userId)));
                }, 8000);
            }
        };

        // If the channel is already subscribed somewhere else, we can just listen to presence syncs
        // We'll also subscribe just in case 
        channel
            .on('presence', { event: 'sync' }, presenceHandler)
            .on('presence', { event: 'join' }, presenceHandler)
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [currentUserId, rivalMessages, shownNotifications]);

    if (rivalsOnline.length === 0) return null;

    return (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-3 pointer-events-none">
            {rivalsOnline.map((rival, index) => (
                <div
                    key={`${rival.userId}-${index}`}
                    className="bg-slate-900 border border-red-500/30 rounded-2xl p-4 shadow-2xl shadow-red-900/20 max-w-sm flex items-start gap-4 animate-[slideInRight_0.5s_ease-out] backdrop-blur-sm bg-opacity-90 pointer-events-auto"
                >
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-red-500 flex-shrink-0">
                        {rival.avatar ? (
                            <img src={rival.avatar} alt={rival.username} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-red-500 font-bold text-xl uppercase">
                                {rival.username[0]}
                            </div>
                        )}
                    </div>
                    <div className="flex-col">
                        <div className="text-xs font-black text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Rival konekte
                        </div>
                        <p className="text-sm text-white font-bold mb-1">{rival.username} ap panse avèw:</p>
                        <p className="text-sm text-slate-300 italic border-l-2 border-slate-700 pl-2">"{rival.message}"</p>
                    </div>
                </div>
            ))}
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
