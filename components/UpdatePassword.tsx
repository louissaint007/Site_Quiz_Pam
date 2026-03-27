import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface UpdatePasswordProps {
  onComplete: () => void;
}

const UpdatePassword: React.FC<UpdatePasswordProps> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Kòd sekrè yo pa menm. Verifye w byen tape yo.");
      return;
    }
    
    if (password.length < 6) {
      setError("Kòd sekrè a dwe gen omwen 6 karaktè.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Yon erè rive. Eseye ankò.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 py-12 animate-in fade-in zoom-in duration-500">
      <div className="bg-slate-800/80 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white/10 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply blur-3xl opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-500 rounded-full mix-blend-multiply blur-3xl opacity-20 pointer-events-none"></div>

        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-900 border border-slate-700 mb-6 shadow-inner z-10 relative">
          <span className="text-4xl text-blue-400">🔑</span>
        </div>

        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 z-10 relative">Nouvo Kòd Sekrè</h2>
        <p className="text-slate-400 font-bold mb-8 text-sm z-10 relative">Antre yon nouvo kòd sekrè pou kont ou an.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 font-bold text-xs uppercase text-left z-10 relative">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-6 rounded-2xl font-black text-lg uppercase z-10 relative">
            Modpas chanje avek siksè!
            <p className="text-[10px] mt-2 text-green-500 font-bold uppercase tracking-widest">N ap voye w nan akèy la...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4 text-left z-10 relative">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Nouvo Kòd Sekrè</label>
              <input
                type="password"
                required
                className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl outline-none focus:ring-2 ring-blue-500 text-white font-bold transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Konfime Kòd Sekrè A</label>
              <input
                type="password"
                required
                className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl outline-none focus:ring-2 ring-blue-500 text-white font-bold transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 btn-bouncy btn-bouncy-primary py-4 rounded-2xl font-black uppercase tracking-widest text-lg disabled:opacity-50"
            >
              {loading ? 'AP CHANJE...' : 'RÈGJE SA'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UpdatePassword;
