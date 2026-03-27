
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onAuthComplete: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthComplete }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [realName, setRealName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://quiz-pam.vercel.app/',
      });
      if (error) throw error;
      setSuccessMsg("Nou voye yon imèl ba ou pou w chanje kòd sekrè w la. Tcheke bwat lèt ou.");
    } catch (err: any) {
      setError(err.message || "Yon erè rive. Eseye ankò.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) {
          if (error.message === "Invalid login credentials") {
            throw new Error("Email oswa kòd sekrè a pa bon. Verifye si w pa fè erè nan tape yo.");
          }
          if (error.message === "Email not confirmed") {
            throw new Error("Ou poko konfime email ou. Tcheke bwat lèt ou a epi klike sou lyen an.");
          }
          throw error;
        }
        onAuthComplete();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim(),
              real_name: realName.trim()
            }
          }
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          onAuthComplete();
        } else {
          setSuccessMsg("Kont ou kreye! Tanpri tcheke email ou pou konfime l anvan w konekte.");
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      console.error("Auth process error:", err);
      setError(err.message || "Yon erè rive. Eseye ankò.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 relative overflow-hidden">

      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-64 h-64 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="bg-slate-800/80 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white/10 relative z-10 animate-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-slate-900/50 rounded-3xl mb-4 shadow-inner ring-1 ring-white/10">
            <span className="text-6xl block transform hover:scale-110 transition-transform duration-300">🎮</span>
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            <span className="text-red-500">Quiz</span>Pam
          </h2>
          <p className="text-slate-300 mt-3 font-bold uppercase text-[11px] tracking-widest bg-slate-900/50 py-1 px-3 rounded-full inline-block">
            {isRecovery ? 'Rekipere kont ou' : isLogin ? 'Byenvini ankò !' : 'Kreye kont ou an'}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold mb-6 uppercase tracking-tighter text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-xs font-bold mb-6 uppercase tracking-tighter text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={isRecovery ? handlePasswordRecovery : handleAuth} className="space-y-4">
          {!isLogin && !isRecovery && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Vre Non w konplè</label>
                <input
                  required
                  type="text"
                  placeholder="Egz: Jean Jacques"
                  className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl outline-none focus:ring-2 ring-blue-500 text-white font-bold transition-all"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Surnom / Pseudo</label>
                <input
                  required
                  type="text"
                  placeholder="Egz: TiMounFoukan_99"
                  className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl outline-none focus:ring-2 ring-blue-500 text-white font-bold transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Email</label>
            <input
              required
              type="email"
              className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl outline-none focus:ring-2 ring-blue-500 text-white font-bold transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {!isRecovery && (
            <div className="space-y-1">
              <div className="flex justify-between items-center pr-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Kòd Sekrè</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setIsRecovery(true); setError(null); setSuccessMsg(null); }}
                    className="text-[9px] font-black text-blue-400 uppercase tracking-tighter hover:text-blue-300 transition-colors"
                  >
                    Mwen bliye l?
                  </button>
                )}
              </div>
              <input
                required
                type="password"
                className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl outline-none focus:ring-2 ring-blue-500 text-white font-bold transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-bouncy btn-bouncy-primary py-4 rounded-2xl font-black uppercase tracking-widest text-lg disabled:opacity-50 disabled:transform-none disabled:box-shadow-none"
            >
              {loading ? 'YAP CHACHE...' : isRecovery ? 'VOYE LYEN AN' : isLogin ? 'KONEKTE M' : "ENSKRI M"}
            </button>
          </div>
        </form>

        <div className="text-center mt-8 space-y-2">
          {isRecovery ? (
            <button
              onClick={() => { setIsRecovery(false); setError(null); setSuccessMsg(null); }}
              className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
            >
              Retounen nan koneksyon
            </button>
          ) : (
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); setSuccessMsg(null); }}
              className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
            >
              {isLogin ? "Ou pa gen kont? Kreye youn" : "Ou gen kont deja? Konekte w"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
