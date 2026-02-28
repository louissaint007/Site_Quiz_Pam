import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FAQ } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface FAQProps {
    onBack: () => void;
}

const FAQView: React.FC<FAQProps> = ({ onBack }) => {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openId, setOpenId] = useState<string | null>(null);

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

    const categories = Array.from(new Set(faqs.map(f => f.category))).sort();

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="mb-8 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg active:scale-95"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Kesyon Yo Poze Souvan (FAQ)</h1>
                <div className="w-12 h-12" /> {/* Spacer */}
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 md:p-12 border border-slate-700/50 shadow-2xl space-y-8">
                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : faqs.length === 0 ? (
                    <p className="text-center text-slate-500">Poko gen kesyon nan baz done a.</p>
                ) : (
                    <div className="space-y-8">
                        {categories.map(cat => (
                            <div key={cat} className="space-y-4">
                                <h2 className="text-lg font-black text-blue-400 uppercase tracking-widest border-b border-slate-700 pb-2">{cat}</h2>
                                <div className="space-y-2">
                                    {faqs.filter(f => f.category === cat).map(faq => (
                                        <div key={faq.id} className="border border-slate-700/50 bg-slate-800/30 rounded-2xl overflow-hidden">
                                            <button
                                                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                                                className="w-full text-left p-4 flex justify-between items-center hover:bg-slate-800/50 transition-colors"
                                            >
                                                <span className="font-bold text-slate-200">{faq.question}</span>
                                                <span className={`text-blue-500 transition-transform ${openId === faq.id ? 'rotate-180' : ''}`}>▼</span>
                                            </button>
                                            <AnimatePresence>
                                                {openId === faq.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="px-4 pb-4 text-slate-400 text-sm leading-relaxed whitespace-pre-wrap"
                                                    >
                                                        {faq.answer}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FAQView;
