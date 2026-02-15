
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Review, UserProfile } from '../types';

interface ReviewsProps {
    user: UserProfile | null;
}

const Reviews: React.FC<ReviewsProps> = ({ user }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        setIsLoading(true);
        try {
            // Joining with profiles to get username and avatar
            const { data, error } = await supabase
                .from('reviews')
                .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedReviews = data?.map((r: any) => ({
                ...r,
                username: r.profiles?.username || 'Utilisateur',
                avatar_url: r.profiles?.avatar_url
            })) || [];

            setReviews(formattedReviews);
        } catch (err: any) {
            console.error("Error fetching reviews:", err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!newReview.comment.trim()) {
            showNotification("Tanpri ekri yon kòmantè.", 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('reviews').insert({
                user_id: user.id,
                rating: newReview.rating,
                comment: newReview.comment.trim()
            });

            if (error) throw error;

            showNotification("Mèsi pou avis ou!", 'success');
            setNewReview({ rating: 5, comment: '' });
            fetchReviews();
        } catch (err: any) {
            showNotification("Erreur nan voye avis a: " + err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const renderStars = (rating: number, interactive = false) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        disabled={!interactive}
                        onClick={() => interactive && setNewReview({ ...newReview, rating: star })}
                        className={`${interactive ? 'hover:scale-125 transition-transform' : ''}`}
                    >
                        <span className={`text-xl ${star <= rating ? 'text-yellow-400' : 'text-slate-600'}`}>
                            ★
                        </span>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-12 py-12 animate-in fade-in duration-700">
            {notification && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl animate-in slide-in-from-top duration-300 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {notification.message}
                </div>
            )}

            <div className="text-center space-y-4">
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase mb-4">Avis <span className="text-red-500">Kliyan</span></h1>
                <p className="text-lg text-slate-400 max-w-md mx-auto">Sa patisipan yo ap di sou QuizPam.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Review Form */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 sticky top-24">
                        <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Bay avis pa w</h3>

                        {user ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Nòt ou</label>
                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex justify-center">
                                        {renderStars(newReview.rating, true)}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Kòmantè</label>
                                    <textarea
                                        rows={4}
                                        value={newReview.comment}
                                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                        className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-colors resize-none"
                                        placeholder="Ekri sa ou panse de QuizPam..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-[2rem] shadow-[0_6px_0_rgb(29,78,216)] active:translate-y-1 active:shadow-none uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'AP VOYE...' : 'VOYE AVIS MWEN'}
                                </button>
                            </form>
                        ) : (
                            <div className="text-center space-y-6 py-8">
                                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center text-3xl mx-auto opacity-50">🔒</div>
                                <p className="text-slate-400 text-sm font-bold">Fòk ou konekte pou ou ka bay yon avis.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reviews List */}
                <div className="lg:col-span-2 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 grayscale opacity-20">
                            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">Chaje avis yo...</p>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-20 bg-slate-800/20 rounded-[2.5rem] border-2 border-dashed border-slate-700">
                            <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Pa gen avis ankò. Se ou ki premye!</p>
                        </div>
                    ) : (
                        reviews.map((review) => (
                            <div key={review.id} className="bg-slate-800/40 p-8 rounded-[2.5rem] border border-white/5 hover:border-blue-500/20 transition-all group animate-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-700 shrink-0">
                                        <img
                                            src={review.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.username}`}
                                            alt={review.username}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <h4 className="font-black text-white uppercase tracking-wider">{review.username}</h4>
                                            <div className="flex items-center gap-3">
                                                {renderStars(review.rating)}
                                                <span className="text-[10px] font-black text-slate-600 uppercase">
                                                    {new Date(review.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-slate-300 leading-relaxed font-medium italic">
                                            "{review.comment}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reviews;
