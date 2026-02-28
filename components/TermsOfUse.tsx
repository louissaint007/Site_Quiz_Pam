import React from 'react';
import { motion } from 'framer-motion';

interface TermsOfUseProps {
    onBack: () => void;
}

const TermsOfUse: React.FC<TermsOfUseProps> = ({ onBack }) => {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="mb-8 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg active:scale-95"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Kondisyon Itilizasyon</h1>
                <div className="w-12 h-12" /> {/* Spacer for centering */}
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 md:p-12 border border-slate-700/50 shadow-2xl space-y-8 prose prose-invert prose-slate max-w-none">

                <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                    <div className="text-3xl">ℹ️</div>
                    <p className="text-sm text-blue-200 font-medium m-0 flex-1">
                        Dènye Mizajou: {new Date().toLocaleDateString('ht-HT', { year: 'numeric', month: 'long', day: 'numeric' })}<br />
                        Tanpri li kondisyon sa yo ak atansyon avan ou itilize sit QuizPam nan.
                    </p>
                </div>

                <section>
                    <h2 className="text-xl font-black text-red-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4">1. Akseptasyon Kondisyon yo</h2>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                        Lè w enskri oubyen jwe pratik sou QuizPam, ou aksepte san kondisyon tout règleman ki nan dokiman sa a. Si w pa dakò ak youn nan pwen sa yo, ou pa ta dwe itilize sèvis nou yo. Nou gen dwa modifye kondisyon sa yo nenpòt kilè.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-black text-blue-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4">2. Kalifikasyon</h2>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-4">
                        Pou yon moun patisipe nan konkou ak prim (ak kòb reyèl), itilizatè a dwe:
                    </p>
                    <ul className="list-disc list-inside text-slate-300 text-sm md:text-base space-y-2">
                        <li>Gen omwen 18 an, oubyen gen otorizasyon yon paran/responsab legal.</li>
                        <li>Gen yon nimewo MonCash oubyen Natcash ki anrejistre sou non li oubyen yon fanmi l fè konfyans pou resevwa pèman yo.</li>
                        <li>Gen asirans entènèt ak kouran pou l pa dekonekte pandan match yo (nou pa responsab pèt koneksyon).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-black text-yellow-500 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4">3. Fwòd ak Fason Jwe</h2>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-4">
                        Nou pran byen swen kominote nou an epi toujou chèche evite abi. Aksyon sa yo konsidere kòm fwòd epi yo ka pini ak suspansyon kont (e pèdi pwen/kòb ou genyen):
                    </p>
                    <ul className="list-disc list-inside text-slate-300 text-sm md:text-base space-y-2">
                        <li>Bire fwod (sèvi ak script, bot, oubyen automatisation pou reponn pi vit).</li>
                        <li>Fèmen fenèt navigateur a espre pou pa pèdi nan konkou.</li>
                        <li>Bipase minit ak tan yo ba w pou w reponn kesyon yo.</li>
                        <li>Itilize miltip kont pou w ranpli tèt ou kado (yon sèl kont yon sèl moun).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-black text-green-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4">4. Retrè ak Pèman</h2>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                        Kòb ou genyen (Balans HTG) se ou menm ki jere li. Administratè yo kapab pran jiska {<span className="font-bold text-white">48 èdtan</span>} oswa plis pou yo trete demann retrè ou. Ou sipoze asire w ke tout nimewo ou mete pou resevwa kòb yo verifye epi yo ka aksepte transfè san pwoblèm.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-black text-fuchsia-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4">5. Chanjman nan Platfòm lan</h2>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                        QuizPam rezève dwa li pou siprime yon konkou sanzatann si l jwenn gen pwoblèm teknik oswa si kantite patisipan ki mande yo pa la. Lè sa fèt, kòb frè antre w la ap remèt ou imedyatman. Nou ka fè modifikasyon (piblisite, sistèm XP) ki pou amelyore eksperyans jwè a san wè nou pa aviti alavans.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest border-b border-slate-700 pb-2 mb-4">6. Kontak ak Litij</h2>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                        Si w gen pwen ki pa klè ou beswen èd dirèkteman de devlopè a, oubyen ou jwenn yon ensèk (bug) k'ap ruine jwèt la, tanpri jwenn nimewo nou nan footer a (anba nèt sit la) oubyen ekri nou sou rezo sosyal yo pou jwenn akò. Litij ak entansyon piratage yo ap pouswiv epi trete yon fason sèvè.
                    </p>
                </section>

                <div className="mt-12 text-center text-slate-500 text-sm font-black uppercase tracking-widest">
                    Mèsi Dèske ou Chwazi QuizPam !
                </div>

            </div>
        </div>
    );
};

export default TermsOfUse;
