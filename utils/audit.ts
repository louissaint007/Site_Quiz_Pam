import { supabase } from '../lib/supabase';

export type ActivityActionType =
    | 'login'
    | 'logout'
    | 'deposit'
    | 'withdraw'
    | 'start_solo'
    | 'finish_solo'
    | 'join_contest'
    | 'profile_update';

/**
 * Logs a user activity to the database for auditing and tracking
 */
export const logUserActivity = async (
    userId: string,
    actionType: ActivityActionType,
    details?: Record<string, any>
) => {
    try {
        // Fire and forget
        supabase.from('user_activities').insert({
            user_id: userId,
            action_type: actionType,
            details: details || {}
        }).then(({ error }) => {
            if (error) {
                console.error("Failed to log activity:", error);
            }
        });
    } catch (error) {
        console.error("Unexpected error logging activity:", error);
    }
};
