
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AdminQuestionManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import' | 'manage'>('manual');
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const [manualQuestion, setManualQuestion] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_index: 0,
    category: '',
    difficulty: 1, // Using integer as per DB schema
    is_for_contest: true,
    is_for_solo: true
  });

  const jsonTemplate = `[
  {
    "question_text": "Qui a découvert la gravité ?",
    "options": ["Einstein", "Newton", "Galilée", "Darwin"],
    "correct_index": 1,
    "category": "Science",
    "difficulty": 1,
    "is_for_contest": false,
    "is_for_solo": true
  }
]`;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const dataToInsert = {
        question_text: manualQuestion.question_text,
        options: manualQuestion.options,
        correct_index: manualQuestion.correct_index,
        category: manualQuestion.category,
        difficulty: manualQuestion.difficulty,
        difficulty_level: manualQuestion.difficulty,
        is_for_contest: manualQuestion.is_for_contest,
        is_for_solo: manualQuestion.is_for_solo
      };

      const { error } = await supabase.from('questions').insert([dataToInsert]);

      if (error) throw error;

      alert("Question ajoutée avec succès sur Supabase !");
      setManualQuestion({
        question_text: '',
        options: ['', '', '', ''],
        correct_index: 0,
        category: '',
        difficulty: 1,
        is_for_contest: true,
        is_for_solo: true
      });
    } catch (err: any) {
      alert(`Erreur d'insertion : ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const json = JSON.parse(jsonContent);

        if (!Array.isArray(json)) throw new Error("Le JSON doit être une liste d'objets.");

        const formattedData = json.map(q => {
          const diffValue = typeof q.difficulty === 'number' ? q.difficulty : (parseInt(q.difficulty_level) || 1);
          return {
            question_text: q.question_text || "",
            options: Array.isArray(q.options) ? q.options : [],
            correct_index: typeof q.correct_index === 'number' ? q.correct_index : 0,
            category: q.category || "Général",
            difficulty: diffValue,
            difficulty_level: diffValue,
            is_for_contest: q.is_for_contest ?? false,
            is_for_solo: q.is_for_solo ?? true
          };
        });

        const { error } = await supabase.from('questions').insert(formattedData);
        if (error) throw error;

        alert(`${formattedData.length} questions importées avec succès sur Supabase !`);
      } catch (err: any) {
        console.error("Import Error Details:", err);
        alert(`Erreur lors de l'importation : ${err.message}`);
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (activeTab === 'manage') {
      fetchQuestions();
    }
  }, [activeTab]);

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase.from('questions').select('*');
      if (error) {
        alert("Erreur de récupération des questions: " + error.message);
        throw error;
      }
      // Since there's no created_at, let's just reverse the array so newest might be first if uuid is somewhat sequential
      setQuestions((data || []).reverse());
    } catch (err: any) {
      console.error("Error fetching questions:", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleDeleteQuestion = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Voulez-vous vraiment supprimer cette question ?")) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      setQuestions(questions.filter(q => q.id !== id));
      alert("Question supprimée !");
    } catch (err: any) {
      console.error("Error deleting question:", err);
      alert(`Erreur: ${err.message}`);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question_text?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter ? q.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = Array.from(new Set(questions.map(q => q.category).filter(Boolean)));

  const handleEditClick = (q: any) => {
    setEditingQuestionId(q.id);
    setEditForm({
      question_text: q.question_text || '',
      options: Array.isArray(q.options) ? [...q.options] : ['', '', '', ''],
      correct_index: q.correct_index ?? 0,
      category: q.category || '',
      difficulty: q.difficulty ?? 1,
      is_for_contest: q.is_for_contest ?? false,
      is_for_solo: q.is_for_solo ?? true
    });
  };

  const cancelEdit = () => {
    setEditingQuestionId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editingQuestionId || !editForm) return;

    try {
      const { error } = await supabase
        .from('questions')
        .update({
          question_text: editForm.question_text,
          options: editForm.options,
          correct_index: editForm.correct_index,
          category: editForm.category,
          difficulty: editForm.difficulty,
          difficulty_level: editForm.difficulty, // keep them synced if needed
          is_for_contest: editForm.is_for_contest,
          is_for_solo: editForm.is_for_solo
        })
        .eq('id', editingQuestionId);

      if (error) throw error;

      // Update local state without fetching all again
      setQuestions(questions.map(q =>
        q.id === editingQuestionId
          ? { ...q, ...editForm }
          : q
      ));

      alert("Question modifiée avec succès !");
      setEditingQuestionId(null);
      setEditForm(null);
    } catch (err: any) {
      console.error("Error updating question:", err);
      alert(`Erreur: ${err.message}`);
    }
  };

  return (
    <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl overflow-hidden mt-8">
      <div className="flex border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-4 font-black uppercase tracking-widest text-xs transition-colors ${activeTab === 'manual' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Saisie Manuelle
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 py-4 font-black uppercase tracking-widest text-xs transition-colors ${activeTab === 'import' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Importation JSON
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 py-4 font-black uppercase tracking-widest text-xs transition-colors ${activeTab === 'manage' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Gestion des Questions
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'manage' ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Rechercher une question..."
                className="flex-1 p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-blue-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select
                className="p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-blue-500"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="">Toutes les catégories</option>
                {uniqueCategories.map((cat: any) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {loadingQuestions ? (
              <div className="text-center py-12 text-slate-400 font-bold animate-pulse">
                Chargement des questions...
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-bold">
                    Aucune question trouvée.
                  </div>
                ) : (
                  filteredQuestions.map(q => (
                    <div key={q.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 hover:border-slate-600 transition-colors">
                      {editingQuestionId === q.id ? (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Question</label>
                            <textarea
                              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold outline-none focus:ring-1 ring-blue-500 text-sm resize-none"
                              value={editForm.question_text}
                              onChange={e => setEditForm({ ...editForm, question_text: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {editForm.options.map((opt: string, idx: number) => (
                              <div key={idx} className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex justify-between">
                                  Option {String.fromCharCode(65 + idx)}
                                  <span className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`correct_${q.id}`}
                                      checked={editForm.correct_index === idx}
                                      onChange={() => setEditForm({ ...editForm, correct_index: idx })}
                                      className="w-3 h-3 text-green-500 bg-slate-800 border-slate-700"
                                    />
                                    <span className="text-green-500 text-[9px]">Bonne</span>
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  className={`w-full p-3 bg-slate-900 border rounded-xl text-sm text-white font-bold outline-none focus:ring-1 ${editForm.correct_index === idx ? 'border-green-500/50 ring-green-500' : 'border-slate-700 ring-blue-500'}`}
                                  value={opt}
                                  onChange={e => {
                                    const newOpts = [...editForm.options];
                                    newOpts[idx] = e.target.value;
                                    setEditForm({ ...editForm, options: newOpts });
                                  }}
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-4">
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Catégorie</label>
                              <input
                                type="text"
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-bold outline-none focus:ring-1 ring-blue-500"
                                value={editForm.category}
                                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                              />
                            </div>
                            <div className="w-32 space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Niveau</label>
                              <select
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-bold outline-none focus:ring-1 ring-blue-500"
                                value={editForm.difficulty}
                                onChange={e => setEditForm({ ...editForm, difficulty: parseInt(e.target.value) })}
                              >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                                <option value={4}>4</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50">
                            <button
                              onClick={cancelEdit}
                              className="px-4 py-2 bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-600 transition-colors"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition-colors flex items-center gap-2"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                              Sauvegarder
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-2 flex-1">
                            <h4 className="text-white font-bold text-sm">{q.question_text}</h4>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-slate-900 rounded-xl text-[10px] font-black uppercase text-blue-400 tracking-wider">
                                {q.category}
                              </span>
                              <span className="px-2 py-1 bg-slate-900 rounded-xl text-[10px] font-black uppercase text-amber-400 tracking-wider">
                                Niv. {q.difficulty}
                              </span>
                              {q.is_for_contest && (
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-xl text-[10px] font-black uppercase tracking-wider">
                                  Concours
                                </span>
                              )}
                              {q.is_for_solo && (
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-xl text-[10px] font-black uppercase tracking-wider">
                                  Solo
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {q.options && Array.isArray(q.options) && q.options.map((opt: string, idx: number) => (
                                <div key={idx} className={`text-xs p-2 rounded-xl bg-slate-900 border ${idx === q.correct_index ? 'border-green-500/50 text-green-400 font-bold' : 'border-slate-800 text-slate-400'}`}>
                                  {String.fromCharCode(65 + idx)}. {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleEditClick(q)}
                              className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20"
                              title="Modifier la question"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={(e) => handleDeleteQuestion(q.id, e)}
                              className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                              title="Supprimer la question"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Question</label>
              <textarea
                required
                disabled={isUploading}
                className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold focus:ring-2 ring-blue-500 outline-none disabled:opacity-50 resize-none"
                placeholder="Ex: Qui a découvert la gravité ?"
                value={manualQuestion.question_text}
                onChange={e => setManualQuestion({ ...manualQuestion, question_text: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {manualQuestion.options.map((opt, i) => (
                <div key={i} className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Option {String.fromCharCode(65 + i)}</label>
                  <input
                    required
                    disabled={isUploading}
                    type="text"
                    className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-blue-500 disabled:opacity-50"
                    value={opt}
                    onChange={e => {
                      const newOpts = [...manualQuestion.options];
                      newOpts[i] = e.target.value;
                      setManualQuestion({ ...manualQuestion, options: newOpts });
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Bonne Réponse</label>
                <select
                  className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none"
                  value={manualQuestion.correct_index}
                  onChange={e => setManualQuestion({ ...manualQuestion, correct_index: parseInt(e.target.value) })}
                  disabled={isUploading}
                >
                  <option value={0}>Option A</option>
                  <option value={1}>Option B</option>
                  <option value={2}>Option C</option>
                  <option value={3}>Option D</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Difficulté</label>
                <select
                  className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none"
                  value={manualQuestion.difficulty}
                  onChange={e => setManualQuestion({ ...manualQuestion, difficulty: parseInt(e.target.value) })}
                  disabled={isUploading}
                >
                  <option value={1}>Niveau 1 (Facile)</option>
                  <option value={2}>Niveau 2 (Moyen)</option>
                  <option value={3}>Niveau 3 (Difficile)</option>
                  <option value={4}>Niveau 4 (Expert)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Catégorie</label>
              <input
                required
                disabled={isUploading}
                type="text"
                placeholder="Histoire, Science, Sport..."
                className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-blue-500 disabled:opacity-50"
                value={manualQuestion.category}
                onChange={e => setManualQuestion({ ...manualQuestion, category: e.target.value })}
              />
            </div>

            <div className="flex space-x-4 pt-4 border-t border-slate-800">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualQuestion.is_for_contest}
                  onChange={e => setManualQuestion({ ...manualQuestion, is_for_contest: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-600 bg-slate-800 border-slate-700"
                />
                <span className="text-sm font-bold text-slate-300">Utiliser en Concours</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualQuestion.is_for_solo}
                  onChange={e => setManualQuestion({ ...manualQuestion, is_for_solo: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-600 bg-slate-800 border-slate-700"
                />
                <span className="text-sm font-bold text-slate-300">Utiliser en Solo</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 flex justify-center items-center"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ENREGISTREMENT...
                </>
              ) : 'ENREGISTRER LA QUESTION'}
            </button>
          </form>
        ) : (
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-[2rem] flex items-center justify-center mx-auto border border-blue-500/20">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <div className="max-w-xs mx-auto space-y-2">
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Importation Massive</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Moute yon fichiye JSON ki gen lis kesyon nan bon fòma a.</p>
            </div>

            <label className="inline-flex px-8 py-4 bg-slate-800 text-white font-black rounded-2xl cursor-pointer hover:bg-slate-700 transition-colors uppercase tracking-widest text-xs border border-slate-700 shadow-xl">
              {isUploading ? 'Traitement en cours...' : 'CHOISIR UN FICHIER'}
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>

            <div className="text-left bg-slate-900/50 p-6 rounded-3xl border border-slate-800 max-w-md mx-auto relative group">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fòma JSON atandi :</p>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${copied ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                      KOPIYE!
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      KOPIYE MODÈL
                    </>
                  )}
                </button>
              </div>
              <pre className="text-[10px] text-slate-400 font-mono overflow-x-auto bg-slate-950 p-4 rounded-2xl leading-relaxed border border-slate-800 shadow-inner">
                {jsonTemplate}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQuestionManager;
