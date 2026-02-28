import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GameStory } from '../types';

export const AdminStoryManager: React.FC = () => {
    const [stories, setStories] = useState<GameStory[]>([]);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Histoire');
    const [content, setContent] = useState('');
    const [targetWords, setTargetWords] = useState<string[]>([]);
    const [difficulty, setDifficulty] = useState('medium');

    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchStories();
    }, []);

    const fetchStories = async () => {
        const { data, error } = await supabase.from('game_stories').select('*').order('created_at', { ascending: false });
        if (data) setStories(data);
        if (error) console.error('Error fetching stories:', error);
    };

    const handleWordClick = (word: string) => {
        // Clean word: remove punctuation for storage
        const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim().toUpperCase();
        if (!cleanWord || cleanWord.length < 2) return;

        if (targetWords.includes(cleanWord)) {
            setTargetWords(prev => prev.filter(w => w !== cleanWord));
        } else {
            if (targetWords.length >= 10) {
                showMessage('Ou pa ka chwazi plis pase 10 mo pou kounye a.', 'error');
                return;
            }
            setTargetWords(prev => [...prev, cleanWord]);
        }
    };

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const saveStory = async () => {
        if (!title || !category || !content || targetWords.length === 0) {
            showMessage('Tanpri ranpli tout chan yo epi chwazi kèk mo.', 'error');
            return;
        }

        setIsSaving(true);
        const { error } = await supabase.from('game_stories').insert([{
            title,
            category,
            content,
            target_words: targetWords,
            difficulty
        }]);

        setIsSaving(false);

        if (error) {
            console.error(error);
            showMessage('Gen yon erè ki fèt pandan anrejistreman an.', 'error');
        } else {
            showMessage('Istwa enregistre avek siksè!', 'success');
            setTitle('');
            setContent('');
            setTargetWords([]);
            fetchStories();
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (Array.isArray(json)) {
                    setIsSaving(true);
                    const { error } = await supabase.from('game_stories').insert(json.map(item => ({
                        title: item.title,
                        category: item.category || 'Science',
                        content: item.content,
                        target_words: item.target_words || [],
                        difficulty: item.difficulty || 'medium'
                    })));

                    setIsSaving(false);
                    if (error) throw error;

                    showMessage(`${json.length} istwa ajoute masivman!`, 'success');
                    fetchStories();
                } else {
                    showMessage('Fòk fichye a genyen yon lis (Array) JSON.', 'error');
                }
            } catch (err) {
                setIsSaving(false);
                console.error('JSON parse error:', err);
                showMessage('Erè nan fichye JSON an.', 'error');
            }
        };
        reader.readAsText(file);
        // Reset input
        event.target.value = '';
    };

    const deleteStory = async (id: string) => {
        if (!confirm('Ou si ou vle efase istwa sa?')) return;
        const { error } = await supabase.from('game_stories').delete().eq('id', id);
        if (!error) {
            setStories(prev => prev.filter(s => s.id !== id));
            showMessage('Istwa a efase!', 'success');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <span className="text-3xl">📖</span> Jere Istwa (Mo Kwaze)
                </h2>
                <label className="bg-slate-700 hover:bg-slate-600 cursor-pointer text-white px-4 py-2 rounded-xl font-bold text-xs uppercase transition">
                    📂 Ajoute JSON an mas
                    <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
            </div>

            {message && (
                <div className={`p-4 rounded-xl font-bold text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {message.text}
                </div>
            )}

            {/* Formulaire */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-white/10 space-y-4 shadow-xl">
                <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Nouvo Istwa</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Tit Istwa a</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none" placeholder="Eg: Dekouvèt Elektrisite" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Kategori</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none">
                            <option value="Histoire">Histoire (Istwa)</option>
                            <option value="Science">Science (Syans)</option>
                            <option value="Technologie">Technologie (Teknoloji)</option>
                            <option value="Biologie">Biologie (Biyoloji)</option>
                            <option value="Culture">Culture (Kilti)</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase flex justify-between">
                        <span>Tèks Istwa a</span>
                        <span className="text-blue-400">Klike sou mo yo anba a pou ajoute yo kòm "Target Words"</span>
                    </label>
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={5}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:border-blue-500 outline-none resize-none"
                        placeholder="Ekri istwa a la... Apre sa, klike sou mo yo nan zòn ki anba a."
                    />
                </div>

                {/* Interactive Word Selector */}
                {content && (
                    <div className="mt-4 bg-slate-900/50 p-4 rounded-xl border border-white/5 relative min-h-[100px]">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 absolute -top-2 bg-slate-800 px-2 rounded-lg">Selektè Mo Entèaktif ({targetWords.length}/10)</h4>
                        <div className="flex flex-wrap gap-1 leading-loose text-lg mt-4">
                            {content.split(/\s+/).map((word, index) => {
                                const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toUpperCase();
                                const isSelected = targetWords.includes(cleanWord) && cleanWord.length >= 2;
                                return (
                                    <span
                                        key={index}
                                        onClick={() => handleWordClick(word)}
                                        className={`cursor-pointer px-1 rounded transition-colors duration-200 select-none ${isSelected ? 'bg-green-500 text-white font-black shadow-[0_0_10px_rgba(34,197,94,0.5)] scale-110 mx-1' : 'text-slate-300 hover:bg-slate-700'}`}
                                    >
                                        {word}
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                )}

                <button
                    onClick={saveStory}
                    disabled={isSaving}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-xl uppercase tracking-widest shadow-lg hover:shadow-blue-500/50 transition-all mt-4"
                >
                    {isSaving ? 'Ap Anrejistre...' : '💾 Save Istwa a'}
                </button>
            </div>

            {/* List / Preview */}
            <div className="space-y-4">
                <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Istwa ki Enregistre ({stories.length})</h3>
                <div className="grid grid-cols-1 gap-4">
                    {stories.map(story => (
                        <div key={story.id} className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex gap-4 items-start">
                            <div className="text-3xl mt-1">
                                {story.category === 'Technologie' ? '⚡' : story.category === 'Biologie' ? '🌿' : story.category === 'Science' ? '🧪' : '📚'}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-black text-white text-lg">{story.title}</h4>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-700 px-2 py-1 rounded-lg">{story.category}</span>
                                </div>
                                <p className="text-slate-400 text-sm mt-2 line-clamp-2">{story.content}</p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {story.target_words.map(w => (
                                        <span key={w} className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded font-bold">{w}</span>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => deleteStory(story.id)}
                                className="text-slate-500 hover:text-red-500 p-2 transition-colors"
                                title="Efase Istwa a"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                    {stories.length === 0 && <p className="text-slate-500 text-center py-8">Poko gen istwa ki save nan bazdone a.</p>}
                </div>
            </div>
        </div>
    );
};
