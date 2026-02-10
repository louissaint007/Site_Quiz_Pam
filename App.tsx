
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Question, Contest, Wallet, SoloSyncData } from './types';
import QuizCard from './components/QuizCard';
import GameTimer from './components/GameTimer';
import AdminQuestionManager from './components/AdminQuestionManager';
import AdminStats from './components/AdminStats';
import AdminContestManager from './components/AdminContestManager';
import Auth from './components/Auth';
import ProfileView from './components/ProfileView';
import ContestDetailView from './components/ContestDetailView';
import FinalistArena from './components/FinalistArena';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const MONCASH_GATEWAY_URL = 'https://page-moncash-quiz-pam.vercel.app/';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<'landing' | 'home' | 'solo' | 'contest' | 'admin' | 'auth' | 'profile' | 'contest-detail' | 'finalist-arena'>('landing');
  const [adminTab, setAdminTab] = useState<'stats' | 'questions' | 'contests'>('stats');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
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

  // Timer reference for ms tracking
  const questionStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const pending = localStorage.getItem('quizpam_sync_queue');
    if (pending) setHasPendingSync(true);
  }, []);

  const fetchContests = useCallback(async () => {
    if (!isSupabaseConfigured) {
      console.log("[FETCH] Supabase not configured, skipping contests");
      return;
    }
    console.log("[FETCH] Fetching contests...");
    try {
      const { data, error } = await supabase.from('contests').select('*').order('created_at', { ascending: false });
      console.log("[FETCH] Contests results:", { dataCount: data?.length, error });
      if (error) throw error;
      setContests(data || []);
    } catch (err: any) {
      console.error("[FETCH] Fetch contests failed:", err);
    }
  }, []);

  const fetchUserAndWallet = async (userId: string, currentSession: any) => {
    console.log("[FETCH] Fetching User and Wallet for:", userId);
    try {
      const [profileRes, walletRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle()
      ]);
      console.log("[FETCH] User/Wallet results recived");

      const userEmail = currentSession?.user?.email;
      let currentUser = profileRes.data;
      if (!currentUser) {
        const { data: created } = await supabase.from('profiles').upsert({
          id: userId,
          username: currentSession?.user?.user_metadata?.username || `Jwe_${userId.slice(0, 4)}`,
          balance_htg: 0, solo_level: 1, honorary_title: 'Novice'
        }).select().single();
        currentUser = created;
      }
      setUser({ ...currentUser, email: userEmail } as UserProfile);
      if (walletRes.data) setWallet(walletRes.data as Wallet);
    } catch (err) { console.error(err); }
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

      // 2. Insert detailed progress
      const progressData = data.answers.map(ans => ({
        user_id: data.userId,
        question_id: ans.questionId,
        is_correct: ans.isCorrect
      }));
      await supabase.from('user_solo_progress').insert(progressData);

      // 3. Logic: Check for perfect ties and mark as finalist if applicable
      // This is a simplified client-side check. In production, a Supabase Function would be better.
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

  const syncPending = async () => {
    const pending = localStorage.getItem('quizpam_sync_queue');
    if (!pending) return;
    console.log("[SYNC] Awaiting uploadResults for pending sync...");
    await uploadResults(JSON.parse(pending));
    console.log("[SYNC] uploadResults for pending sync finished.");
  };

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      console.log("[INIT] Step 1: getSession starting...");
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        console.log("[INIT] Step 1: getSession finished. Session exists:", !!currentSession);
        if (error) console.warn("[INIT] Get session error:", error);

        if (!isMounted) return;
        setSession(currentSession);

        if (currentSession) {
          console.log("[INIT] Step 2: Fetching data for session...");
          await Promise.all([
            fetchContests().catch(e => console.error("fetchContests error:", e)),
            fetchUserAndWallet(currentSession.user.id, currentSession).catch(e => console.error("fetchUserAndWallet error:", e))
          ]);
          console.log("[INIT] Step 2: Data fetch finished.");
          syncPending().catch(e => console.error("syncPending error:", e));
        } else {
          console.log("[INIT] Step 2: Fetching contests only...");
          await fetchContests().catch(e => console.error("fetchContests error:", e));
          console.log("[INIT] Step 2: Contest fetch finished.");
        }

      } catch (err) {
        console.error("[INIT] Global initialization error:", err);
      } finally {
        if (isMounted) {
          console.log("[INIT] Initialization finished, setting loading to false");
          setIsLoading(false);
        }
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      console.log("[INIT] Auth state changed:", _event);
      setSession(currentSession);
      if (currentSession) {
        await fetchUserAndWallet(currentSession.user.id, currentSession).catch(e => console.error("AuthChange fetch error:", e));
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchContests]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setWallet(null);
    setView('home');
    setGameState('ready');
    setIsMobileMenuOpen(false);
  };

  const startGame = async (mode: 'solo' | 'contest' | 'finalist') => {
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
        contest_id: mode === 'contest' || mode === 'finalist' ? selectedContest?.id : null,
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

    const points = isCorrect ? (100 + Math.floor(timeLeft * 10)) : 0;
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

  const redirectToMonCash = (amount: number, type: 'deposit' | 'contest_entry', contestId?: string) => {
    if (!user) { setView('auth'); return; }
    const params = new URLSearchParams({
      userId: user.id,
      username: user.username,
      amount: amount.toString(),
      type: type,
      description: type === 'deposit' ? 'Depo Balans QuizPam' : `Antre Konkou`,
    });
    if (contestId) params.append('contestId', contestId);
    window.location.href = `${MONCASH_GATEWAY_URL}?${params.toString()}`;
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
              <button onClick={() => setView('profile')} className="flex items-center space-x-2 md:space-x-3 group bg-slate-900/40 p-1 pr-3 md:p-1 md:pr-4 rounded-2xl border border-white/5 hover:border-blue-500/50 transition-all">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl overflow-hidden border border-slate-700">
                  <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <div className="text-right">
                  <p className="hidden xs:block text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Balans</p>
                  <p className="text-yellow-400 font-black text-xs md:text-sm">{(wallet?.total_balance || 0).toLocaleString()} <span className="text-[10px]">HTG</span></p>
                </div>
              </button>
            )}

            {session && user && (
              <div className="hidden md:flex items-center space-x-4">
                {user.is_admin && (
                  <button onClick={() => setView('admin')} className="text-[10px] font-black uppercase tracking-widest bg-slate-700 hover:bg-slate-600 px-4 py-2.5 rounded-xl transition-colors">Admin</button>
                )}
                <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 transition-colors p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>
            )}

            {!session && (
              <button onClick={() => setView('auth')} className="hidden md:block text-[10px] font-black uppercase tracking-widest bg-blue-600 px-6 py-2.5 rounded-xl shadow-lg hover:bg-blue-500 transition-all">Koneksyon</button>
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

        {view === 'auth' && <Auth onAuthComplete={() => setView('home')} />}
        {view === 'profile' && user && <ProfileView user={user} wallet={wallet} onBack={() => setView('home')} onDeposit={() => redirectToMonCash(500, 'deposit')} />}
        {view === 'contest-detail' && selectedContest && (
          <ContestDetailView contest={selectedContest} userBalance={wallet?.total_balance || 0} onBack={() => setView('home')} onJoin={() => redirectToMonCash(selectedContest.entry_fee_htg, 'contest_entry', selectedContest.id)} />
        )}
        {view === 'finalist-arena' && selectedContest && (
          <FinalistArena contestTitle={selectedContest.title} onStartFinal={() => startGame('finalist')} />
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

              {contests.map(c => (
                <div key={c.id} className="bg-slate-800 rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col group hover:scale-[1.02] transition-all shadow-2xl">
                  <div className="h-48 bg-slate-700 bg-cover bg-center flex items-end p-6" style={c.image_url ? { backgroundImage: `linear-gradient(to bottom, transparent, rgba(15, 23, 42, 0.98)), url(${c.image_url})` } : {}}>
                    <h4 className="text-xl font-black text-white truncate">{c.title}</h4>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-yellow-400 font-black">{c.entry_fee_htg} HTG</span>
                      <span className="text-green-400 font-black">Pool: {c.grand_prize} HTG</span>
                    </div>
                    <button onClick={() => { setSelectedContest(c); setView('contest-detail'); }} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-colors">Patisipe</button>
                  </div>
                </div>
              ))}
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

      <footer className="mt-auto py-10 text-center border-t border-white/5 opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">© 2025 QuizPam - Tout dwa rezève</p>
      </footer>
    </div>
  );
};

export default App;
