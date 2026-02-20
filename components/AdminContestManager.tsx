
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Contest, Question, UserProfile } from '../types';
import { getPrestigeStyle } from '../utils/xp';

const AdminContestManager: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [contests, setContests] = useState<Contest[]>([]);
  const [allAvailableQuestions, setAllAvailableQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // States pou kònfimasyon ak mesaj
  const [contestToDelete, setContestToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingContestId, setEditingContestId] = useState<string | null>(null);
  const [viewingParticipantsContestId, setViewingParticipantsContestId] = useState<string | null>(null);
  const [participantStats, setParticipantStats] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [contest, setContest] = useState({
    title: '',
    entry_fee: 250,
    min_participants: 100,
    max_participants: 5000,
    admin_margin_percent: 50,
    grand_prize: 0,
    first_prize_percent: 20,
    second_prize_percent: 8,
    third_prize_percent: 2,
    fourth_prize_percent: 1,
    fifth_prize_percent: 1,
    sixth_prize_percent: 0.5,
    seventh_prize_percent: 0.5,
    eighth_prize_percent: 0.5,
    ninth_prize_percent: 0.5,
    tenth_prize_percent: 0.5,
    status: 'pending' as 'pending' | 'active' | 'finished' | 'scheduled',
    category_filter: '',
    image_url: '',
    scheduled_at: '',
    ends_at: '',
    question_count: 10,
    // CHANGEMENT ICI : 'object' devient 'physical' pour matcher le SQL
    prize_type: 'cash' as 'cash' | 'physical' | '3d',
    prize_image_url: '',
    prize_description: '',
    // CHANGEMENT ICI : 'gif' n'est souvent pas géré séparément, 
    // on reste sur les standards du schema
    media_type: 'image' as 'image' | 'video' | 'gif' | '3d'
  });


  const [prizeImageFile, setPrizeImageFile] = useState<File | null>(null);
  const [prizeImagePreview, setPrizeImagePreview] = useState<string | null>(null);
  const prizeFileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAllContests = useCallback(async () => {
    try {
      const { data: contestsData, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: participantsData } = await supabase.from('contest_participants').select('contest_id');
      const countsMap: Record<string, number> = {};
      if (participantsData) {
        participantsData.forEach((p: any) => {
          countsMap[p.contest_id] = (countsMap[p.contest_id] || 0) + 1;
        });
      }

      const enrichedContests = (contestsData || []).map(c => ({
        ...c,
        current_participants: countsMap[c.id] || 0
      }));

      setContests(enrichedContests);
    } catch (err: any) {
      console.error("Fetch contests error (admin):", err);
    }
  }, []);

  const fetchAvailableQuestions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('is_for_contest', true);

      if (error) throw error;
      setAllAvailableQuestions(data || []);
    } catch (err: any) {
      console.error("Fetch questions error (admin):", err);
    }
  }, []);

  useEffect(() => {
    fetchAllContests();
    fetchAvailableQuestions();
  }, [fetchAllContests, fetchAvailableQuestions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File, bucket: string = 'contest-images'): Promise<string | null> => {
    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

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
    } finally {
      setIsUploadingImage(false);
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds(prev =>
      prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
    );
  };

  const filteredQuestions = allAvailableQuestions.filter(q => {
    const qText = q.question_text || "";
    const matchesSearch = qText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.options.some(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === '' || q.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contest.title.trim()) return showNotification("Tit la obligatwa !", 'error');

    const requiredQuestions = Number(contest.question_count || 10);
    if (selectedQuestionIds.length <= requiredQuestions) {
      return showNotification(`Ou dwe chwazi plis pase ${requiredQuestions} kesyon nan lis la pou sistèm nan ka chwazi aza! (Ou chwazi ${selectedQuestionIds.length} sèlman)`, 'error');
    }

    setIsSubmitting(true);
    try {
      // 1. Upload header image/video if exists
      let finalImageUrl = contest.image_url;
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile, 'contest-images');
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      // 2. Upload prize image if exists
      let finalPrizeImageUrl = contest.prize_image_url;
      if (prizeImageFile) {
        const uploadedUrl = await uploadImage(prizeImageFile, 'prize-images');
        if (uploadedUrl) finalPrizeImageUrl = uploadedUrl;
      }

      const contestData = {
        title: contest.title.trim(),
        entry_fee: Number(contest.entry_fee),
        min_participants: Number(contest.min_participants),
        max_participants: Number(contest.max_participants),
        admin_margin_percent: Number(contest.admin_margin_percent),
        grand_prize: Number(contest.grand_prize),
        first_prize_percent: Number(contest.first_prize_percent),
        second_prize_percent: Number(contest.second_prize_percent),
        third_prize_percent: Number(contest.third_prize_percent),
        fourth_prize_percent: Number(contest.fourth_prize_percent),
        fifth_prize_percent: Number(contest.fifth_prize_percent),
        sixth_prize_percent: Number(contest.sixth_prize_percent),
        seventh_prize_percent: Number(contest.seventh_prize_percent),
        eighth_prize_percent: Number(contest.eighth_prize_percent),
        ninth_prize_percent: Number(contest.ninth_prize_percent),
        tenth_prize_percent: Number(contest.tenth_prize_percent),
        status: contest.status,
        category_filter: contest.category_filter.trim() || null,
        image_url: finalImageUrl || null,
        questions_ids: selectedQuestionIds,
        scheduled_at: contest.scheduled_at || null,
        ends_at: contest.ends_at || null,
        question_count: Number(contest.question_count),
        prize_type: contest.prize_type,
        prize_image_url: finalPrizeImageUrl || null,
        prize_description: contest.prize_description,
        media_type: contest.media_type
      };

      if (editingContestId) {
        const { error } = await supabase
          .from('contests')
          .update(contestData)
          .eq('id', editingContestId);
        if (error) throw error;
        showNotification("Konkou mizajou avèk siksè !");
      } else {
        const { error } = await supabase
          .from('contests')
          .insert([{ ...contestData, current_participants: 0 }]);
        if (error) throw error;
        showNotification("Konkou kreye avèk siksè !");
      }

      // Reset form
      setEditingContestId(null);
      setContest({
        title: '',
        entry_fee: 250,
        min_participants: 100,
        max_participants: 5000,
        admin_margin_percent: 50,
        grand_prize: 0,
        first_prize_percent: 20,
        second_prize_percent: 8,
        third_prize_percent: 2,
        fourth_prize_percent: 1,
        fifth_prize_percent: 1,
        sixth_prize_percent: 0.5,
        seventh_prize_percent: 0.5,
        eighth_prize_percent: 0.5,
        ninth_prize_percent: 0.5,
        tenth_prize_percent: 0.5,
        status: 'pending',
        category_filter: '',
        image_url: '',
        scheduled_at: '',
        ends_at: '',
        question_count: 10
      });
      setSelectedQuestionIds([]);
      setImageFile(null);
      setImagePreview(null);
      fetchAllContests();
    } catch (err: any) {
      showNotification("Erreur: " + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('contests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      fetchAllContests();
      showNotification(`Statut mizajou: ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      showNotification("Erreur: " + err.message, 'error');
    }
  };

  const executeDelete = async () => {
    if (!contestToDelete) return;
    try {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', contestToDelete);

      if (error) throw error;

      setContests(prev => prev.filter(c => c.id !== contestToDelete));
      showNotification("Konkou efase ak siksè.");
    } catch (err: any) {
      showNotification("Erreur nan efase: " + err.message, 'error');
    } finally {
      setContestToDelete(null);
    }
  };

  const loadForEdit = (c: Contest) => {
    setEditingContestId(c.id);
    setContest({
      title: c.title,
      entry_fee: c.entry_fee || c.entry_fee_htg || 250,
      min_participants: c.min_participants || 100,
      max_participants: c.max_participants || 5000,
      admin_margin_percent: c.admin_margin_percent || 50,
      grand_prize: c.grand_prize || 0,
      first_prize_percent: c.first_prize_percent || 20,
      second_prize_percent: c.second_prize_percent || 8,
      third_prize_percent: c.third_prize_percent || 2,
      fourth_prize_percent: c.fourth_prize_percent || 1,
      fifth_prize_percent: c.fifth_prize_percent || 1,
      sixth_prize_percent: c.sixth_prize_percent || 0.5,
      seventh_prize_percent: c.seventh_prize_percent || 0.5,
      eighth_prize_percent: c.eighth_prize_percent || 0.5,
      ninth_prize_percent: c.ninth_prize_percent || 0.5,
      tenth_prize_percent: c.tenth_prize_percent || 0.5,
      status: c.status as any,
      category_filter: c.category_filter || '',
      image_url: c.image_url || '',
      scheduled_at: c.scheduled_at ? new Date(c.scheduled_at).toISOString().slice(0, 16) : '',
      ends_at: c.ends_at ? new Date(c.ends_at).toISOString().slice(0, 16) : '',
      question_count: c.question_count || 10,
      prize_type: c.prize_type || 'cash',
      prize_image_url: c.prize_image_url || '',
      prize_description: c.prize_description || '',
      media_type: c.media_type || 'image' as any
    });
    setSelectedQuestionIds(c.questions_ids || []);
    setImagePreview(c.image_url || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchParticipantStats = async (contestId: string) => {
    setIsLoadingStats(true);
    setViewingParticipantsContestId(contestId);
    try {
      const { data, error } = await supabase
        .from('contest_participants')
        .select(`
          user_id,
          score,
          completed_at,
          joined_at,
          profiles:user_id ( username, real_name, avatars_url, level, honorary_title )
        `)
        .eq('contest_id', contestId)
        .order('score', { ascending: false });

      if (error) throw error;
      setParticipantStats(data || []);
    } catch (err: any) {
      showNotification("Erè nan chaje statistik: " + err.message, 'error');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const categories = Array.from(new Set(allAvailableQuestions.map(q => q.category))).filter(Boolean);

  return (
    <div className="space-y-10 relative">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${notification.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-green-500/10 border-green-500 text-green-400'
          }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}></div>
          <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {contestToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-black text-white text-center mb-2 uppercase tracking-tight">Èske ou sèten?</h3>
            <p className="text-slate-400 text-center text-xs font-bold leading-relaxed mb-8">Aksyon sa a pral efase konkou a nèt nan baz de done a. Ou p ap ka anile sa.</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={executeDelete}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg shadow-red-600/20 active:translate-y-1 transition-all"
              >
                EFÈKTIYÈ EFASMAN
              </button>
              <button
                onClick={() => setContestToDelete(null)}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all"
              >
                ANNULE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Stats Modal */}
      {viewingParticipantsContestId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] flex flex-col shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Patisipan & Rezilta</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                  {contests.find(c => c.id === viewingParticipantsContestId)?.title}
                </p>
              </div>
              <button onClick={() => setViewingParticipantsContestId(null)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {isLoadingStats ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chajman...</p>
                </div>
              ) : participantStats.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-800/50 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                        <tr>
                          <th className="p-4 rounded-l-xl w-16 text-center">Klasman</th>
                          <th className="p-4">Jwè</th>
                          <th className="p-4">Nòt (Pwen)</th>
                          <th className="p-4">Tan</th>
                          <th className="p-4">Statut</th>
                          <th className="p-4 rounded-r-xl">Dat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {participantStats.map((p, idx) => (
                          <tr key={p.user_id || idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 text-center">
                              <span className="text-lg font-black text-yellow-500">#{idx + 1}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg overflow-hidden bg-slate-900 avatar-frame ${getPrestigeStyle((p.profiles as any)?.level || 1).frameClass}`}>
                                  <img src={(p.profiles as any)?.avatars_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${(p.profiles as any)?.username}`} className="w-full h-full object-cover rounded-[6px]" />
                                </div>
                                <div className="flex flex-col">
                                  <span className={`font-bold text-xs ${getPrestigeStyle((p.profiles as any)?.level || 1).textClass}`}>
                                    {(p.profiles as any)?.username} {getPrestigeStyle((p.profiles as any)?.level || 1).icon}
                                  </span>
                                  <span className="text-[9px] text-slate-400 capitalize">
                                    {(p.profiles as any)?.real_name || 'Anonyme'}
                                  </span>
                                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mt-0.5">
                                    {(p.profiles as any)?.honorary_title || 'Novice'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-blue-400 font-black text-sm">{p.score || 0}</span>
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-400">
                              --
                            </td>
                            <td className="p-4">
                              <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${p.completed_at ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {p.completed_at ? 'KONPLÈ' : 'ENSKRI'}
                              </span>
                            </td>
                            <td className="p-4 text-[9px] font-bold text-slate-600">
                              {new Date(p.joined_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                  <div className="text-4xl mb-4">👥</div>
                  <p className="text-xs font-bold uppercase tracking-widest">Pa gen moun ki kòmanse konkou sa a ankò.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-700 shadow-xl">
        <h3 className="text-xl font-black mb-6 uppercase tracking-widest text-white flex items-center gap-2">
          <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
          {editingContestId ? 'Modifye Konkou' : 'Kreye yon Konkou'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Tit Konkou</label>
                <input required className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-blue-500 transition-all" value={contest.title || ''} onChange={e => setContest({ ...contest, title: e.target.value })} placeholder="Ex: Gwo defi kilti ayisyèn" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Kategori Filtè (Opsyonèl)</label>
                  <input className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none" value={contest.category_filter || ''} onChange={e => setContest({ ...contest, category_filter: e.target.value })} placeholder="Ex: Istwa..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Dat ak Lè Konkou (Kòmansman)</label>
                  <input type="datetime-local" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-blue-500" value={contest.scheduled_at || ''} onChange={e => setContest({ ...contest, scheduled_at: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Dat ak Lè Konkou (Fini)</label>
                  <input type="datetime-local" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-blue-500" value={contest.ends_at || ''} onChange={e => setContest({ ...contest, ends_at: e.target.value })} />
                </div>
              </div>
            </div>

            {/* IMAGE UPLOAD SECTION */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Imaj Konkou (Upload)</label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative h-[164px] border-2 border-dashed rounded-[2rem] transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${imagePreview ? 'border-blue-500 bg-slate-900' : 'border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60'
                  }`}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-50" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/40">
                      <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span className="text-[10px] font-black uppercase tracking-widest">Chanje Imaj</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6">
                    <div className="w-12 h-12 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Chwazi Imaj</p>
                    <p className="text-[9px] text-slate-600 font-medium">JPG, PNG oswa WEBP (Max 2MB)</p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {contest.media_type === 'video' && (
                <div className="space-y-2 mt-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Lyen Videyo (YouTube / MP4)</label>
                  <input
                    className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none"
                    value={contest.image_url || ''}
                    onChange={e => setContest({ ...contest, image_url: e.target.value })}
                    placeholder="https://app.com/video.mp4"
                  />
                  {contest.image_url && (
                    <div className="mt-2 aspect-video bg-black rounded-xl overflow-hidden">
                      <video src={contest.image_url} controls className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-800 pb-3">Konfigirasyon Pri ak Frè</h4>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Frè (HTG)</label>
                <input type="number" step="any" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-yellow-400 font-black outline-none focus:ring-2 ring-yellow-400" value={contest.entry_fee} onChange={e => setContest({ ...contest, entry_fee: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Min. Jwè</label>
                <input type="number" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-black outline-none" value={contest.min_participants} onChange={e => setContest({ ...contest, min_participants: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Max. Jwè</label>
                <input type="number" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-black outline-none" value={contest.max_participants} onChange={e => setContest({ ...contest, max_participants: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Nb Kesyon</label>
                <input type="number" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-black outline-none" value={contest.question_count} onChange={e => setContest({ ...contest, question_count: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Pool (HTG)</label>
                <input type="number" step="any" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-green-400 font-black outline-none" value={contest.grand_prize} onChange={e => setContest({ ...contest, grand_prize: Number(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-slate-800">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-800 pb-3">Anbalaj ak Medya</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Tip Medya Header</label>
                  <div className="flex gap-4">
                    {['image', 'gif'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setContest({ ...contest, media_type: type as any })}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${contest.media_type === type ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Tip Grand Prix</label>
                  <div className="flex gap-4">
                    {['cash', 'object', '3d'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setContest({ ...contest, prize_type: type as any })}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${contest.prize_type === type ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
                      >
                        {type === 'cash' ? 'Lajan' : type === 'object' ? 'Objè' : '3D'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-800">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">
                    {contest.prize_type === '3d' ? 'Lyen Modèl 3D (.glb / .gltf)' : 'Imaj/GIF Pri a (URL oswa Drag & Drop)'}
                  </label>
                  <input
                    className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none"
                    value={contest.prize_image_url || ''}
                    onChange={e => {
                      const url = e.target.value;
                      const isGif = url.toLowerCase().endsWith('.gif');
                      setContest({
                        ...contest,
                        prize_image_url: url,
                        media_type: contest.prize_type === '3d' ? '3d' : (isGif ? 'gif' : 'image')
                      });
                    }}
                    placeholder={contest.prize_type === '3d' ? "https://...model.glb" : "https://... (oubyen moute l anba a)"}
                  />

                  {contest.prize_type !== '3d' ? (
                    <div
                      onClick={() => prizeFileInputRef.current?.click()}
                      className="h-32 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-all overflow-hidden relative"
                    >
                      {prizeImagePreview || contest.prize_image_url ? (
                        <img src={prizeImagePreview || contest.prize_image_url} className="w-full h-full object-contain opacity-50" />
                      ) : (
                        <span className="text-[10px] font-black text-slate-500 uppercase text-center px-4">Klike pou moute imaj oswa GIF pri a</span>
                      )}
                      <input
                        type="file"
                        ref={prizeFileInputRef}
                        className="hidden"
                        accept="image/*,.gif"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPrizeImageFile(file);
                            const isGif = file.type === 'image/gif';
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setPrizeImagePreview(reader.result as string);
                              setContest({ ...contest, media_type: isGif ? 'gif' : 'image' });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-700">
                      {contest.prize_image_url ? (
                        <div className="text-center">
                          <span className="text-4xl">🧊</span>
                          <p className="text-[10px] text-green-400 font-bold mt-2">Modèl 3D Aktif</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 font-bold">Mete lyen modèl 3D a anwo a</p>
                      )}
                    </div>
                  )}

                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Deskripsyon Pri a (Non li)</label>
                  <textarea
                    rows={4}
                    className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none resize-none"
                    value={contest.prize_description || ''}
                    onChange={e => setContest({ ...contest, prize_description: e.target.value })}
                    placeholder="Ex: iPhone 15 Pro Max 256GB..."
                  />
                </div>
              </div>
            </div>

            {/* Questions Picker Section */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-l-4 border-blue-500 pl-3 flex items-center gap-2">
                  Seleksyon Kesyon
                  <span className={`px-2 py-0.5 rounded-full ${selectedQuestionIds.length > Number(contest.question_count || 10) ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {selectedQuestionIds.length} chwazi (Min kesyon: {(Number(contest.question_count) || 10) + 1})
                  </span>
                </h4>
                <div className="flex gap-2 w-full md:w-auto">
                  <select
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-[10px] font-bold outline-none"
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                  >
                    <option value="">Tout Kategori</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="Chèche mo kle..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-[10px] font-bold outline-none"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-2 bg-slate-950/30 rounded-2xl border border-slate-800">
                {filteredQuestions.length > 0 ? filteredQuestions.map(q => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestionSelection(q.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center group ${isSelected ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'
                        }`}
                    >
                      <div className="flex-1 pr-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{q.category}</p>
                        <p className="text-xs font-bold text-white line-clamp-2 leading-snug">{q.question_text}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${isSelected ? 'bg-blue-500 border-blue-400 scale-110' : 'border-slate-600 group-hover:border-slate-400'
                        }`}>
                        {isSelected && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="col-span-full py-10 text-center text-slate-600 italic text-xs">Pa gen kesyon ki koresponn ak rechèch ou a...</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Distribisyon nan Pool la (%)</label>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: '1e', key: 'first_prize_percent' },
                  { label: '2e', key: 'second_prize_percent' },
                  { label: '3e', key: 'third_prize_percent' },
                  { label: '4e', key: 'fourth_prize_percent' },
                  { label: '5e', key: 'fifth_prize_percent' },
                  { label: '6e', key: 'sixth_prize_percent' },
                  { label: '7e', key: 'seventh_prize_percent' },
                  { label: '8e', key: 'eighth_prize_percent' },
                  { label: '9e', key: 'ninth_prize_percent' },
                  { label: '10e', key: 'tenth_prize_percent' },
                ].map((p) => (
                  <div key={p.key} className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2">{p.label}</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold outline-none focus:ring-2 ring-blue-500"
                      value={(contest as any)[p.key]}
                      onChange={e => setContest({ ...contest, [p.key]: Number(e.target.value) })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Statut Inisyal</label>
              <select className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none" value={contest.status} onChange={e => setContest({ ...contest, status: e.target.value as any })}>
                <option value="pending">AP TANN (Pending)</option>
                <option value="scheduled">PWOGRAME (Scheduled)</option>
                <option value="active">AKTIF (Live)</option>
              </select>
            </div>
          </div>

          <div className="p-6 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Marge Admin (%)</label>
              <input type="number" step="any" className="w-32 p-3 bg-slate-800 border border-slate-700 rounded-xl text-blue-400 font-black outline-none" value={contest.admin_margin_percent} onChange={e => setContest({ ...contest, admin_margin_percent: Number(e.target.value) })} />
            </div>
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={isSubmitting || isUploadingImage} className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-[2rem] shadow-[0_6px_0_rgb(29,78,216)] active:translate-y-1 active:shadow-none uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              {isSubmitting ? 'PWOSESE...' : editingContestId ? 'MIZAJOU KONKOU' : 'PUBLIYE KONKOU A'}
            </button>
            {editingContestId && (
              <button
                type="button"
                onClick={() => {
                  setEditingContestId(null);
                  setContest({
                    title: '', entry_fee: 250, min_participants: 100, max_participants: 5000, admin_margin_percent: 50, grand_prize: 0,
                    first_prize_percent: 20, second_prize_percent: 8, third_prize_percent: 2, fourth_prize_percent: 1, fifth_prize_percent: 1,
                    sixth_prize_percent: 0.5, seventh_prize_percent: 0.5, eighth_prize_percent: 0.5, ninth_prize_percent: 0.5, tenth_prize_percent: 0.5,
                    status: 'pending', category_filter: '', image_url: '', scheduled_at: '', ends_at: '', question_count: 10
                  });
                  setSelectedQuestionIds([]);
                  setImagePreview(null);
                }}
                className="px-10 py-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-[2rem] uppercase tracking-widest text-xs transition-all"
              >
                ANNILE
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-700 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800/80 text-[10px] font-black uppercase text-slate-500 tracking-widest">
              <tr>
                <th className="p-6">Konkou & Pri</th>
                <th className="p-6">Kesyon</th>
                <th className="p-6">Statut</th>
                <th className="p-6 text-right">Aksyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {contests.map(c => (
                <tr key={c.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden">
                        {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🏆</div>}
                      </div>
                      <div>
                        <div className="font-black text-white text-lg leading-tight">{c.title}</div>
                        <div className="flex gap-2 mt-1 text-[10px]">
                          <span className="text-yellow-400 font-black uppercase bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">{c.entry_fee} HTG</span>
                          <span className="text-green-400 font-black uppercase bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">Pool: {c.grand_prize} HTG</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-blue-400 bg-blue-400/10 px-3 py-1 rounded-lg border border-blue-400/20 w-fit">
                        {c.questions_ids?.length || 0} Kesyon
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 mt-2">
                        👥 {c.current_participants || 0} / {c.max_participants || '∞'} Jwè
                      </span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border w-fit ${c.status === 'active' ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' : c.status === 'finished' ? 'bg-slate-700 text-slate-400 border-slate-600' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                        {c.status === 'active' ? '🔴 LIVE' : c.status === 'finished' ? 'FINI' : c.status === 'scheduled' ? '📅 PWOGRAME' : '⏳ PENDING'}
                      </span>
                      {c.scheduled_at && <span className="text-[8px] font-bold text-slate-600 uppercase">📅 {new Date(c.scheduled_at).toLocaleDateString()}</span>}
                      {c.ends_at && <span className="text-[8px] font-bold text-red-500/70 uppercase">🏁 {new Date(c.ends_at).toLocaleDateString()}</span>}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => fetchParticipantStats(c.id)} className="p-2 bg-slate-700/50 text-slate-400 hover:bg-blue-600/20 hover:text-blue-400 rounded-lg transition-all shadow-sm" title="Statistik Jwè">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      </button>
                      <button onClick={() => loadForEdit(c)} className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {(c.status === 'pending' || c.status === 'scheduled') && (
                        <button onClick={() => updateStatus(c.id, 'active')} className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                        </button>
                      )}
                      <button onClick={() => setContestToDelete(c.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminContestManager;
