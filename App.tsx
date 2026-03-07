
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, Question, Contest, Wallet, Transaction, SoloSyncData, MopyonInvite } from './types';
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
import AdminSettings from './components/AdminSettings';
import AdBlock from './components/AdBlock';
import { ManualPaymentModal } from './components/ManualPaymentModal';
import { FloatingChat } from './components/FloatingChat';
import { AdminUserExplorer } from './components/AdminUserExplorer';
import { AdminMessages } from './components/AdminMessages';
import { logUserActivity } from './utils/audit';
import { MoKwazeDinamik } from './components/MoKwazeDinamik';
import { AdminStoryManager } from './components/AdminStoryManager';
import { Gomoku } from './components/Gomoku';
import TermsOfUse from './components/TermsOfUse';
import { AdminFAQManager } from './components/AdminFAQManager';
import FAQView from './components/FAQ';
import ContactUs from './components/ContactUs';
import { AdminContactMessages } from './components/AdminContactMessages';
import PrivacyPolicy from './components/PrivacyPolicy';
import { subscribeToMopyonInvites, respondToInvite } from './utils/mopyonMultiplayer';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<'landing' | 'home' | 'solo' | 'contest' | 'admin' | 'auth' | 'profile' | 'contest-detail' | 'finalist-arena' | 'reviews' | 'my-contests' | 'mokwaze' | 'gomoku' | 'terms' | 'faq' | 'contact' | 'privacy'>('landing');
  const [adminTab, setAdminTab] = useState<'stats' | 'questions' | 'contests' | 'users' | 'messages' | 'settings' | 'stories' | 'faqs' | 'support'>('stats');
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
  const [globalInvite, setGlobalInvite] = useState<MopyonInvite | null>(null);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [fraudWarnings, setFraudWarnings] = useState(0);
  const [selectedPrizeImage, setSelectedPrizeImage] = useState<string | null>(null);
  const [mopyonRoomId, setMopyonRoomId] = useState<string | null>(null);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);

  // Timer reference for ms tracking
  const questionStartTimeRef = useRef<number>(0);

  // Manual Payment State
  const [manualPaymentInfo, setManualPaymentInfo] = useState<{ amount: number, type: 'deposit' | 'entry_fee' | 'withdraw', contestId?: string } | null>(null);

  useEffect(() => {
    const pending = localStorage.getItem('quizpam_sync_queue');
    if (pending) setHasPendingSync(true);

    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room');
    if (room) {
      setMopyonRoomId(room);
      // We don't setView yet, we wait for Auth to figure out if they exist or need a guest profile
    }
  }, []);

  const fetchContests = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return;
    }
    try {
      // Also fetch settings when we fetch contests for the Lobby display
      const { data: settingsData } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (settingsData) setSiteSettings(settingsData);

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
          weekly_xp: 0,
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

      logUserActivity(data.userId, 'finish_solo', { score: data.score, timeMs: data.total_time_ms });

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
        const newWeeklyXp = Number(user.weekly_xp || 0) + totalXpGained;
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
            weekly_xp: newWeeklyXp,
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

  // Global Invite Listener
  useEffect(() => {
    if (user && !user.id.startsWith('guest-')) {
      const unsub = subscribeToMopyonInvites(user.id, (invite) => {
        setGlobalInvite(invite);
      });
      return () => unsub();
    }
  }, [user]);

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
          fetchUserAndWallet(currentSession.user.id, currentSession).then(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const room = urlParams.get('room');
            if (room) {
              setMopyonRoomId(room);
              setView('gomoku');
            }
          }).catch(e => console.error("fetchUserAndWallet error:", e));
          syncPending().catch(e => console.error("syncPending error:", e));
        } else {
          console.log("[INIT] Step 2: Fetching contests (Guest, background)...");
          fetchContests().catch(e => console.error("fetchContests error:", e));

          const urlParams = new URLSearchParams(window.location.search);
          const room = urlParams.get('room');
          if (room) {
            // Unauthenticated user opening a Mòpyon link. Redirect to login.
            setMopyonRoomId(room);
            setView('auth');
          } else {
            // Let the default init hide loading
          }
        }

      } catch (err: any) {
        console.error("[INIT] Global initialization error:", err);
      } finally {
        setIsLoading(false); // Ensure loading is always false after init auth
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

      if (event === 'SIGNED_IN' && currentSession) {
        logUserActivity(currentSession.user.id, 'login', { method: 'auth_state_change' });
      }

      setSession(currentSession);

      if (currentSession) {
        // Refresh data if user changed or was missing
        if (!user || user.id !== currentSession.user.id) {
          fetchUserAndWallet(currentSession.user.id, currentSession).catch(e => console.error("AuthChange fetch error:", e));
        }
      } else {
        // Only clear if we aren't a guest in a game
        if (!user?.id.startsWith('guest-')) {
          setUser(null);
          setWallet(null);
          setTransactions([]);
        }
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
    if (user) {
      logUserActivity(user.id, 'logout');
    }
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

      logUserActivity(user.id, mode === 'solo' ? 'start_solo' : 'join_contest', {
        mode,
        contestId: currentContest?.id,
        sessionId: gameSession.id
      });

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
          setError("Pèfòmans sa a sispèk. Rezilta a pa save pou sekirite.");
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

        logUserActivity(user.id, 'join_contest', { contestId: contest.id, title: contest.title, fee: entryFee });

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
    logUserActivity(user.id, type === 'deposit' ? 'deposit' : 'join_contest', { amount, method: 'manual_intent', contestId });
    setManualPaymentInfo({ amount, type, contestId });
  };

  const handleMonCashWithdrawal = async (amount: number, phone: string) => {
    if (!user) { setView('auth'); return; }

    if ((user.balance_htg || 0) < amount) {
      setError(`Ou pa gen ase kòb. Solde w se ${user.balance_htg} HTG.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    logUserActivity(user.id, 'withdraw', { amount, method: 'manual_intent', phone });
    setManualPaymentInfo({ amount, type: 'withdraw' });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-white font-black uppercase text-[10px] tracking-widest">Chajman...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-red-500/30">
      <header className="bg-slate-800 border-b-4 border-slate-900 p-3 md:p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button onClick={() => { setView('landing'); setGameState('ready'); }} className="active:scale-95 transition-transform">
            <span className="text-2xl md:text-3xl font-black tracking-tighter flex items-center drop-shadow-md">
              <span className="text-red-500 italic">Quiz</span><span className="text-white">Pam</span>
            </span>
          </button>

          <div className="flex items-center space-x-2 md:space-x-4">
            {hasPendingSync && (
              <button onClick={syncPending} disabled={isSyncing} className="bg-yellow-500 text-slate-900 px-3 py-1.5 rounded-full text-[10px] font-black uppercase animate-bounce shadow-lg">
                {isSyncing ? '🔄 Sync...' : '⚠️ Offline'}
              </button>
            )}

            {session && user ? (
              <div className="flex items-center gap-2 bg-slate-900/80 pr-3 md:pr-4 rounded-[2rem] border-2 border-slate-700 shadow-inner">
                <button onClick={() => setView('profile')} className="active:scale-95 transition-transform flex items-center">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden avatar-frame ${getPrestigeStyle(user.level || 1).frameClass}`}>
                    <img src={user.avatars_url || user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="Profile" className="w-full h-full object-cover rounded-full" />
                  </div>
                </button>
                <div className="flex flex-col justify-center ml-1">
                  <p className="text-yellow-400 font-black text-xs md:text-base leading-none drop-shadow-sm flex items-center gap-1">
                    {(user?.balance_htg || 0).toLocaleString()} <span className="hidden xs:inline text-[10px] text-white/70 uppercase">HTG</span>
                  </p>
                  <p className={`hidden sm:block text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none mt-1 ${getPrestigeStyle(user.level || 1).textClass}`}>
                    {user.username.substring(0, 8)} Lvl {user.level}
                  </p>
                </div>
              </div>
            ) : (!session && (
              <button onClick={() => setView('auth')} className="btn-bouncy btn-bouncy-primary px-6 py-2 rounded-2xl font-black uppercase tracking-widest text-xs">
                Koneksyon
              </button>
            ))}

            {session && user?.is_admin && (
              <button onClick={() => setView('admin')} className="text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-fuchsia-600 shadow-[0_4px_0_#86198f] active:shadow-none active:translate-y-1 text-white px-2 py-1.5 md:px-4 md:py-2 rounded-xl transition-all ml-1 md:ml-2 border border-white/20">
                Admin
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 flex flex-col min-h-[calc(100vh-100px)] pb-28 md:pb-8">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-6 font-bold text-center uppercase text-xs">{error}</div>}

        {view === 'landing' && (
          <div className="space-y-24 py-12">
            {/* Hero Section */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 animate-in fade-in slide-in-from-bottom duration-700">
              <div className="flex-1 space-y-6 md:space-y-8 text-center md:text-left">
                <div className="inline-block px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
                  <span className="text-red-500 font-black uppercase text-[10px] tracking-[0.2em]">Pati #1 Ayiti a</span>
                </div>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-none break-words">
                  DEFYE <br />
                  <span className="text-red-500">TÈT OU.</span> <br />
                  GENYEN.
                </h1>
                <p className="text-lg md:text-xl text-slate-400 max-w-lg mx-auto md:mx-0">
                  QuizPam se premye platfòm kilti jeneral an Ayiti ki pèmèt ou teste konesans ou, defye zanmi w, epi genyen prim an lajan kach.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 pt-4 md:justify-start">
                  <button onClick={() => setView('home')} className="px-6 py-4 sm:px-10 sm:py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-[2rem] uppercase text-[10px] sm:text-xs tracking-widest shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:shadow-[0_0_40px_rgba(59,130,246,0.7)] transition-all active:scale-95 border border-white/10 w-full sm:w-auto">ANTRE NAN JWÈT LA</button>
                  <button onClick={() => startGame('solo')} className="px-6 py-4 sm:px-10 sm:py-5 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md text-white font-black rounded-[2rem] uppercase text-[10px] sm:text-xs tracking-widest border border-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all active:scale-95 w-full sm:w-auto">PRATIK SOLO</button>
                  <button onClick={() => setView('mokwaze')} className="px-6 py-4 sm:px-10 sm:py-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black rounded-[2rem] uppercase text-[10px] sm:text-xs tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all active:scale-95 border border-white/10 flex items-center justify-center gap-2 w-full sm:w-auto">⏱️ MO KWAZE DINAMIK</button>
                </div>
              </div>
              <div className="flex-1 relative">
                <div className="absolute -inset-10 bg-gradient-to-tr from-blue-600/30 to-purple-600/30 blur-[100px] rounded-full animate-pulse"></div>
                <div className="relative bg-slate-800 rounded-[3rem] p-4 border border-white/10 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden">
                    <div className="p-8 space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center text-2xl">🏆</div>
                        <span className="text-yellow-500 font-black">TOP JWÈ</span>
                      </div>
                      <div className="space-y-4">
                        {siteSettings?.top_players && siteSettings.top_players.length > 0 ? (
                          siteSettings.top_players.map((tp: any, i: number) => (
                            <div key={tp.id} className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-2xl border border-white/5 animate-in slide-in-from-right duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-700 border border-white/10 shrink-0">
                                <img src={tp.avatar_url || tp.avatars_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tp.username}`} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase text-white tracking-widest leading-none truncate">{tp.username}</p>
                                <p className="text-[9px] font-bold text-yellow-500 uppercase mt-1 truncate">⚡ {tp.score} XP</p>
                              </div>
                              <div className="text-[10px] shrink-0 font-black text-slate-500 italic">#{i + 1}</div>
                            </div>
                          ))
                        ) : (
                          [1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-white/5 opacity-50">
                              <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse"></div>
                              <div className="flex-1 h-2 bg-slate-700 rounded-full animate-pulse"></div>
                              <div className="w-12 h-2 bg-blue-500/20 rounded-full"></div>
                            </div>
                          ))
                        )}
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
            onWithdraw={handleMonCashWithdrawal}
            onLogout={handleLogout}
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
        {view === 'mokwaze' && (
          <MoKwazeDinamik onExit={() => setView('home')} />
        )}
        {view === 'gomoku' && user && (
          <Gomoku user={user} onExit={() => { setView('home'); setMopyonRoomId(null); window.history.replaceState({}, '', window.location.pathname); }} roomId={mopyonRoomId} />
        )}

        {view === 'home' && (
          <div className="space-y-12 py-12 animate-in fade-in duration-500">
            {/* Carousel Banner Space */}
            {siteSettings?.carousel_images && siteSettings.carousel_images.length > 0 && (
              <div className="w-full h-48 md:h-64 rounded-[2.5rem] overflow-hidden relative shadow-2xl border border-white/5 mx-auto mb-12">
                <div className="flex w-full h-full animate-[slide_15s_infinite]">
                  {siteSettings.carousel_images.map((url: string, idx: number) => (
                    <img key={idx} src={url} alt={`Banner ${idx}`} className="w-full h-full object-cover shrink-0" />
                  ))}
                  {/* Duplicate first image for seamless loop if there are multiple */}
                  {siteSettings.carousel_images.length > 1 && (
                    <img src={siteSettings.carousel_images[0]} alt="Banner Dup" className="w-full h-full object-cover shrink-0" />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none"></div>
                <style>{`
                  @keyframes slide {
                    0%, 20% { transform: translateX(0); }
                    ${siteSettings.carousel_images.length > 1 ? `
                      25%, 45% { transform: translateX(-100%); }
                      50%, 70% { transform: translateX(-200%); }
                      75%, 95% { transform: translateX(-300%); }
                    ` : ''}
                    100% { transform: ${siteSettings.carousel_images.length > 1 ? `translateX(-${siteSettings.carousel_images.length * 100}%)` : `translateX(0)`}; }
                  }
                `}</style>
              </div>
            )}

            <div className="text-center space-y-4 px-2">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter uppercase mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">Lobby <span className="text-red-500">Jwèt Yo</span></h1>
              <p className="text-base sm:text-lg text-slate-400 max-w-md mx-auto">Chwazi yon konkou oswa antrene tèt ou an Solo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 px-2 md:px-0">
              <div
                className={`bg-slate-800/80 rounded-[2.5rem] border-2 border-slate-700 p-8 flex flex-col justify-between group hover:border-blue-500/50 shadow-lg cursor-pointer transition-all relative overflow-hidden`}
                onClick={() => startGame('solo')}
              >
                {siteSettings?.solo_game_image_url && (
                  <div className="absolute inset-0 z-0">
                    <img src={siteSettings.solo_game_image_url} alt="Solo Cover" className="w-full h-full object-cover opacity-30 mix-blend-screen group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
                  </div>
                )}
                <div className="space-y-4 relative z-10">
                  <div className="w-16 h-16 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center text-3xl shadow-inner">🕹️</div>
                  <h3 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Pratik Solo</h3>
                  <p className="text-slate-400 text-sm font-semibold">Chaje yon pack 10 kesyon nèf epi jwe menm si w pa gen entènèt.</p>
                </div>
                <div className="relative z-10 mt-8">
                  <button className="w-full btn-bouncy btn-bouncy-primary py-4 rounded-2xl font-black uppercase tracking-widest text-sm">
                    KÒMANSE SOLO
                  </button>
                </div>
              </div>

              {/* MO KWAZE DINAMIK CARD */}
              <div
                className="bg-gradient-to-br from-amber-600/20 to-orange-800/20 rounded-[2.5rem] border-2 border-amber-500/30 p-8 flex flex-col justify-between group shadow-lg cursor-pointer relative overflow-hidden"
                onClick={() => setView('mokwaze')}
              >
                {!siteSettings?.mokwaze_cover_url && (
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwYXRoIGQ9Ik0wLDBMODw4TTAsOEw4LDBaIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] opacity-50"></div>
                )}
                {siteSettings?.mokwaze_cover_url && (
                  <div className="absolute inset-0 z-0">
                    <img src={siteSettings.mokwaze_cover_url} alt="Mo Kwaze Cover" className="w-full h-full object-cover opacity-30 mix-blend-screen group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
                  </div>
                )}
                <div className="space-y-4 relative z-10">
                  <div className="w-16 h-16 bg-amber-500/20 text-amber-500 border border-amber-500/50 rounded-2xl flex items-center justify-center text-3xl shadow-inner animate-pulse">⏱️</div>
                  <h3 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Mo Kwaze Dinamik</h3>
                  <p className="text-amber-200/80 text-sm font-semibold">Chèche mo yo rapid anvan revèy la fini. Lèt yo ap chanje plas tanzantan!</p>
                </div>
                <div className="relative z-10 mt-8">
                  <button
                    className="w-full btn-bouncy py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white"
                    style={{ backgroundColor: '#f59e0b', boxShadow: '0 6px 0 #b45309, 0 8px 10px rgba(0,0,0,0.2)' }}
                  >
                    JWE KOUNYEA
                  </button>
                </div>
              </div>

              {/* MOPYON CARD */}
              <div
                className="bg-gradient-to-br from-amber-600/20 to-yellow-800/20 rounded-[2.5rem] border-2 border-amber-500/30 p-8 flex flex-col justify-between group shadow-lg cursor-pointer relative overflow-hidden"
                onClick={() => setView('gomoku')}
              >
                {!siteSettings?.mopyon_cover_url && (
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwYXRoIGQ9Ik0wLDBMODw4TTAsOEw4LDBaIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] opacity-50 border-white/5"></div>
                )}
                {siteSettings?.mopyon_cover_url && (
                  <div className="absolute inset-0 z-0">
                    <img src={siteSettings.mopyon_cover_url} alt="Mòpyon Cover" className="w-full h-full object-cover opacity-30 mix-blend-screen group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
                  </div>
                )}
                <div className="space-y-4 relative z-10">
                  <div className="w-16 h-16 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-2xl flex items-center justify-center text-3xl shadow-inner animate-bounce">⭕</div>
                  <h3 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Mòpyon</h3>
                  <p className="text-yellow-200/80 text-sm font-semibold">Alinye 5 pyès pouw genyen kont zanmiw oswa Entèlijans Atifisyèl la.</p>
                </div>
                <div className="relative z-10 mt-8">
                  <button
                    className="w-full btn-bouncy py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-amber-900"
                    style={{ backgroundColor: '#fcd34d', boxShadow: '0 6px 0 #d97706, 0 8px 10px rgba(0,0,0,0.2)' }}
                  >
                    JWE KOUNYEA
                  </button>
                </div>
              </div>

              {contests.map(c => {
                const targetParticipants = (c.max_participants && c.max_participants > 0) ? c.max_participants : (c.min_participants || 1);
                const progress = Math.min(100, ((c.current_participants || 0) / targetParticipants) * 100);
                const isObjectPrize = c.prize_type === 'object';

                return (
                  <div key={c.id} className="bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] border border-white/10 hover:border-blue-500/30 overflow-hidden flex flex-col group hover:-translate-y-2 transition-all duration-300 shadow-xl hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] relative">
                    {/* Header Media */}
                    <div className="h-48 bg-slate-900 relative overflow-hidden flex items-end p-6 group-hover:after:absolute group-hover:after:inset-0 group-hover:after:bg-blue-500/10 group-hover:after:mix-blend-overlay">
                      {c.media_type === 'video' || (c.image_url?.endsWith('.mp4')) ? (
                        <video src={c.image_url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700" style={{ backgroundImage: `linear-gradient(to bottom, transparent, rgba(15, 23, 42, 0.98)), url(${c.image_url})` }} />
                      )}
                      <h4 className="relative z-10 text-xl font-black text-white truncate drop-shadow-xl">{c.title}</h4>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-6 py-4 bg-slate-900/60 border-b border-white/5 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner flex mb-1">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 relative"
                          style={{ width: `${Math.max(2, progress)}%` }}
                        >
                          <div className="absolute top-0 bottom-0 left-0 right-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwYXRoIGQ9Ik0wLDBMODw4TTAsOEw4LDBaIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4yKSIgc3Ryb2tlLXdpZHRoPSIzIi8+PC9zdmc+')] opacity-50 animated-stripe"></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{c.current_participants} Patisipan</span>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{Math.floor(progress)}% Ranpli</span>
                      </div>
                    </div>

                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-end">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-yellow-400 font-black text-xl drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">{(c.entry_fee || 0)} HTG</span>
                        <div className="flex items-center gap-2 bg-slate-900/80 p-2 pl-3 rounded-2xl border border-white/10 shadow-inner">
                          <span className="text-green-400 font-black text-xs drop-shadow-md">
                            {isObjectPrize ? c.prize_description : `${c.grand_prize} HTG`}
                          </span>
                          {isObjectPrize && c.prize_image_url && (
                            <img src={c.prize_image_url} onClick={(e) => { e.stopPropagation(); setSelectedPrizeImage(c.prize_image_url!); }} className="w-8 h-8 rounded-lg object-cover cursor-zoom-in border border-white/10" />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedContest(c); setView('contest-detail'); }}
                        className="w-full btn-bouncy btn-bouncy-success py-4 rounded-2xl font-black uppercase tracking-widest text-sm"
                      >
                        Patisipe
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {gameState === 'playing' && questions[currentIndex] && (
          <div className="max-w-3xl mx-auto pt-8 animate-in fade-in zoom-in h-full flex flex-col justify-between">
            <div className="flex-1">
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

            {/* Solo Game Playing Ad */}
            {view === 'solo' && (
              <AdBlock adSlot="9183909076" className="mt-8 bg-slate-800/20 rounded-2xl p-4" />
            )}
          </div>
        )}

        {gameState === 'result' && (
          <div className="text-center flex flex-col items-center justify-between min-h-[60vh] py-10 animate-in zoom-in">
            <div className="w-full">
              <div className="w-32 h-32 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto text-6xl mb-4 shadow-2xl">🏆</div>
              <h2 className="text-6xl md:text-8xl font-black text-white mb-2 tracking-tighter uppercase">Nòt: {score}</h2>
              <div className="space-y-1">
                <p className="text-slate-400 font-bold uppercase tracking-[0.4em]">Tan Total: {(totalTimeMs / 1000).toFixed(2)}s</p>
                <p className="text-[10px] text-slate-500">Règ: Score segon nan egalitarian se Tan ki depataje.</p>
              </div>
              <div className="pt-8 flex flex-col md:flex-row gap-4 justify-center items-center">
                <button onClick={() => { setView('home'); setGameState('ready'); }} className="bg-slate-700 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-xl active:translate-y-2 transition-all hover:bg-slate-600">Tounen Lobby</button>
                {view === 'solo' && (
                  <button onClick={() => startGame('solo')} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/30 active:translate-y-2 transition-all hover:scale-105">Rejwe Solo</button>
                )}
              </div>
            </div>
            {/* Solo Game Result Ad */}
            {view === 'solo' && (
              <AdBlock adSlot="9183909076" className="mt-12 bg-slate-800/20 rounded-2xl mx-auto max-w-3xl p-4 w-full" />
            )}
          </div>
        )}

        {view === 'admin' && user?.is_admin && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex gap-4 border-b border-white/5 pb-4 overflow-x-auto">
              <button onClick={() => setAdminTab('stats')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${adminTab === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Stats</button>
              <button onClick={() => setAdminTab('contests')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${adminTab === 'contests' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Konkou</button>
              <button onClick={() => setAdminTab('questions')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${adminTab === 'questions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Kesyon</button>
              <button onClick={() => setAdminTab('users')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${adminTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Itilizatè & Kòb</button>
              <button onClick={() => setAdminTab('messages')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${adminTab === 'messages' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Mesaj Chat</button>
              <button onClick={() => setAdminTab('settings')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${adminTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Anviwònman</button>
              <button onClick={() => setAdminTab('stories')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${adminTab === 'stories' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Istwa (Jwèt)</button>
              <button onClick={() => setAdminTab('faqs')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${adminTab === 'faqs' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>FAQ</button>
              <button onClick={() => setAdminTab('support')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${adminTab === 'support' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Sipò</button>
            </div>
            {adminTab === 'stats' && <AdminStats />}
            {adminTab === 'questions' && <AdminQuestionManager />}
            {adminTab === 'contests' && <AdminContestManager />}
            {adminTab === 'users' && <AdminUserExplorer />}
            {adminTab === 'messages' && <AdminMessages />}
            {adminTab === 'settings' && <AdminSettings />}
            {adminTab === 'stories' && <AdminStoryManager />}
            {adminTab === 'faqs' && <AdminFAQManager />}
            {adminTab === 'support' && <AdminContactMessages />}
          </div>
        )}

        <div className="mt-auto pt-16">
          {/* Global Ad Block (Except Contest views and Playing states) */}
          {['landing', 'home', 'profile', 'reviews', 'my-contests'].includes(view) && (
            <AdBlock adSlot="6184368307" className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50" />
          )}
        </div>
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

      {/* Terms of Use */}
      {view === 'terms' && <TermsOfUse onBack={() => setView('home')} />}

      {/* FAQ */}
      {view === 'faq' && <FAQView onBack={() => setView('home')} />}

      {/* Contact Us */}
      {view === 'contact' && <ContactUs user={user} onBack={() => setView('home')} />}

      {/* Privacy Policy */}
      {view === 'privacy' && <PrivacyPolicy onBack={() => setView('home')} />}

      {/* Manual Payment Modal */}
      {manualPaymentInfo && user && (
        <ManualPaymentModal
          user={user}
          amount={manualPaymentInfo.amount}
          type={manualPaymentInfo.type}
          contestId={manualPaymentInfo.contestId}
          onClose={() => setManualPaymentInfo(null)}
          onSuccess={() => {
            setManualPaymentInfo(null);
            fetchUserAndWallet(user.id, session);
          }}
        />
      )}

      <footer className="mt-auto py-8 mb-20 md:mb-0 border-t border-white/5 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-6">
          {/* Social Links */}
          {(siteSettings?.facebook_url || siteSettings?.instagram_url || siteSettings?.tiktok_url || siteSettings?.youtube_url || siteSettings?.x_url) && (
            <div className="flex gap-4 items-center">
              {siteSettings.facebook_url && (
                <a href={siteSettings.facebook_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-[#1877F2] hover:bg-slate-700 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </a>
              )}
              {siteSettings.instagram_url && (
                <a href={siteSettings.instagram_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-[#E1306C] hover:bg-slate-700 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                </a>
              )}
              {siteSettings.tiktok_url && (
                <a href={siteSettings.tiktok_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.96.22 3.97-1.13 5.56-1.16 1.34-2.83 2-4.57 2.02-2.31.02-4.66-.41-6.42-1.92-1.91-1.63-2.61-4.29-2.11-6.66.44-2.12 1.95-3.95 3.96-4.7 1.83-.69 3.9-.62 5.56.32v4.18c-1.14-.38-2.48-.38-3.48.33-.96.67-1.25 1.96-1.12 3.05.2 1.57 1.63 2.75 3.2 2.82 2.12.09 4.15-1.55 4.15-3.7V.02zm-2.02 0v16.15c-.01 2.76 2.37 5.06 5.16 4.94V16.6c-1.18-.04-2.36-.61-2.95-1.68-.68-1.23-.39-2.94.7-3.83-1.02-.38-2.17-.38-3.19-.01z" /></svg>
                </a>
              )}
              {siteSettings.youtube_url && (
                <a href={siteSettings.youtube_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-[#FF0000] hover:bg-slate-700 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                </a>
              )}
              {siteSettings.x_url && (
                <a href={siteSettings.x_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
              )}
            </div>
          )}

          <div className="flex gap-4 items-center flex-wrap justify-center">
            <button onClick={() => setView('terms')} className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
              Kondisyon Itilizasyon
            </button>
            <span className="text-slate-700 font-bold hidden md:inline">•</span>
            <button onClick={() => setView('privacy')} className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
              Konfidansyalite
            </button>
            <span className="text-slate-700 font-bold hidden md:inline">•</span>
            <button onClick={() => setView('faq')} className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
              FAQ
            </button>
            <span className="text-slate-700 font-bold hidden md:inline">•</span>
            <button onClick={() => setView('contact')} className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
              Kontakte Nou
            </button>
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 block">© {new Date().getFullYear()} QuizPam - Tout dwa rezève</p>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50 rounded-t-3xl md:px-8">
        <div className="flex justify-around items-center h-20 px-2 max-w-xl mx-auto">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setView('home')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${view === 'home' || view === 'landing' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <svg className={`w-6 h-6 mb-1 transition-transform ${view === 'home' || view === 'landing' ? 'drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[9px] font-black uppercase tracking-wider">Lobby</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setView('my-contests')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${view === 'my-contests' ? 'text-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <svg className={`w-6 h-6 mb-1 transition-transform ${view === 'my-contests' ? 'drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.58l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1zm-5.187 9.619l-1.065-3.325L8.52 6.37l-3.707 1.92z" clipRule="evenodd" /></svg>
            <span className="text-[9px] font-black uppercase tracking-wider">Konkou</span>
          </motion.button>

          {/* Center Play/Action Button (Optional prominent button) */}
          <div className="relative -top-6">
            <AnimatePresence>
              {isGameMenuOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsGameMenuOpen(false)}
                    className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm"
                  />
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-50 w-64 pb-4">
                    <motion.button
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.8 }}
                      transition={{ delay: 0.1 }}
                      onClick={() => { startGame('solo'); setIsGameMenuOpen(false); }}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 border-b-4 border-blue-800 active:translate-y-1 active:border-b-0"
                    >
                      <span className="text-xl">🕹️</span> Pratik Solo
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.8 }}
                      transition={{ delay: 0.05 }}
                      onClick={() => { setView('mokwaze'); setIsGameMenuOpen(false); }}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 border-b-4 border-amber-700 active:translate-y-1 active:border-b-0"
                    >
                      <span className="text-xl">⏱️</span> Mo Kwaze
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.8 }}
                      onClick={() => { setView('gomoku'); setIsGameMenuOpen(false); }}
                      className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 border-b-4 border-yellow-600 active:translate-y-1 active:border-b-0"
                    >
                      <span className="text-xl">⭕</span> Mòpyon
                    </motion.button>
                  </div>
                </>
              )}
            </AnimatePresence>
            <motion.button
              whileHover={{ scale: 1.1, rotate: [-5, 5, -5, 5, 0] }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsGameMenuOpen(!isGameMenuOpen)}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-[0_5px_15px_rgba(245,158,11,0.5)] border-4 border-slate-900 active:scale-90 transition-all z-50 relative ${isGameMenuOpen ? 'bg-slate-700 !shadow-none !border-slate-600 rotate-45' : 'bg-gradient-to-tr from-amber-500 to-orange-500'}`}
            >
              {isGameMenuOpen ? (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
              )}
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setView('reviews')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${view === 'reviews' ? 'text-green-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <svg className={`w-6 h-6 mb-1 transition-transform ${view === 'reviews' ? 'drop-shadow-[0_0_10px_rgba(74,222,128,0.6)]' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
            <span className="text-[9px] font-black uppercase tracking-wider">Avis</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (!user) { setView('auth'); return; }
              setView('profile');
            }}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${view === 'profile' || view === 'auth' ? 'text-fuchsia-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <svg className={`w-6 h-6 mb-1 transition-transform ${view === 'profile' ? 'drop-shadow-[0_0_10px_rgba(232,121,249,0.6)]' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
            <span className="text-[9px] font-black uppercase tracking-wider">{user ? 'Profil' : 'Konekte'}</span>
          </motion.button>
        </div>
      </div>

      {/* Floating Chat */}
      {user && <FloatingChat user={user} />}

      {/* Global Mòpyon Invite Modal */}
      <AnimatePresence>
        {globalInvite && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-100 rounded-[2rem] p-6 lg:p-8 max-w-sm w-full border-4 border-slate-800 shadow-[0_8px_0_0_rgba(15,23,42,1)] text-center relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-fuchsia-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

              <div className="w-20 h-20 mx-auto relative mb-4">
                {globalInvite.sender?.avatar_url ? (
                  <img src={globalInvite.sender.avatar_url} alt="Avatar" className="w-full h-full rounded-2xl object-cover border-4 border-slate-800 shadow-inner" />
                ) : (
                  <div className="w-full h-full bg-indigo-100 rounded-2xl flex items-center justify-center border-4 border-slate-800 shadow-inner">
                    <span className="text-3xl">🎮</span>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-slate-800 text-white w-8 h-8 flex items-center justify-center rounded-full border-2 border-slate-100 shadow-md">
                  ⭕
                </div>
              </div>

              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Defi Mòpyon!</h3>
              <p className="text-slate-600 font-bold mb-6 text-sm">
                <span className="text-indigo-600 font-black">{globalInvite.sender?.username || 'Yon jwè'}</span> envite w jwe yon pati Mòpyon!
              </p>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await respondToInvite(globalInvite.id, 'declined');
                    setGlobalInvite(null);
                  }}
                  className="flex-1 bg-slate-200 text-slate-600 font-black py-3 rounded-xl uppercase tracking-widest border-b-4 border-slate-300 active:translate-y-1 active:border-b-0 hover:bg-slate-300 transition-all text-xs"
                >
                  Refize
                </button>
                <button
                  onClick={async () => {
                    await respondToInvite(globalInvite.id, 'accepted');
                    setMopyonRoomId(globalInvite.match_id);
                    setView('gomoku');
                    setGlobalInvite(null);
                  }}
                  className="flex-[2] relative overflow-hidden bg-indigo-600 text-white font-black py-3 rounded-xl uppercase tracking-widest border-b-4 border-indigo-900 active:translate-y-1 active:border-b-0 hover:bg-indigo-500 transition-all shadow-md text-xs group"
                >
                  <div className="absolute inset-0 bg-white/20 -skew-x-12 -ml-10 w-4 group-hover:animate-ping pointer-events-none"></div>
                  Aksepte
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
