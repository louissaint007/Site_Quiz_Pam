
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const AdminQuestionManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  
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

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex border-b border-slate-100">
        <button 
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'manual' ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600' : 'text-slate-400'}`}
        >
          Saisie Manuelle
        </button>
        <button 
          onClick={() => setActiveTab('import')}
          className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'import' ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600' : 'text-slate-400'}`}
        >
          Importation JSON
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Question</label>
              <textarea 
                required
                disabled={isUploading}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 ring-blue-500 outline-none disabled:opacity-50"
                placeholder="Ex: Qui a découvert la gravité ?"
                value={manualQuestion.question_text}
                onChange={e => setManualQuestion({...manualQuestion, question_text: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {manualQuestion.options.map((opt, i) => (
                <div key={i} className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Option {String.fromCharCode(65 + i)}</label>
                  <input 
                    required
                    disabled={isUploading}
                    type="text"
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 ring-blue-500 disabled:opacity-50"
                    value={opt}
                    onChange={e => {
                      const newOpts = [...manualQuestion.options];
                      newOpts[i] = e.target.value;
                      setManualQuestion({...manualQuestion, options: newOpts});
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Bonne Réponse</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                  value={manualQuestion.correct_index}
                  onChange={e => setManualQuestion({...manualQuestion, correct_index: parseInt(e.target.value)})}
                  disabled={isUploading}
                >
                  <option value={0}>Option A</option>
                  <option value={1}>Option B</option>
                  <option value={2}>Option C</option>
                  <option value={3}>Option D</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Difficulté</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
                  value={manualQuestion.difficulty}
                  onChange={e => setManualQuestion({...manualQuestion, difficulty: parseInt(e.target.value)})}
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
              <label className="text-xs font-bold text-slate-400 uppercase">Catégorie</label>
              <input 
                required
                disabled={isUploading}
                type="text"
                placeholder="Histoire, Science, Sport..."
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 ring-blue-500 disabled:opacity-50"
                value={manualQuestion.category}
                onChange={e => setManualQuestion({...manualQuestion, category: e.target.value})}
              />
            </div>

            <div className="flex space-x-4 pt-4 border-t border-slate-50">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={manualQuestion.is_for_contest}
                  onChange={e => setManualQuestion({...manualQuestion, is_for_contest: e.target.checked})}
                  className="w-5 h-5 rounded text-blue-600"
                />
                <span className="text-sm font-semibold text-slate-600">Utiliser en Concours</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={manualQuestion.is_for_solo}
                  onChange={e => setManualQuestion({...manualQuestion, is_for_solo: e.target.checked})}
                  className="w-5 h-5 rounded text-blue-600"
                />
                <span className="text-sm font-semibold text-slate-600">Utiliser en Solo</span>
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
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <div className="max-w-xs mx-auto space-y-2">
              <h3 className="text-lg font-bold text-slate-800">Importation Massive</h3>
              <p className="text-sm text-slate-500">Sélectionnez un fichier JSON contenant une liste de questions au format correct.</p>
            </div>
            
            <label className="inline-block px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl cursor-pointer hover:bg-black transition-colors">
              {isUploading ? 'Traitement en cours...' : 'CHOISIR UN FICHIER'}
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
            
            <div className="text-left bg-slate-50 p-6 rounded-2xl border border-slate-100 max-w-md mx-auto relative group">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fòma JSON atandi :</p>
                <button 
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    copied ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/10'
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
              <pre className="text-[10px] text-slate-600 font-mono overflow-x-auto bg-slate-100 p-4 rounded-xl leading-relaxed border border-slate-200">
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
