import { supabase } from '../lib/supabase';
import { MopyonMatch, OnlinePlayer, MopyonMessage, MopyonInvite } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// Global Lobby Channel for matchmaking and presence
let lobbyChannel: RealtimeChannel | null = null;
let activeMatchChannel: RealtimeChannel | null = null;

export const initPresence = (
    userProfiles: OnlinePlayer,
    onOnlineStateChange: (players: OnlinePlayer[]) => void,
    onChallengeReceived?: (challengerId: string, matchId: string) => void
) => {
    if (lobbyChannel) {
        supabase.removeChannel(lobbyChannel);
    }

    lobbyChannel = supabase.channel('mopyon_global_lobby');

    lobbyChannel
        .on('presence', { event: 'sync' }, () => {
            const state = lobbyChannel?.presenceState();
            if (!state) return;
            const online: OnlinePlayer[] = [];
            for (const key in state) {
                // Keep only one occurrence per user
                const present = state[key][0] as any;
                if (present && present.id) {
                    online.push({
                        id: present.id,
                        username: present.username,
                        avatar_url: present.avatar_url,
                        status: present.status || 'online'
                    });
                }
            }
            // Filter duplicates by ID just in case
            const uniqueOnline = Array.from(new Map(online.map(p => [p.id, p])).values());
            onOnlineStateChange(uniqueOnline);
        })
        .on('broadcast', { event: 'challenge' }, (payload) => {
            if (payload.payload.targetId === userProfiles.id && onChallengeReceived) {
                onChallengeReceived(payload.payload.challengerId, payload.payload.matchId);
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await lobbyChannel?.track(userProfiles);
            }
        });
};

export const updatePresenceStatus = async (status: 'online' | 'playing') => {
    if (lobbyChannel) {
        await lobbyChannel.track({ status });
    }
}

export const stopPresence = () => {
    if (lobbyChannel) {
        supabase.removeChannel(lobbyChannel);
        lobbyChannel = null;
    }
}

// ----------------- MATCH FLOW --------------------

export const createMatch = async (creatorId: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('mopyon_matches')
        .insert([{
            creator_id: creatorId,
            current_turn: creatorId, // creator starts first (X)
            status: 'waiting',
            board_state: []
        }])
        .select('id')
        .single();

    if (error) {
        console.error("Match creation error", error);
        return null;
    }
    return data.id;
};

export const joinMatch = async (matchId: string, joinerId: string): Promise<boolean> => {
    // Attempt to join
    const { data, error } = await supabase
        .from('mopyon_matches')
        .update({ joiner_id: joinerId, status: 'in_progress' })
        .eq('id', matchId)
        .is('joiner_id', null) // Avoid race condition where someone else joined
        .select()
        .single();

    if (error || !data) {
        // We might be the creator reloading, let's just fetch it
        const check = await getMatchStatus(matchId);
        if (check && (check.creator_id === joinerId || check.joiner_id === joinerId)) return true;

        console.error("Join error", error);
        return false;
    }
    return true;
};

export const getMatchStatus = async (matchId: string): Promise<MopyonMatch | null> => {
    const { data, error } = await supabase
        .from('mopyon_matches')
        .select('*')
        .eq('id', matchId)
        .single();
    if (error) return null;
    return data;
}

export const updateMatchState = async (matchId: string, boardState: any, nextTurnId: string | null, winnerId: string | null = null, newStatus: 'in_progress' | 'completed' = 'in_progress') => {
    const payload: any = {
        board_state: boardState,
        status: newStatus,
        updated_at: new Date().toISOString()
    };
    if (nextTurnId !== undefined) payload.current_turn = nextTurnId;
    if (winnerId !== undefined) payload.winner_id = winnerId;

    const { error } = await supabase.from('mopyon_matches').update(payload).eq('id', matchId);
    if (error) console.error("Error updating state", error);
};

export const forfeitMatch = async (matchId: string, winnerId: string) => {
    await supabase.from('mopyon_matches').update({
        status: 'abandoned',
        winner_id: winnerId,
        updated_at: new Date().toISOString()
    }).eq('id', matchId);
}

// Broadcast channel specific to a match (for faster real-time than DB polling)
export const subscribeToMatch = (
    matchId: string,
    onUpdate: (payload: any) => void,
    onDisconnected: () => void
) => {
    if (activeMatchChannel) {
        supabase.removeChannel(activeMatchChannel);
    }
    activeMatchChannel = supabase.channel(`match_${matchId}`);

    activeMatchChannel
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mopyon_matches', filter: `id=eq.${matchId}` }, (payload) => {
            onUpdate(payload.new);
        })
        .on('presence', { event: 'leave' }, () => {
            // If the other player leaves the channel abruptly, trigger DC logic
            onDisconnected();
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // optionally track match presence here too just for disconnect triggers
                await activeMatchChannel?.track({ in_match: true });
            }
        });
};

export const leaveMatchChannel = () => {
    if (activeMatchChannel) {
        supabase.removeChannel(activeMatchChannel);
        activeMatchChannel = null;
    }
}

export const sendChallenge = (challengerId: string, targetId: string, matchId: string) => {
    if (lobbyChannel) {
        lobbyChannel.send({
            type: 'broadcast',
            event: 'challenge',
            payload: { challengerId, targetId, matchId }
        });
    }
}

// ----------------- CHAT FLOW --------------------

export const sendMopyonMessage = async (matchId: string, senderId: string, content: string) => {
    const { error } = await supabase
        .from('mopyon_messages')
        .insert([{ match_id: matchId, sender_id: senderId, content }]);

    if (error) {
        console.error("Error sending message", error);
        return false;
    }
    return true;
}

export const getMopyonMessages = async (matchId: string): Promise<MopyonMessage[]> => {
    const { data, error } = await supabase
        .from('mopyon_messages')
        .select(`*, profiles(username, avatar_url)`)
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching messages", error);
        return [];
    }
    return data as MopyonMessage[];
}

export const subscribeToMopyonMessages = (matchId: string, onNewMessage: (msg: MopyonMessage) => void) => {
    const channel = supabase.channel(`mopyon_chat_${matchId}`);

    channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mopyon_messages', filter: `match_id=eq.${matchId}` }, async (payload) => {
            // Need to fetch user info for the new message
            const { data } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', payload.new.sender_id)
                .single();

            const msg: MopyonMessage = {
                ...payload.new as MopyonMessage,
                profiles: data || undefined
            };
            onNewMessage(msg);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

// ----------------- INVITATIONS FLOW --------------------

export const sendMopyonInvite = async (senderId: string, receiverId: string, matchId: string) => {
    const { error } = await supabase
        .from('mopyon_invites')
        .insert([{ sender_id: senderId, receiver_id: receiverId, match_id: matchId }]);

    if (error) {
        console.error("Error sending invite", error);
        return false;
    }
    return true;
}

export const getPendingInvites = async (userId: string): Promise<MopyonInvite[]> => {
    const { data, error } = await supabase
        .from('mopyon_invites')
        .select('*, sender:profiles!sender_id(username, avatar_url)')
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching invites", error);
        return [];
    }
    return data as MopyonInvite[];
}

export const respondToInvite = async (inviteId: string, status: 'accepted' | 'declined') => {
    const { error } = await supabase
        .from('mopyon_invites')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', inviteId);

    return !error;
}
