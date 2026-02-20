
export interface UserProfile {
  id: string;
  username: string;
  real_name?: string;
  email: string;
  solo_level: number;
  level: number;
  xp: number;
  honorary_title: string;
  total_wins?: number;
  last_level_notified: number;
  is_admin: boolean;
  avatar_url?: string;
  avatars_url?: string;
  balance_htg: number;
}

export interface Wallet {
  id: string;
  user_id: string;
  total_balance: number;
  total_deposited: number;
  total_withdrawn: number;
  total_won: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'entry_fee' | 'prize';
  reference_id?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  description?: string;
  metadata?: any;
  payment_method?: string;
}

export interface Question {
  id: string;
  category: string;
  difficulty: string | number;
  question_text: string;
  options: string[];
  correct_index: number;
  is_for_contest: boolean;
  is_for_solo: boolean;
}

export interface GameSession {
  id: string;
  user_id: string;
  contest_id?: string;
  questions_ids: string[];
  current_index: number;
  is_completed: boolean;
  score: number;
  total_time_ms: number;
  is_finalist: boolean;
}

export interface SoloSyncData {
  sessionId: string;
  userId: string;
  score: number;
  total_time_ms: number;
  answers: {
    questionId: string;
    isCorrect: boolean;
    timeSpent: number;
  }[];
}

export interface Contest {
  id: string;
  title: string;
  category_filter?: string;
  entry_fee: number;
  entry_fee_htg?: number; // Keep for compatibility during transition
  min_participants: number;
  current_participants: number;
  status: 'pending' | 'active' | 'finished' | 'scheduled';
  grand_prize?: number;
  total_prize_pool?: number;
  winners_count?: number;
  difficulty_filter?: number;
  image_url?: string;
  admin_margin_percent: number;
  first_prize_percent?: number;
  second_prize_percent?: number;
  third_prize_percent?: number;
  fourth_prize_percent?: number;
  fifth_prize_percent?: number;
  sixth_prize_percent?: number;
  seventh_prize_percent?: number;
  eighth_prize_percent?: number;
  ninth_prize_percent?: number;
  tenth_prize_percent?: number;
  questions_ids?: string[];
  has_final_round?: boolean;
  scheduled_at?: string;
  ends_at?: string;
  question_count?: number;
  max_participants?: number;
  prize_type?: 'cash' | 'object' | 'physical' | '3d';
  prize_image_url?: string;
  prize_description?: string;
  media_type?: 'image' | 'video' | 'gif' | '3d';
}

export interface ContestParticipant {
  id: string;
  contest_id: string;
  user_id: string;
  joined_at: string;
  status: 'joined' | 'completed' | 'disqualified';
}

export interface PayoutDistribution {
  totalPool: number;
  adminMargin: number;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
  top20Shared: number;
  perTop20Member: number;
}

export interface AdminStats {
  totalUsers: number;
  totalRevenue: number;
  activeContests: number;
  totalQuestions: number;
}

export interface Review {
  id: string;
  user_id: string;
  username?: string;
  avatar_url?: string;
  rating: number;
  comment: string;
  created_at: string;
}
