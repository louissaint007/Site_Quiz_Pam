
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Question, Contest, Wallet, Transaction, SoloSyncData } from './types';
import QuizCard from './components/QuizCard';
import GameTimer from './components/GameTimer';
import AdminQuestionManager from './components/AdminQuestionManager';
import AdminStats from './components/AdminStats';
import AdminContestManager from './components/AdminContestManager';
import Auth from './components/Auth';
import ProfileView from './components/ProfileView';
import ContestDetailView from './components/ContestDetailView';
import JoinedContestsView from './components/JoinedContestsView';
import LeaderboardView from './components/LeaderboardView';
import FinalistArena from './components/FinalistArena';
import Reviews from './components/Reviews';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { calculateQuestionXp, calculateLevel, getLevelTitle, getPrestigeStyle } from './utils/xp';

const MONCASH_GATEWAY_URL = 'https://page-moncash-quiz-pam.vercel.app/';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<'landing' | 'home' | 'solo' | 'contest' | 'admin' | 'auth' | 'profile' | 'contest-detail' | 'finalist-arena' | 'reviews' | 'my-contests'>('landing');
  const [adminTab, setAdminTab] = useState<'stats' | 'questions' | 'contests'>('stats');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [joinedContests, setJoinedContests] = useState<{ id: string, status: string }[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'result'>('ready');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isShowingCorrect, setIsShowingCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [gameAnswers, setGameAnswers] = useState<{ questionId: string, isCorrect: boolean, timeSpent: number }[]>([]);
  const [fraudWarnings, setFraudWarnings] = useState(0);
  const [selectedPrizeImage, setSelectedPrizeImage] = useState<string | null>(null);

  // Timer reference for ms tracking
  const questionStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const pending = localStorage.getItem('quizpam_sync_queue');
    if (pending) setHasPendingSync(true);
  }, []);

  const fetchContests = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return;
    }
    try {
      const { data: contestsData, error } = await supabase.from('contests').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      const { data: participantsData } = await supabase.from('contest_participants').select('contest_id');
      const countsMap: Record<string, number> = {};

      if (participantsData) {
        participantsData.forEach((p: any) => {
          countsMap[p.contest_id] = (countsMap[p.contest_id] || 0) + 1;
        });
      }

      const enrichedContests = (contestsData || []).map(c => ({
        ...c,
        current_participants: countsMap[c.id] || 0
      }));

      setContests(enrichedContests);
    } catch (err: any) {
      console.error("fetchContests error:", err);
    }
  }, []);

  const fetchUserAndWallet = async (userId: string, currentSession: any) => {
    try {
      const [profileRes, walletRes, transRes, joinedRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        supabase.from('contest_participants').select('contest_id, status').eq('user_id', userId)
      ]);

      const userEmail = currentSession?.user?.email;
      let currentUser = profileRes.data;

      // Robust creation if missing
      if (!currentUser && userId) {
        console.log("[INIT] Profile missing, attempting creation for:", userId);
        const { data: created, error: createError } = await supabase.from('profiles').upsert({
          id: userId,
          username: currentSession?.user?.user_metadata?.username || `Jwe_${userId.slice(0, 4)}`,
          balance_htg: 0,
          level: 1,
          xp: 0,
          honorary_title: 'Novice',
          last_level_notified: 1
        }).select().single();

        if (createError) {
          console.error("[INIT] Profile creation error:", createError);
          // Try a simple select one last time in case of race condition
          const { data: retry } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
          currentUser = retry;
        } else {
          currentUser = created;
        }
      }

      if (currentUser) {
        setUser({ ...currentUser, email: userEmail } as UserProfile);
      } else {
        console.error("[INIT] Could not resolve user profile for:", userId);
      }

      // If wallet is missing, create it
      if (!walletRes.data && userId) {
        const { data: newWallet } = await supabase.from('wallets').upsert({
          user_id: userId,
          total_balance: 0,
          total_deposited: 0,
          total_withdrawn: 0,
          total_won: 0
        }).select().single();
        if (newWallet) setWallet(newWallet as Wallet);
      } else {
        setWallet(walletRes.data as Wallet);
      }

      if (transRes.data) setTransactions(transRes.data as Transaction[]);
      if (joinedRes.data) setJoinedContests(joinedRes.data.map((p: any) => ({ id: p.contest_id, status: p.status })));
    } catch (err) {
      console.error("[INIT] Error fetching user data:", err);
    }
  };

  const uploadResults = async (data: SoloSyncData) => {
    setIsSyncing(true);
    try {
      // 1. Update session with score and total time
      await supabase.from('game_sessions').update({
        is_completed: true,
        score: data.score,
        total_time_ms: data.total_time_ms
      }).eq('id', data.sessionId);

      // 2. Update User XP and Level
      // Fetch seen questions to detect farming BEFORE inserting new ones
      const { data: seenQuestions } = await supabase
        .from('user_solo_progress')
        .select('question_id')
        .eq('user_id', data.userId)
        .eq('is_correct', true)
        .in('question_id', data.answers.map(a => a.questionId));

      const seenIds = new Set(seenQuestions?.map(q => q.question_id) || []);

      let totalXpGained = 0;
      data.answers.forEach(ans => {
        if (ans.isCorrect) {
          const isRepeated = seenIds.has(ans.questionId);
          // Time left: Each question has 10s. timeLeft = 10 - (timeSpent/1000)
          const timeLeft = Math.max(0, 10 - (ans.timeSpent / 1000));
          totalXpGained += calculateQuestionXp(true, timeLeft, isRepeated);
        }
      });

      if (totalXpGained > 0 && user) {
        const newTotalXp = Number(user.xp || 0) + totalXpGained;
        const newLevel = calculateLevel(newTotalXp);

        let newTitle = user.honorary_title;
        if (newLevel !== user.level) {
          const { data: config } = await supabase
            .from('levels_config')
            .select('title')
            .lte('level', newLevel)
            .order('level', { ascending: false })
            .limit(1)
            .single();
          if (config) newTitle = config.title;
        }

        const { data: updatedProfile } = await supabase
          .from('profiles')
          .update({
            xp: newTotalXp,
            level: newLevel,
            honorary_title: newTitle
          })
          .eq('id', data.userId)
          .select()
          .single();

        if (updatedProfile) {
          setUser({ ...updatedProfile, email: user.email } as UserProfile);
        }
      }

      // 3. Insert detailed progress
      const progressData = data.answers.map(ans => ({
        user_id: data.userId,
        question_id: ans.questionId,
        is_correct: ans.isCorrect
      }));
      await supabase.from('user_solo_progress').insert(progressData);

      // 4. Logic: Check for perfect ties and mark as finalist if applicable
      const { data: competitors } = await supabase
        .from('game_sessions')
        .select('id, score, total_time_ms')
        .eq('contest_id', selectedContest?.id || '')
        .neq('user_id', data.userId)
        .eq('score', data.score)
        .eq('total_time_ms', data.total_time_ms);

      if (competitors && competitors.length > 0) {
        await supabase.from('game_sessions').update({ is_finalist: true }).eq('id', data.sessionId);
        for (const comp of competitors) {
          await supabase.from('game_sessions').update({ is_finalist: true }).eq('id', comp.id);
        }
      }

      // 5. Update Contest Participant status if this was a contest
      if (selectedContest?.id) {
        await supabase.from('contest_participants').update({
          status: 'completed',
          score: data.score,
          completed_at: new Date().toISOString()
        }).eq('contest_id', selectedContest.id).eq('user_id', data.userId);

        // Update local state without fetching
        setJoinedContests(prev => prev.map(jc => jc.id === selectedContest.id ? { ...jc, status: 'completed' } : jc));
      }

      localStorage.removeItem('quizpam_sync_queue');
      setHasPendingSync(false);
      return true;
    } catch (err) {
      localStorage.setItem('quizpam_sync_queue', JSON.stringify(data));
      setHasPendingSync(true);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUser(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      return publicUrl;
    } catch (err: any) {
      setError("Erè pandan n ap chanje foto a: " + err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const syncPending = async () => {
    const pending = localStorage.getItem('quizpam_sync_queue');
    if (!pending) return;
    await uploadResults(JSON.parse(pending));
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (gameState === 'playing' && document.hidden) {
        setFraudWarnings(prev => {
          const next = prev + 1;
          if (next >= 2) {
            setError("Ou soti nan paj la twòp fwa. Konkou a anile pou fwòd.");
            setGameState('ready');
            setView('home');
          } else {
            alert("AVÈTISMAN: Pa kite paj la pandan konkou a ap dewoule. Si ou refè sa, w ap diskalifye.");
          }
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gameState]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {

      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) console.warn("[INIT] Get session error:", error);

        if (!isMounted) return;
        setSession(currentSession);

        // Turn off loading as soon as we have the session (logged in or guest)
        // This allows the UI to mount while data fetches happen in background
        setIsLoading(false);

        if (currentSession) {
          console.log("[INIT] Step 2: Fetching user data AND contests (background)...");
          // Fire and forget (don't await) so UI can show up immediately
          fetchContests().catch(e => console.error("fetchContests error:", e));
          fetchUserAndWallet(currentSession.user.id, currentSession).catch(e => console.error("fetchUserAndWallet error:", e));
          syncPending().catch(e => console.error("syncPending error:", e));
        } else {
          console.log("[INIT] Step 2: Fetching contests (Guest, background)...");
          fetchContests().catch(e => console.error("fetchContests error:", e));
        }

      } catch (err: any) {
        console.error("[INIT] Global initialization error:", err);
        setIsLoading(false); // Fail-safe
      }
    };

    // Failsafe timeout: Force loading to false after 6 seconds no matter what
    const failsafe = setTimeout(() => {
      if (isMounted && isLoading) {
        console.log("[INIT] Failsafe timeout triggered: forcing isLoading to false");
        setIsLoading(false);
      }
    }, 6000);

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("[INIT] Auth state changed:", event);
      if (!isMounted) return;

      setSession(currentSession);

      if (currentSession) {
        // Refresh data if user changed or was missing
        if (!user || user.id !== currentSession.user.id) {
          fetchUserAndWallet(currentSession.user.id, currentSession).catch(e => console.error("AuthChange fetch error:", e));
        }
      } else {
        setUser(null);
        setWallet(null);
        setTransactions([]);
      }

      // Always ensure loading is false on major auth events
      if (isLoading) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [fetchContests]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setWallet(null);
    setTransactions([]);
    setView('home');
    setGameState('ready');
    setIsMobileMenuOpen(false);
  };

  const startGame = async (mode: 'solo' | 'contest' | 'finalist', overrideContest?: Contest) => {
    const currentContest = overrideContest || selectedContest;
    if (!session || !user) { setView('auth'); return; }
    setIsLoading(true);
    setError(null);
    try {
      let selectedIds: string[] = [];

      if (mode === 'finalist') {
        // Special final round logic: Get Expert questions
        const { data: expertPool } = await supabase
          .from('questions')
          .select('id')
          .eq('difficulty', 4) // Expert
          .limit(10);
        selectedIds = (expertPool || []).map(q => q.id).sort(() => Math.random() - 0.5);
      } else if (mode === 'contest') {
        const poolIds = currentContest?.questions_ids || [];
        const drawCount = currentContest?.question_count || 10;

        if (poolIds.length < (drawCount || 5)) {
          throw new Error("Pa gen ase kòb kesyon pou konkou sa a ankò.");
        }

        // Randomly draw X questions from the pool
        selectedIds = [...poolIds]
          .sort(() => Math.random() - 0.5)
          .slice(0, drawCount);
      } else if (mode === 'solo') {
        const { data: seenData } = await supabase.from('user_solo_progress').select('question_id').eq('user_id', user.id);
        const seenIds = seenData?.map(d => d.question_id) || [];
        let query = supabase.from('questions').select('id').eq('is_for_solo', true);
        if (seenIds.length > 0) query = query.not('id', 'in', `(${seenIds.join(',')})`);
        const { data: idPool } = await query;
        if (!idPool || idPool.length < 5) throw new Error("Ou fini tout kesyon solo yo! Nou pral ajoute lòt byento.");
        selectedIds = idPool.map(q => q.id).sort(() => Math.random() - 0.5).slice(0, 10);
      }

      const { data: gameSession, error: sessErr } = await supabase.from('game_sessions').insert({
        user_id: user.id,
        contest_id: mode === 'contest' || mode === 'finalist' ? currentContest?.id : null,
        questions_ids: selectedIds,
        is_completed: false
      }).select().single();
      if (sessErr) throw sessErr;

      const { data: fullQuestions } = await supabase.from('questions').select('*').in('id', selectedIds);

      setQuestions(fullQuestions as Question[]);
      setActiveSessionId(gameSession.id);
      setCurrentIndex(0);
      setScore(0);
      setTotalTimeMs(0);
      setGameAnswers([]);
      setGameState('playing');
      setView('solo'); // We use solo view as the generic quiz view
      setIsMobileMenuOpen(false);
      questionStartTimeRef.current = Date.now();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (idx: number) => {
    if (isShowingCorrect || gameState !== 'playing') return;

    const timeSpent = Date.now() - questionStartTimeRef.current;
    const isTimeout = idx === -1;
    const currentQ = questions[currentIndex];
    const isCorrect = !isTimeout && idx === currentQ.correct_index;

    setSelectedAnswer(idx);
    if (!isTimeout) setIsShowingCorrect(true);

    // Game points (for contests/leaderboard) - Keep current formula or update if needed
    // The user specifically asked for XP changes.
    const points = isCorrect ? (100 + Math.floor(timeLeft * 10)) : 0;

    // Total level XP gain (Calculated during uploadResults to account for repeat questions)

    const newScore = score + points;
    const newTotalTime = totalTimeMs + timeSpent;

    if (isCorrect) setScore(newScore);
    setTotalTimeMs(newTotalTime);

    const newAnswers = [...gameAnswers, { questionId: currentQ.id, isCorrect, timeSpent }];
    setGameAnswers(newAnswers);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setSelectedAnswer(null);
        setIsShowingCorrect(false);
        setTimeLeft(10);
        setCurrentIndex(prev => prev + 1);
        questionStartTimeRef.current = Date.now();
      } else {
        // Validation: Detect impossible scores (e.g., < 1s per question on average)
        const minLegalTime = questions.length * 800; // 0.8s minimum per question
        if (newTotalTime < minLegalTime) {
          setError("Pèfòmans sa a sispèk. Rezilta a pa sove pou sekirite.");
          setGameState('ready');
          setView('home');
          return;
        }

        setGameState('result');
        const finalData: SoloSyncData = {
          sessionId: activeSessionId!,
          userId: user!.id,
          score: newScore,
          total_time_ms: newTotalTime,
          answers: newAnswers
        };
        uploadResults(finalData);
      }
    }, isTimeout ? 800 : 1200);
  };

  const handleJoinContest = async (contest: Contest) => {
    if (!user || !wallet) { setView('auth'); return; }

    // Check if already joined
    if (joinedContests.some(jc => jc.id === contest.id)) {
      setError("Ou deja enskri nan konkou sa a!");
      setView('my-contests');
      return;
    }

    // Check if contest has ended
    if (contest.ends_at && new Date(contest.ends_at) < new Date()) {
      setError("Konkou sa a fini deja!");
      return;
    }

    const entryFee = contest.entry_fee || contest.entry_fee_htg || 0;

    // 1. Check if user has enough money (use profile balance as single source of truth)
    if ((user.balance_htg || 0) >= entryFee) {
      setIsLoading(true);
      try {
        // Create a completed transaction for the entry fee
        const { error: txError } = await supabase.from('transactions').insert({
          user_id: user.id,
          amount: entryFee,
          type: 'entry_fee',
          status: 'completed',
          description: `Peyiman Konkou: ${contest.title}`,
          reference_id: contest.id,
          payment_method: 'WALLET'
        });

        if (txError) throw txError;

        // 2. Register participation
        const { error: partError } = await supabase.from('contest_participants').insert({
          contest_id: contest.id,
          user_id: user.id,
          status: 'joined'
        });

        if (partError) throw partError;

        // 3. Increment current_participants count
        const { error: updateError } = await supabase
          .from('contests')
          .update({ current_participants: (contest.current_participants || 0) + 1 })
          .eq('id', contest.id);

        if (updateError) console.error("Error updating participant count:", updateError);

        await fetchUserAndWallet(user.id, session);
        await fetchContests(); // Refresh contests to show new count
        setError(null);
        setView('my-contests');
      } catch (err: any) {
        setError("Erè pandan n ap dedui kòb la: " + err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      setError(`Ou pa gen ase kòb sou balans ou (${user.balance_htg || 0} HTG). Konkou sa a koute ${entryFee} HTG. Tanpri fè yon depo.`);
      setView('profile');
    }
  };

  const redirectToMonCash = async (amount: number, type: 'deposit' | 'entry_fee', contestId?: string) => {
    if (!user) { setView('auth'); return; }

    // Generate a combined ID: userId__uuid
    // This ensures we can ALWAYS recover the user_id from the reference
    const orderId = `${user.id}__${crypto.randomUUID()}`;

    try {
      // Create a pending transaction record first
      await supabase.from('transactions').insert({
        id: orderId,
        user_id: user.id,
        amount: amount,
        type: type,
        status: 'pending',
        description: type === 'deposit' ? 'Depo Balans' : `Antre Konkou`,
        reference_id: contestId || null,
        payment_method: 'MONCASH',
        metadata: {
          user_id: user.id,
          initiated_at: new Date().toISOString()
        }
      });

      // Refresh transactions list to show the pending one
      fetchUserAndWallet(user.id, session);
    } catch (err) {
      console.error("Error creating pending transaction:", err);
    }

    const params = new URLSearchParams({
      userId: user.id,
      username: user.username,
      amount: amount.toString(),
      orderId: orderId,
      type: type,
      description: type === 'deposit' ? 'Depo Balans QuizPam' : `Antre Konkou`,
    });
    if (contestId) params.append('contestId', contestId);

    const url = `${MONCASH_GATEWAY_URL}?${params.toString()}`;
    window.open(url, '_blank');
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-white font-black uppercase text-[10px] tracking-widest">Chajman...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-red-500/30">
      <nav className="bg-slate-800/60 backdrop-blur-xl border-b border-white/5 p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button onClick={() => { setView('landing'); setGameState('ready'); setIsMobileMenuOpen(false); }} className="active:scale-95 transition-transform">
            <span className="text-2xl md:text-3xl font-black tracking-tighter flex items-center">
              <span className="text-red-500 italic">Quiz</span><span className="text-white">Pam</span>
            </span>
          </button>

          <div className="flex items-center space-x-3 md:space-x-6">
            {hasPendingSync && (
              <button onClick={syncPending} disabled={isSyncing} className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-xl text-[8px] md:text-[9px] font-black text-yellow-500 uppercase animate-pulse">
                <span>{isSyncing ? '🔄 Sync...' : '🔄 Offline'}</span>
              </button>
            )}

            {session && user && (
              <button onClick={() => setView('profile')} className="flex items-center space-x-2 md:space-x-3 group bg-slate-900/40 p-1 pr-3 md:p-1 md:pr-4 rounded-2xl border border-white/5 hover:border-blue-500/50 transition-all relative overflow-hidden">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl overflow-hidden avatar-frame ${getPrestigeStyle(user.level || 1).frameClass}`}>
                  <img src={user.avatars_url || user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="Profile" className="w-full h-full object-cover rounded-lg" />
                </div>
                <div className="text-right">
                  <p className={`hidden xs:block text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none ${getPrestigeStyle(user.level || 1).textClass}`}>
                    {user.username} {getPrestigeStyle(user.level || 1).icon}
                  </p>
                  <p className="text-yellow-400 font-black text-xs md:text-sm">{(user?.balance_htg || 0).toLocaleString()} <span className="text-[10px]">HTG</span></p>
                </div>
              </button>
            )}

            {session && user && (
              <div className="hidden md:flex items-center space-x-4">
                <button onClick={() => setView('my-contests')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Konkou Mwen</button>
                <button onClick={() => setView('reviews')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Avis</button>
                {user.is_admin && (
                  <button onClick={() => setView('admin')} className="text-[10px] font-black uppercase tracking-widest bg-slate-700 hover:bg-slate-600 px-4 py-2.5 rounded-xl transition-colors">Admin</button>
                )}
                <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 transition-colors p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>
            )}

            {session && !user && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                <button onClick={handleLogout} className="text-[10px] font-black uppercase text-red-500 hover:text-red-400">Dekonekte</button>
              </div>
            )}

            {!session && (
              <div className="hidden md:flex items-center space-x-4">
                <button onClick={() => setView('my-contests')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Konkou Mwen</button>
                <button onClick={() => setView('reviews')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Avis</button>
                <button onClick={() => setView('auth')} className="text-[10px] font-black uppercase tracking-widest bg-blue-600 px-6 py-2.5 rounded-xl shadow-lg hover:bg-blue-500 transition-all">Koneksyon</button>
              </div>
            )}

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-white bg-slate-800 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900 md:hidden flex flex-col p-8 animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-12">
            <span className="text-2xl font-black italic"><span className="text-red-500">Quiz</span>Pam</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-800 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <button onClick={() => { setView('landing'); setIsMobileMenuOpen(false); }} className="w-full text-left p-6 bg-slate-800 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-between">Landing <span>🌐</span></button>
            <button onClick={() => { setView('home'); setIsMobileMenuOpen(false); }} className="w-full text-left p-6 bg-slate-800 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-between">Lobby <span>🏠</span></button>
            <button onClick={() => { setView('my-contests'); setIsMobileMenuOpen(false); }} className="w-full text-left p-6 bg-slate-800 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-between">Konkou Mwen <span>🏆</span></button>
            <button onClick={() => { setView('reviews'); setIsMobileMenuOpen(false); }} className="w-full text-left p-6 bg-slate-800 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-between">Avis Kliyan <span>💬</span></button>
            {user && (
              <>
                <button onClick={() => { setView('profile'); setIsMobileMenuOpen(false); }} className="w-full text-left p-6 bg-slate-800 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-between">Profil & Depo <span>💰</span></button>
                {user.is_admin && <button onClick={() => { setView('admin'); setIsMobileMenuOpen(false); }} className="w-full text-left p-6 bg-slate-800 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-between">Admin <span>🛡️</span></button>}
              </>
            )}
          </div>
          <div className="pt-8 border-t border-white/5 mt-auto">
            {user ? (
              <button onClick={handleLogout} className="w-full py-5 bg-red-500/10 text-red-500 font-black rounded-3xl uppercase tracking-widest text-xs border border-red-500/20">Dekonekte</button>
            ) : (
              <button onClick={() => { setView('auth'); setIsMobileMenuOpen(false); }} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl uppercase tracking-widest text-xs">Koneksyon</button>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-6 font-bold text-center uppercase text-xs">{error}</div>}

        {view === 'landing' && (
          <div className="space-y-24 py-12">
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row items-center gap-12 animate-in fade-in slide-in-from-bottom duration-700">
              <div className="flex-1 space-y-8 text-center md:text-left">
                <div className="inline-block px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
                  <span className="text-red-500 font-black uppercase text-[10px] tracking-[0.2em]">Pati #1 Ayiti a</span>
                </div>
                <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none">
                  DEFIYE <br />
                  <span className="text-red-500">TÈT OU.</span> <br />
                  GENYEN.
                </h1>
                <p className="text-xl text-slate-400 max-w-lg">
                  QuizPam se premye platfòm kilti jeneral an Ayiti ki pèmèt ou teste konesans ou, defiye zanmi w, epi genyen prim an lajan kach.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button onClick={() => setView('home')} className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/20 transition-all active:scale-95">ANTRE NAN JWÈT LA</button>
                  <button onClick={() => startGame('solo')} className="px-10 py-5 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl uppercase text-xs tracking-widest border border-white/5 transition-all active:scale-95">PRATIK SOLO</button>
                </div>
              </div>
              <div className="flex-1 relative">
                <div className="absolute -inset-10 bg-blue-600/20 blur-[100px] rounded-full"></div>
                <div className="relative bg-slate-800 rounded-[3rem] p-4 border border-white/10 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden">
                    <div className="p-8 space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center text-2xl">🏆</div>
                        <span className="text-yellow-500 font-black">TOP JWÈ</span>
                      </div>
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                            <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                            <div className="flex-1 h-2 bg-slate-700 rounded-full"></div>
                            <div className="w-12 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-800/40 p-10 rounded-[2.5rem] border border-white/5 space-y-4 hover:border-blue-500/30 transition-colors">
                <div className="text-4xl">⚡</div>
                <h3 className="text-2xl font-black text-white">Rapidite</h3>
                <p className="text-slate-400">Plis ou reponn vit, plis ou fè pwen. Chak milisegonn konte!</p>
              </div>
              <div className="bg-slate-800/40 p-10 rounded-[2.5rem] border border-white/5 space-y-4 hover:border-red-500/30 transition-colors">
                <div className="text-4xl">💰</div>
                <h3 className="text-2xl font-black text-white">Prim</h3>
                <p className="text-slate-400">Patisipe nan konkou epi retire kòb ou dirèkteman sou MonCash.</p>
              </div>
              <div className="bg-slate-800/40 p-10 rounded-[2.5rem] border border-white/5 space-y-4 hover:border-yellow-500/30 transition-colors">
                <div className="text-4xl">📚</div>
                <h3 className="text-2xl font-black text-white">Konesans</h3>
                <p className="text-slate-400">Dè milye de kesyon sou kilti Ayisyen ak mond lan an jeneral.</p>
              </div>
            </div>
          </div>
        )}

        {view === 'my-contests' && (
          <JoinedContestsView
            contests={contests}
            joinedContests={joinedContests}
            onBack={() => setView('home')}
            onEnterContest={(c) => {
              setSelectedContest(c);
              startGame('contest', c);
            }}
            onViewRankings={(c) => {
              setSelectedContest(c);
              setView('leaderboard');
            }}
          />
        )}
        {view === 'auth' && <Auth onAuthComplete={() => setView('home')} />}
        {view === 'profile' && user && (
          <ProfileView
            user={user}
            wallet={wallet}
            transactions={transactions}
            onBack={async () => {
              if (user.level > (user.last_level_notified || 1)) {
                await supabase.from('profiles').update({ last_level_notified: user.level }).eq('id', user.id);
                setUser(prev => prev ? { ...prev, last_level_notified: user.level } : null);
              }
              setView('home');
            }}
            onDeposit={(amount) => redirectToMonCash(amount, 'deposit')}
          />
        )}
        {view === 'contest-detail' && selectedContest && (
          <ContestDetailView
            contest={selectedContest}
            userBalance={user?.balance_htg || 0}
            isJoined={joinedContests.some(jc => jc.id === selectedContest.id)}
            onBack={() => setView('home')}
            onJoin={() => handleJoinContest(selectedContest)}
            onGoToMyContests={() => setView('my-contests')}
            onPrizeClick={(url) => setSelectedPrizeImage(url)}
          />
        )}
        {view === 'leaderboard' && selectedContest && (
          <LeaderboardView
            contest={selectedContest}
            currentUserId={user?.id || ''}
            onBack={() => setView('my-contests')}
          />
        )}
        {view === 'finalist-arena' && selectedContest && (
          <FinalistArena contestTitle={selectedContest.title} onStartFinal={() => startGame('finalist')} />
        )}
        {view === 'reviews' && (
          <Reviews user={user} />
        )}

        {view === 'home' && (
          <div className="space-y-12 py-12">
            <div className="text-center space-y-4">
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase mb-4">Lobby <span className="text-red-500">Jwèt Yo</span></h1>
              <p className="text-lg text-slate-400 max-w-md mx-auto">Chwazi yon konkou oswa antrene tèt ou an Solo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-slate-800/40 rounded-[2.5rem] border-2 border-dashed border-slate-700 p-8 flex flex-col justify-between group hover:border-blue-500/50 cursor-pointer transition-all" onClick={() => startGame('solo')}>
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">🕹️</div>
                  <h3 className="text-2xl font-black text-white">Pratik Solo</h3>
                  <p className="text-slate-500 text-sm">Chaje yon pack 10 kesyon nèf epi jwe menm si w pa gen entènèt.</p>
                </div>
                <button className="mt-8 w-full py-4 bg-slate-700 group-hover:bg-blue-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all">KÒMANSE SOLO</button>
              </div>

              {contests.map(c => {
                const targetParticipants = (c.max_participants && c.max_participants > 0) ? c.max_participants : (c.min_participants || 1);
                const progress = Math.min(100, ((c.current_participants || 0) / targetParticipants) * 100);
                const isObjectPrize = c.prize_type === 'object';

                return (
                  <div key={c.id} className="bg-slate-800 rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col group hover:scale-[1.02] transition-all shadow-2xl relative">
                    {/* Header Media */}
                    <div className="h-48 bg-slate-700 relative overflow-hidden flex items-end p-6">
                      {c.media_type === 'video' || (c.image_url?.endsWith('.mp4')) ? (
                        <video src={c.image_url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(to bottom, transparent, rgba(15, 23, 42, 0.98)), url(${c.image_url})` }} />
                      )}
                      <h4 className="relative z-10 text-xl font-black text-white truncate drop-shadow-lg">{c.title}</h4>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-6 py-3 bg-slate-900/40 border-b border-white/5">
                      <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-700 shadow-[0_0_12px_rgba(250,204,21,0.6)] animate-pulse"
                          style={{ width: `${Math.max(2, progress)}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-yellow-400 font-black">{(c.entry_fee || 0)} HTG</span>
                        <div className="flex items-center gap-2 bg-slate-900/60 p-2 pl-3 rounded-2xl border border-white/5">
                          <span className="text-green-400 font-black text-[10px]">
                            {isObjectPrize ? c.prize_description : `${c.grand_prize} HTG`}
                          </span>
                          {isObjectPrize && c.prize_image_url && (
                            <img src={c.prize_image_url} onClick={(e) => { e.stopPropagation(); setSelectedPrizeImage(c.prize_image_url!); }} className="w-8 h-8 rounded-lg object-cover cursor-zoom-in" />
                          )}
                        </div>
                      </div>
                      <button onClick={() => { setSelectedContest(c); setView('contest-detail'); }} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-colors">Patisipe</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {gameState === 'playing' && questions[currentIndex] && (
          <div className="max-w-3xl mx-auto pt-8 animate-in fade-in zoom-in">
            <div className="flex justify-between items-center mb-6 px-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kesyon {currentIndex + 1} / {questions.length}</span>
              <div className="text-right">
                <span className="text-xl font-black text-blue-400 block">{score} PTS</span>
                <span className="text-[9px] text-slate-500 font-bold">⏱️ {(totalTimeMs / 1000).toFixed(2)}s</span>
              </div>
            </div>
            <QuizCard
              question={questions[currentIndex]}
              onSelect={handleSelect}
              selectedId={selectedAnswer}
              showCorrect={isShowingCorrect}
            />
            {!isShowingCorrect && (
              <GameTimer
                duration={10}
                onTimeUp={() => handleSelect(-1)}
                isActive={gameState === 'playing' && !isShowingCorrect}
                onTick={setTimeLeft}
              />
            )}
          </div>
        )}

        {gameState === 'result' && (
          <div className="text-center py-20 space-y-8 animate-in zoom-in">
            <div className="w-32 h-32 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto text-6xl mb-4 shadow-2xl">🏆</div>
            <h2 className="text-6xl md:text-8xl font-black text-white mb-2 tracking-tighter uppercase">Nòt: {score}</h2>
            <div className="space-y-1">
              <p className="text-slate-400 font-bold uppercase tracking-[0.4em]">Tan Total: {(totalTimeMs / 1000).toFixed(2)}s</p>
              <p className="text-[10px] text-slate-500">Règ: Score segon nan egalitarian se Tan ki depataje.</p>
            </div>
            <div className="pt-8">
              <button onClick={() => { setView('home'); setGameState('ready'); }} className="bg-blue-600 text-white px-16 py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-xl active:translate-y-2 transition-all hover:bg-blue-500">Tounen Lobby</button>
            </div>
          </div>
        )}

        {view === 'admin' && user?.is_admin && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex gap-4 border-b border-white/5 pb-4 overflow-x-auto">
              <button onClick={() => setAdminTab('stats')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Stats</button>
              <button onClick={() => setAdminTab('questions')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'questions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Kesyon</button>
              <button onClick={() => setAdminTab('contests')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'contests' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Konkou</button>
            </div>
            {adminTab === 'stats' && <AdminStats />}
            {adminTab === 'questions' && <AdminQuestionManager />}
            {adminTab === 'contests' && <AdminContestManager />}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {selectedPrizeImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setSelectedPrizeImage(null)}
        >
          <button
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-[110]"
            onClick={() => setSelectedPrizeImage(null)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div
            className="max-w-5xl max-h-[90vh] w-full relative animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPrizeImage}
              alt="Grand Prize Full View"
              className="w-full h-full object-contain rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>
      )}

      <footer className="mt-auto py-10 text-center border-t border-white/5 opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">© 2025 QuizPam - Tout dwa rezève</p>
      </footer>
    </div>
  );
};

export default App;
