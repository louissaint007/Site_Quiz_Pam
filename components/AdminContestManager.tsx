
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Contest, Question } from '../types';

const AdminContestManager: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [contests, setContests] = useState<Contest[]>([]);
  const [allAvailableQuestions, setAllAvailableQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contest, setContest] = useState({
    title: '',
    entry_fee_htg: 250,
    min_participants: 100,
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
    status: 'pending' as 'pending' | 'active' | 'finished',
    category_filter: '',
    image_url: ''
  });

  const fetchAllContests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContests(data || []);
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

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setIsUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `contests/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('contest-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('contest-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err: any) {
      console.error("Image upload error:", err);
      alert("Erè nan moute imaj la: " + err.message);
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
    if (!contest.title.trim()) return alert("Tit la obligatwa !");
    if (selectedQuestionIds.length === 0) return alert("Ou dwe chwazi omwen yon kesyon pou konkou sa a !");

    setIsSubmitting(true);
    try {
      // 1. Upload image first if exists
      let finalImageUrl = contest.image_url;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      const contestToInsert = {
        title: contest.title.trim(),
        entry_fee_htg: Number(contest.entry_fee_htg),
        min_participants: Number(contest.min_participants),
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
        current_participants: 0,
        questions_ids: selectedQuestionIds
      };

      const { error } = await supabase
        .from('contests')
        .insert([contestToInsert]);

      if (error) throw error;

      alert("Konkou kreye avèk siksè !");
      // Reset form
      setContest({
        title: '',
        entry_fee_htg: 250,
        min_participants: 100,
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
        image_url: ''
      });
      setSelectedQuestionIds([]);
      setImageFile(null);
      setImagePreview(null);
      fetchAllContests();
    } catch (err: any) {
      alert("Erreur: " + err.message);
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
    } catch (err: any) {
      alert("Erreur: " + err.message);
    }
  };

  const deleteContest = async (id: string) => {
    if (!confirm("Èske ou sèten ou vle efase konkou sa a nèt? Aksyon sa a pa ka anile.")) return;
    try {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContests(prev => prev.filter(c => c.id !== id));
      alert("Konkou efase ak siksè.");
    } catch (err: any) {
      alert("Erreur nan efase: " + err.message);
    }
  };

  const categories = Array.from(new Set(allAvailableQuestions.map(q => q.category))).filter(Boolean);

  return (
    <div className="space-y-10">
      <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-700 shadow-xl">
        <h3 className="text-xl font-black mb-6 uppercase tracking-widest text-white flex items-center gap-2">
          <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
          Kreye yon Konkou
        </h3>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Tit Konkou</label>
                <input required className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-blue-500 transition-all" value={contest.title} onChange={e => setContest({ ...contest, title: e.target.value })} placeholder="Ex: Gwo defi kilti ayisyèn" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Kategori Filtè (Opsyonèl)</label>
                <input className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none" value={contest.category_filter} onChange={e => setContest({ ...contest, category_filter: e.target.value })} placeholder="Ex: Istwa, Espò..." />
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
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-800 pb-3">Konfigirasyon Pri ak Frè</h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Frè (HTG)</label>
                <input type="number" step="any" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-yellow-400 font-black outline-none focus:ring-2 ring-yellow-400" value={contest.entry_fee_htg} onChange={e => setContest({ ...contest, entry_fee_htg: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Min. Jwè</label>
                <input type="number" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-black outline-none" value={contest.min_participants} onChange={e => setContest({ ...contest, min_participants: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Marge Admin (%)</label>
                <input type="number" step="any" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-blue-400 font-black outline-none" value={contest.admin_margin_percent} onChange={e => setContest({ ...contest, admin_margin_percent: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Pool pou Genyen (HTG)</label>
                <input type="number" step="any" className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-green-400 font-black outline-none" value={contest.grand_prize} onChange={e => setContest({ ...contest, grand_prize: Number(e.target.value) })} />
              </div>
            </div>

            {/* Questions Picker Section */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Seleksyon Kesyon ({selectedQuestionIds.length})</h4>
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
                <option value="active">AKTIF (Live)</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || isUploadingImage} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-[2rem] shadow-[0_6px_0_rgb(29,78,216)] active:translate-y-1 active:shadow-none uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50">
            {isSubmitting ? 'PWOSESE...' : isUploadingImage ? 'YAP MOUTE IMAJ...' : 'PUBLIYE KONKOU A'}
          </button>
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
                          <span className="text-yellow-400 font-black uppercase bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">{c.entry_fee_htg} HTG</span>
                          <span className="text-green-400 font-black uppercase bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">Pool: {c.grand_prize} HTG</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-xs font-black text-blue-400 bg-blue-400/10 px-3 py-1 rounded-lg border border-blue-400/20">
                      {c.questions_ids?.length || 0} Kesyon
                    </span>
                  </td>
                  <td className="p-6">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${c.status === 'active' ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' : c.status === 'finished' ? 'bg-slate-700 text-slate-400 border-slate-600' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                      {c.status === 'active' ? '🔴 LIVE' : c.status === 'finished' ? 'FINI' : '⏳ PENDING'}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.status === 'pending' && (
                        <button onClick={() => updateStatus(c.id, 'active')} className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                        </button>
                      )}
                      <button onClick={() => deleteContest(c.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm">
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
