
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onAuthComplete: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthComplete }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
            data: { username: username.trim() }
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
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-slate-800 p-8 md:p-12 rounded-[3rem] shadow-2xl w-full max-w-md border border-slate-700 animate-in zoom-in duration-300">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black tracking-tighter text-white">
            <span className="text-red-500 italic">Quiz</span>Pam
          </h2>
          <p className="text-slate-400 mt-2 font-bold uppercase text-[10px] tracking-widest">
            {isLogin ? 'Byenvini ankò !' : 'Kreye kont ou an.'}
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

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Non Jwè</label>
              <input
                required
                type="text"
                className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl outline-none focus:ring-2 ring-blue-500 text-white font-bold transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
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
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Kòd Sekrè</label>
            <input
              required
              type="password"
              className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl outline-none focus:ring-2 ring-blue-500 text-white font-bold transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-3xl shadow-[0_6px_0_rgb(29,78,216)] transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 mt-4 uppercase tracking-widest text-xs"
          >
            {loading ? 'YAP CHACHE...' : isLogin ? 'Konekte m' : "Enskri m"}
          </button>
        </form>

        <div className="text-center mt-8">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); setSuccessMsg(null); }}
            className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            {isLogin ? "Ou pa gen kont? Kreye youn" : "Ou gen kont deja? Konekte w"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
