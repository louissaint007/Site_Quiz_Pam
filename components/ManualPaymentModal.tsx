import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserPaymentInfo } from '../types';

interface ManualPaymentModalProps {
    user: UserProfile;
    amount: number;
    type: 'deposit' | 'entry_fee' | 'withdraw';
    onClose: () => void;
    onSuccess: () => void;
    contestId?: string;
}

export const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({ user, amount, type, onClose, onSuccess, contestId }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [paymentInfo, setPaymentInfo] = useState<UserPaymentInfo | null>(null);
    const [settings, setSettings] = useState<{ moncash_number?: string; natcash_number?: string; whatsapp_number?: string } | null>(null);
    const [isLoadingInfo, setIsLoadingInfo] = useState(true);

    useEffect(() => {
        const fetchPaymentInfo = async () => {
            try {
                // Fetch settings for dynamic numbers
                const { data: settingsData } = await supabase.from('site_settings').select('moncash_number, natcash_number, whatsapp_number').eq('id', 1).maybeSingle();
                if (settingsData) setSettings(settingsData);

                const { data, error } = await supabase
                    .from('user_payment_info')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (data) Object.assign(paymentInfo || {}, data);
                setPaymentInfo(data);
                if (data?.phone_number) setPhoneNumber(data.phone_number);
            } catch (e) {
                console.error("Error fetching payment info", e);
            } finally {
                setIsLoadingInfo(false);
            }
        };
        fetchPaymentInfo();
    }, [user.id]);

    const handleSavePhone = async () => {
        if (!phoneNumber || phoneNumber.length < 8) {
            alert("Tanpri mete yon nimewo valab.");
            return;
        }
        setIsSaving(true);
        try {
            if (paymentInfo) {
                await supabase
                    .from('user_payment_info')
                    .update({ phone_number: phoneNumber, updated_at: new Date().toISOString() })
                    .eq('id', paymentInfo.id);
            } else {
                const { data } = await supabase
                    .from('user_payment_info')
                    .insert({ user_id: user.id, phone_number: phoneNumber })
                    .select()
                    .single();
                if (data) setPaymentInfo(data);
            }

            // Also save the transaction intent to history so admin knows
            const orderId = `${user.id}__${crypto.randomUUID()}`;
            await supabase.from('transactions').insert({
                id: orderId,
                user_id: user.id,
                amount: amount,
                type: type === 'withdraw' ? 'withdrawal' : type,
                status: 'pending',
                description: type === 'deposit' ? 'Depo Manyèl' : (type === 'withdraw' ? 'Retrè Manyèl' : `Antre Konkou Manyèl`),
                reference_id: contestId || null,
                payment_method: 'MANUAL',
                metadata: {
                    phone_number: phoneNumber,
                    initiated_at: new Date().toISOString()
                }
            });

            alert("Enfòmasyon pèman an anrejistre! Swiv enstriksyon ki anba yo poun fini.");
        } catch (e) {
            console.error("Error saving phone or parsing transaction", e);
            alert("Gen yon erè ki fèt.");
        } finally {
            setIsSaving(false);
        }
    };

    const getTitle = () => {
        if (type === 'deposit') return "Depoze Kòb Manyèlman";
        if (type === 'withdraw') return "Retire Kòb Manyèlman";
        return "Peye Pou Antre Nan Konkou";
    };

    const getInstructions = () => {
        if (type === 'withdraw') {
            return (
                <div className="bg-slate-800 p-4 rounded-xl border border-white/10 text-sm text-slate-300">
                    <p className="mb-2">Admin nou an ap voye <strong className="text-white">{amount} HTG</strong> sou nimewo sa a: <strong className="text-yellow-400">{phoneNumber}</strong>.</p>
                    <p>Tanpri asirew nimewo ou a kòrèk epi li sou non ou (MonCash/NatCash). Ou ka kontakte nou sou WhatsApp si sa pran twòp tan.</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <p className="text-sm text-slate-300">
                    Pou w depoze oswa peye <strong className="text-white">{amount} HTG</strong> la, fè yon transfè sou youn nan nimewo sa yo. SÈVI AK NIMEWO OU ANREJISTRE ANLÈ A SÈLMAN pou nou ka idantifye ou.
                </p>
                <div className="flex flex-col gap-3">
                    <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-center justify-between">
                        <span className="text-white font-black">MonCash (Digicel)</span>
                        <span className="text-red-400 font-bold tracking-wider text-xl">{settings?.moncash_number || '31 23 45 67'}</span>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl flex items-center justify-between">
                        <span className="text-white font-black">NatCash (Natcom)</span>
                        <span className="text-blue-400 font-bold tracking-wider text-xl">{settings?.natcash_number || '41 23 45 67'}</span>
                    </div>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mt-2">
                    Kòb la ap ajoute sou kont ou osito admin lan valide li (1-5 minit).
                </p>
            </div>
        );
    };

    if (isLoadingInfo) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-slate-800 p-6 flex justify-between items-center border-b border-white/5">
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">{getTitle()}</h3>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Important Notice */}
                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl flex gap-3">
                        <span className="text-yellow-500 text-xl">⚠️</span>
                        <p className="text-xs text-yellow-500/90 leading-relaxed font-medium">
                            Akoz kèk pwoblèm teknik kounye a sou rezo otomatik yo, nou oblije fonksyone mannyèlman pou tout tranzaksyon.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nimewo Telefòn Ou (MonCash / NatCash)</label>
                        <div className="flex gap-2">
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={e => setPhoneNumber(e.target.value)}
                                placeholder="Eg: 31234567"
                                className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500 transition-colors"
                            />
                            <button
                                onClick={handleSavePhone}
                                disabled={isSaving}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase text-[10px] px-4 rounded-xl transition-colors"
                            >
                                {isSaving ? '...' : (paymentInfo ? 'Aktyalize' : 'Sove')}
                            </button>
                        </div>
                    </div>

                    {paymentInfo && getInstructions()}

                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                        <a href={settings?.whatsapp_number ? `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}` : "https://wa.me/50930000000"} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-400 font-bold flex items-center gap-2 text-sm transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.441-1.273.606-1.446c.164-.173.355-.217.473-.217l.336.006c.106.005.25-.044.39.298.144.351.491 1.205.534 1.291.043.086.072.186.014.303-.058.116-.086.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.373-.043c.099-.115.429-.504.545-.677.116-.173.232-.144.391-.086.155.058.984.464 1.152.549.168.086.28.129.32.201.041.072.041.42-.103.825zm-3.391-9.416c-3.834 0-6.953 3.12-6.953 6.954 0 1.226.321 2.421.928 3.473l-1.002 3.664 3.754-.984c1.01.549 2.158.839 3.332.839 3.835 0 6.954-3.12 6.954-6.954 0-3.833-3.119-6.953-6.953-6.954z" />
                            </svg>
                            Kontakte Admin
                        </a>

                        <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">
                            Fèmen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
