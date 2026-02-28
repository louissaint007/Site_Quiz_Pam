import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface ContactUsProps {
    user: UserProfile | null;
    onBack: () => void;
}

const ContactUs: React.FC<ContactUsProps> = ({ user, onBack }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError("Ou dwe konekte pou w ka voye yon mesaj.");
            return;
        }

        setIsSending(true);
        setError(null);
        try {
            const { error: sendError } = await supabase.from('contact_messages').insert({
                user_id: user.id,
                subject,
                message
            });

            if (sendError) throw sendError;

            setSuccess(true);
            setSubject('');
            setMessage('');
        } catch (err: any) {
            setError(err.message || 'Gen yon erè ki fèt lè n ap voye mesaj la.');
        } finally {
            setIsSending(false);
            setTimeout(() => setSuccess(false), 5000);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="mb-8 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg active:scale-95"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Kontakte Nou</h1>
                <div className="w-12 h-12" />
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 md:p-12 border border-slate-700/50 shadow-2xl space-y-8">
                <div className="text-center space-y-4 mb-8">
                    <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-4xl mx-auto">🎧</div>
                    <p className="text-slate-300">Si w gen yon pwoblèm ak yon peman, yon retrè, oswa ou wè yon pinèz (bug) nan jwèt la, ekri nou detay la anba a. L'ap ale dirèkteman nan bwat sipò administratè yo.</p>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl font-bold uppercase text-xs tracking-widest text-center">{error}</div>}
                {success && <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-xl font-bold uppercase text-xs tracking-widest text-center">Mesaj ou an voye ak siksè! Nou pral reponn ou talè.</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sijè Pwoblèm lan</label>
                        <select
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white focus:border-blue-500 outline-none font-bold"
                        >
                            <option value="" disabled>Chwazi yon sijè...</option>
                            <option value="Pwoblèm Peman (Depo)">Pwoblèm Peman (Depo)</option>
                            <option value="Pwoblèm Retrè">Pwoblèm Retrè kòb</option>
                            <option value="Ensèk (Bug) nan Jwèt">Ensèk (Bug) nan Jwèt la</option>
                            <option value="Lòt Sijè">Lòt Bagay</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Montre Nou Sa K'ap Pase A (Mesaj)</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            rows={6}
                            placeholder="Bay maksimòm detay posib..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white focus:border-blue-500 outline-none resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSending || !user}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-[0_4px_0_theme(colors.blue.800)] active:shadow-none active:translate-y-1 transition-all"
                    >
                        {isSending ? 'Ap Voye...' : 'Voye Mesaj La'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ContactUs;
