import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FAQ } from '../types';

export const AdminFAQManager: React.FC = () => {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

    // Form states
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [category, setCategory] = useState('jeneral');

    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('faqs').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            setFaqs(data as FAQ[]);
        }
        setIsLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingFaq) {
                await supabase.from('faqs').update({ question, answer, category, updated_at: new Date().toISOString() }).eq('id', editingFaq.id);
            } else {
                await supabase.from('faqs').insert({ question, answer, category });
            }
            await fetchFaqs();
            resetForm();
        } catch (error) {
            console.error(error);
            alert("Erè lè lap anrejistre FAQ a.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Ou sèten ou vle efase FAQ sa a?")) return;
        try {
            await supabase.from('faqs').delete().eq('id', id);
            await fetchFaqs();
        } catch (error) {
            console.error(error);
        }
    };

    const editFaq = (f: FAQ) => {
        setEditingFaq(f);
        setQuestion(f.question);
        setAnswer(f.answer);
        setCategory(f.category || 'jeneral');
    };

    const resetForm = () => {
        setEditingFaq(null);
        setQuestion('');
        setAnswer('');
        setCategory('jeneral');
    };

    if (isLoading) return <div className="text-white text-center p-8">Chajman FAQs...</div>;

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest">Jere FAQ yo</h2>

            <form onSubmit={handleSave} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
                <h3 className="text-lg font-bold text-white mb-4">{editingFaq ? 'Modifye FAQ' : 'Ajoute yon nouvo FAQ'}</h3>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Kesyon</label>
                    <input
                        type="text"
                        required
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                        placeholder="Mete kesyon an la..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Repons</label>
                    <textarea
                        required
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none resize-none"
                        placeholder="Mete repons ou a la..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Kategori</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                    >
                        <option value="jeneral">Jeneral</option>
                        <option value="peman">Pèman & Retrè</option>
                        <option value="jwet">Jwèt & Règ</option>
                    </select>
                </div>

                <div className="flex gap-4">
                    <button disabled={isSaving} type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold transition-colors">
                        {isSaving ? 'Ap sove...' : editingFaq ? 'Modifye' : 'Ajoute'}
                    </button>
                    {editingFaq && (
                        <button type="button" onClick={resetForm} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-xl font-bold transition-colors">
                            Anile
                        </button>
                    )}
                </div>
            </form>

            <div className="space-y-4">
                {faqs.map(f => (
                    <div key={f.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between gap-4">
                        <div className="flex-1">
                            <h4 className="font-bold text-white">{f.question}</h4>
                            <p className="text-slate-400 text-sm mt-1">{f.answer}</p>
                            <span className="inline-block mt-2 text-[10px] font-black tracking-widest uppercase bg-slate-900 text-slate-500 px-2 py-1 rounded-md">{f.category}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => editFaq(f)} className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors">✏️ Mod</button>
                            <button onClick={() => handleDelete(f.id)} className="bg-red-500/10 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors">🗑️ Efa</button>
                        </div>
                    </div>
                ))}
                {faqs.length === 0 && <p className="text-slate-500 text-center text-sm py-4">Poko gen okenn FAQ ki anrejistre.</p>}
            </div>
        </div>
    );
};
