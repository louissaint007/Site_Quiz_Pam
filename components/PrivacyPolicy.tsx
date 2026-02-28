import React from 'react';

interface PrivacyPolicyProps {
    onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="mb-8 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg active:scale-95"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Règleman Konfidansyalite</h1>
                <div className="w-12 h-12" /> {/* Spacer */}
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 md:p-12 border border-slate-700/50 shadow-2xl space-y-8 prose prose-invert prose-slate max-w-none">

                <div className="flex items-center gap-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                    <div className="text-3xl">🔒</div>
                    <p className="text-sm text-purple-200 font-medium m-0 flex-1">
                        Mizajou ki pi resan: {new Date().toLocaleDateString('ht-HT', { year: 'numeric', month: 'long', day: 'numeric' })}<br />
                        Pwoteje enfòmasyon prive ou se yon gwo priyorite pou nou.
                    </p>
                </div>

                <section>
                    <h2 className="text-xl font-black text-blue-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4">Done nou Rekòlte Yo</h2>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                        Lè ou kreye yon kont sou QuizPam, nou rekòlte kèk enfo debaz pou nou ka bay ou bon sèvis:
                    </p>
                    <ul className="list-disc list-inside text-slate-300 text-sm md:text-base space-y-2 mt-4">
                        <li><strong>Adrès Imel (Email) ak Non Itilizatè (Username)</strong>: Pou kreye pwofil ou, sekirize idantite jwè a, epi sove pèfòmans (XP) ou nan baz done a.</li>
                        <li><strong>Nimewo Telefòn (Opsyonèl)</strong>: Si w ajoute l pou pèman MonCash oswa Natcash, se sèlman nan but pou n ba w lajan konkou ou genyen yo asireman. NOU PA bay ni vann enfòmasyon sa yo ak okenn twazyèm konpayi.</li>
                        <li><strong>Statistik ak Mouvman nan Jwèt yo</strong>: Nou anrejistre pwen w fè, repons w bay ak tan w pran pou ede konstwi klasman (Leaderboard) platfòm lan.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-black text-yellow-500 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4">Pwoteksyon Enfòmasyon yo</h2>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                        Tout enfòmasyon sou modpas yo kripte ansanm nan sistèm baz done Supabase. Aksè nan kòb ansanm ak balans se done prive. Se sèl ou menm atravè kont ou, ak administratè ofisyèl yo ki ka modifye oswa verifye balans la nan ka gen yon pwoblèm litijik/rezolisyon sipò teknik.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-black text-green-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4">Pataje Enfòmasyon</h2>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                        Sèl ka kote nou ta pataje enfòmasyon yon itilizatè kòm admistrasyon:
                    </p>
                    <ul className="list-disc list-inside text-slate-300 text-sm md:text-base space-y-2 mt-4">
                        <li>Si gen lwa Leta Ayisyen (Fòs sekirite, Lapolis, Jistis) mande li lè gen krim/fwòd ak gwo kòb enplike (blanchiman lajan).</li>
                        <li>Lè founisè sèvis pèman yo (MonCash/Natcash) mande vèrifikasyon sou ki itilizatè k'ap voye tranzaksyon sispèk.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-black text-fuchsia-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4">Dwa Itilizatè yo</h2>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                        Ou gen dwa mande administratè yo (pa mwayen paj Sipò/Kontakte'n) efase kont ou ak tout tras pèsonal yo si w pa swete jwe ankò (tout fon osinon kòb ki sou kont lan san retire ap pèdi pandan sipresyon an).
                    </p>
                </section>

            </div>
        </div>
    );
};

export default PrivacyPolicy;
