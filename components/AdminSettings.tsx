import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { SiteSettings } from '../types';

const AdminSettings: React.FC = () => {
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // For Carousel Images
    const carouselFileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingCarousel, setUploadingCarousel] = useState(false);

    // For Top Players Search
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchingPlayers, setIsSearchingPlayers] = useState(false);

    // For Solo Image
    const soloFileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingSolo, setUploadingSolo] = useState(false);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('site_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error && error.code !== 'PGRST116') { // not found error
                throw error;
            }

            if (data) {
                setSettings(data);
            } else {
                // Initialize default
                const defaultSettings = { id: 1, carousel_images: [], solo_game_image_url: null, updated_at: new Date().toISOString() };
                setSettings(defaultSettings);
            }
        } catch (err: any) {
            console.error("Error fetching settings:", err);
            showNotification("Erè nan chaje anviwònman yo.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const saveSettings = async (updatedSettings: Partial<SiteSettings>) => {
        setIsSaving(true);
        try {
            const newSettings = { ...settings, ...updatedSettings, updated_at: new Date().toISOString() };
            const { error } = await supabase
                .from('site_settings')
                .upsert(newSettings)

            if (error) throw error;
            setSettings(newSettings as SiteSettings);
            showNotification("Chanjman sove avèk siksè!");
        } catch (err: any) {
            console.error("Save error:", err);
            showNotification("Erè pandan anrejistreman an: " + err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const uploadImage = async (file: File, bucket: string = 'contest-images'): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `settings/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (err: any) {
            console.error("Upload error:", err);
            showNotification("Erè nan moute fichiye a: " + err.message, 'error');
            return null;
        }
    };

    const handleCarouselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingCarousel(true);

        try {
            const newUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const url = await uploadImage(files[i]);
                if (url) newUrls.push(url);
            }

            if (newUrls.length > 0 && settings) {
                const updatedImages = [...(settings.carousel_images || []), ...newUrls];
                await saveSettings({ carousel_images: updatedImages });
            }
        } finally {
            setUploadingCarousel(false);
            if (carouselFileInputRef.current) carouselFileInputRef.current.value = '';
        }
    };

    const handleSoloUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingSolo(true);

        try {
            const url = await uploadImage(file);
            if (url && settings) {
                await saveSettings({ solo_game_image_url: url });
            }
        } finally {
            setUploadingSolo(false);
            if (soloFileInputRef.current) soloFileInputRef.current.value = '';
        }
    };

    const removeCarouselImage = async (index: number) => {
        if (!settings) return;
        const newImages = [...settings.carousel_images];
        newImages.splice(index, 1);
        await saveSettings({ carousel_images: newImages });
    };

    const removeSoloImage = async () => {
        if (!settings) return;
        await saveSettings({ solo_game_image_url: null });
    };


    if (isLoading) {
        return <div className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest text-xs">Ap chaje paramèt yo...</div>;
    }

    return (
        <div className="space-y-10 relative animate-in fade-in duration-500">
            {/* Toast Notification */}
            {notification && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${notification.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-green-500/10 border-green-500 text-green-400'
                    }`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                    <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
                </div>
            )}

            <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-700 shadow-xl space-y-8">
                <h3 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                    Anviwònman Paj Akèy (Lobby)
                </h3>

                {/* Carousel Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">Bande Passante (Carousel)</h4>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">Ajoute imaj oswa GIF kap defile anlè paj Akèy la.</p>
                        </div>
                        <button
                            onClick={() => carouselFileInputRef.current?.click()}
                            disabled={uploadingCarousel || isSaving}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {uploadingCarousel ? (
                                <><div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent" /> Ap moute...</>
                            ) : (
                                <>+ Ajoute Imaj/GIF</>
                            )}
                        </button>
                        <input
                            type="file"
                            multiple
                            accept="image/*,.gif"
                            ref={carouselFileInputRef}
                            onChange={handleCarouselUpload}
                            className="hidden"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {settings?.carousel_images && settings.carousel_images.length > 0 ? (
                            settings.carousel_images.map((url, idx) => (
                                <div key={idx} className="relative group aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                                    <img src={url} alt={`Banner ${idx}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => removeCarouselImage(idx)}
                                            disabled={isSaving}
                                            className="w-10 h-10 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">
                                <p className="text-[10px] font-black uppercase tracking-widest">Pa gen okenn imaj poko.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Solo Game Section */}
                <div className="space-y-4 pt-8 border-t border-slate-800">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">Imaj Pratik Solo</h4>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">Chanje background pou bwat jwèt Solo a nan paj Akèy la.</p>
                        </div>
                        <button
                            onClick={() => soloFileInputRef.current?.click()}
                            disabled={uploadingSolo || isSaving}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {uploadingSolo ? (
                                <><div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent" /> Ap moute...</>
                            ) : (
                                <>{settings?.solo_game_image_url ? 'Chanje Imaj' : '+ Ajoute Imaj'}</>
                            )}
                        </button>
                        <input
                            type="file"
                            accept="image/*,.gif"
                            ref={soloFileInputRef}
                            onChange={handleSoloUpload}
                            className="hidden"
                        />
                    </div>

                    <div className="flex gap-4 items-start">
                        <div className="w-full md:w-1/2 aspect-[2/1] rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/40 p-4 md:p-8 flex flex-col justify-between overflow-hidden relative group">
                            {settings?.solo_game_image_url && (
                                <img src={settings.solo_game_image_url} alt="Solo Cover" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay" />
                            )}
                            <div className="relative z-10 space-y-4 pointer-events-none">
                                <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center text-3xl">🕹️</div>
                                <h3 className="text-2xl font-black text-white">Pratik Solo</h3>
                                <p className="text-slate-300 text-sm">Chaje yon pack 10 kesyon nèf epi jwe menm si w pa gen entènèt.</p>
                            </div>
                            {settings?.solo_game_image_url && (
                                <div className="absolute top-4 right-4 z-20">
                                    <button
                                        onClick={removeSoloImage}
                                        className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payment Numbers Section */}
                <div className="space-y-4 pt-8 border-t border-slate-800">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">Nimewo Pèman Manèl</h4>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">Chanje nimewo kote jwè yo ka voye kòb la (Depo/Antre).</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* MonCash Number */}
                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
                            <h5 className="text-xs font-black text-red-500 uppercase tracking-widest">MonCash (Digicel)</h5>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={settings?.moncash_number || ''}
                                    onChange={(e) => setSettings(prev => prev ? { ...prev, moncash_number: e.target.value } : null)}
                                    placeholder="Eg: 31 23 45 67"
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-red-500 transition-colors"
                                />
                                <button
                                    onClick={() => saveSettings({ moncash_number: settings?.moncash_number })}
                                    disabled={isSaving}
                                    className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black uppercase text-[10px] px-6 rounded-xl transition-colors"
                                >
                                    Sove
                                </button>
                            </div>
                        </div>

                        {/* NatCash Number */}
                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
                            <h5 className="text-xs font-black text-blue-500 uppercase tracking-widest">NatCash (Natcom)</h5>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={settings?.natcash_number || ''}
                                    onChange={(e) => setSettings(prev => prev ? { ...prev, natcash_number: e.target.value } : null)}
                                    placeholder="Eg: 41 23 45 67"
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 transition-colors"
                                />
                                <button
                                    onClick={() => saveSettings({ natcash_number: settings?.natcash_number })}
                                    disabled={isSaving}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase text-[10px] px-6 rounded-xl transition-colors"
                                >
                                    Sove
                                </button>
                            </div>
                        </div>
                        {/* WhatsApp Number */}
                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
                            <h5 className="text-xs font-black text-green-500 uppercase tracking-widest">WhatsApp Admin</h5>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={settings?.whatsapp_number || ''}
                                    onChange={(e) => setSettings(prev => prev ? { ...prev, whatsapp_number: e.target.value } : null)}
                                    placeholder="Eg: 50930000000"
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-green-500 transition-colors"
                                />
                                <button
                                    onClick={() => saveSettings({ whatsapp_number: settings?.whatsapp_number })}
                                    disabled={isSaving}
                                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black uppercase text-[10px] px-6 rounded-xl transition-colors"
                                >
                                    Sove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Players Section */}
                <div className="space-y-4 pt-8 border-t border-slate-800">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">Top Jwè yo (Semèn)</h4>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">Jere jwè ki parèt nan seksyon "Top Jwè" sou paj akèy la.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Weekly XP Reset */}
                        <div className="flex justify-between items-center bg-slate-800/50 p-4 border border-red-500/20 rounded-2xl">
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Nouvo Semèn ?</h4>
                                <p className="text-[10px] text-slate-400 mt-1">Klike isit la pou remete XP semèn nan a 0 pou tout jwè yo.</p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (confirm("Èske w sèten ou vle remete XP semèn nan a 0 pou TOUT jwè yo ? Aksyon sa a pa ka defèt.")) {
                                        try {
                                            const { error } = await supabase.from('profiles').update({ weekly_xp: 0 }).neq('id', 'dummy');
                                            if (error) throw error;
                                            showNotification("Tout jwè yo koumanse a 0 XP pou semèn nan!", 'success');
                                        } catch (err) {
                                            console.error(err);
                                            showNotification("Erè lè w t ap reset XP a.", 'error');
                                        }
                                    }
                                }}
                                className="px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                            >
                                🔄 RESET XP SEMÈN
                            </button>
                        </div>

                        {/* Search and Add */}
                        <div className="relative flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Chèche yon itilizatè pa non..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all pl-12"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const searchBtn = document.getElementById('search-players-btn');
                                            if (searchBtn) searchBtn.click();
                                        }
                                    }}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    id="search-players-btn"
                                    disabled={isSearchingPlayers || searchQuery.length < 2}
                                    onClick={async () => {
                                        if (searchQuery.length < 2) return;
                                        setIsSearchingPlayers(true);
                                        try {
                                            const { data, error } = await supabase.from('profiles').select('*').ilike('username', `%${searchQuery}%`).limit(10);
                                            if (error) throw error;
                                            setSearchResults(data || []);
                                            if (data && data.length === 0) showNotification("Pa jwenn itilizatè a.", 'error');
                                        } catch (err) {
                                            console.error("Search error:", err);
                                        } finally {
                                            setIsSearchingPlayers(false);
                                        }
                                    }}
                                    className="px-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs transition-all disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                                >
                                    {isSearchingPlayers ? (
                                        <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent" />
                                    ) : (
                                        "Chèche"
                                    )}
                                </button>

                                <button
                                    disabled={isSearchingPlayers}
                                    onClick={async () => {
                                        setIsSearchingPlayers(true);
                                        try {
                                            // Fetch players and sort locally to avoid Supabase 400 error on XP ordering
                                            const { data, error } = await supabase.from('profiles').select('*').limit(100);
                                            if (error) throw error;

                                            // Sort locally by XP 
                                            const sortedData = (data || []).sort((a, b) => (b.weekly_xp || 0) - (a.weekly_xp || 0)).slice(0, 10);

                                            setSearchResults(sortedData);
                                            if (sortedData.length === 0) showNotification("Pa jwenn jwè.", 'error');
                                        } catch (err) {
                                            console.error("Fetch top players error:", err);
                                        } finally {
                                            setIsSearchingPlayers(false);
                                        }
                                    }}
                                    className="px-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-purple-600/30 whitespace-nowrap"
                                >
                                    🏆 Jwenn Top 10 (XP Semèn)
                                </button>
                            </div>

                            {/* Results Popover (Simplified) */}
                            {searchResults && searchResults.length > 0 && (
                                <div className="absolute top-[100%] z-50 w-[calc(100%-108px)] mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {searchResults.map((u: any) => (
                                        <button
                                            key={u.id}
                                            onClick={async () => {
                                                if (!settings) return;
                                                const currentTop = settings.top_players || [];
                                                if (currentTop.find(tp => tp.id === u.id)) {
                                                    showNotification("Jwè sa a deja nan lis la!", 'error');
                                                    return;
                                                }
                                                // Auto-assign Weekly XP as the score instead of prompting
                                                const score = u.weekly_xp || 0;
                                                const finalAvatar = u.avatars_url || u.avatar_url; // Ensure flat structure

                                                const newTop = [...currentTop, { id: u.id, username: u.username, avatar_url: finalAvatar, score }];
                                                await saveSettings({ top_players: newTop });
                                                setSearchResults([]);
                                            }}
                                            className="w-full p-4 flex items-center gap-4 hover:bg-slate-700 text-left transition-colors border-b border-slate-700/50 last:border-0"
                                        >
                                            <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden bg-slate-900">
                                                <img src={u.avatars_url || u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-xs font-black text-white uppercase tracking-widest truncate">{u.username}</span>
                                                <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">{u.weekly_xp || 0} XP SEMÈN</span>
                                            </div>
                                            <span className="shrink-0 text-[10px] font-bold text-blue-400 uppercase">Klike pou'w ajoute +</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* List of current top players */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {settings?.top_players && settings.top_players.length > 0 ? (
                                settings.top_players.map((tp) => (
                                    <div key={tp.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-4 group">
                                        <div className="w-12 h-12 rounded-xl border border-blue-500/30 overflow-hidden">
                                            <img src={(tp as any).avatars_url || tp.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tp.username}`} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-white uppercase tracking-widest">{tp.username}</div>
                                            <div className="text-[10px] font-bold text-yellow-500 uppercase mt-1">⚡ {tp.score} XP</div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const newTop = settings.top_players?.filter(p => p.id !== tp.id) || [];
                                                await saveSettings({ top_players: newTop });
                                            }}
                                            className="ml-auto w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-8 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest italic">Poko gen jwè nan lis la.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
