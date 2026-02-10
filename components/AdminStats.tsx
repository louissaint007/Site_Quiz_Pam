
import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AdminStats as StatsType } from '../types';

const AdminStats: React.FC = () => {
  const [stats, setStats] = useState<StatsType>({
    totalUsers: 0,
    totalRevenue: 0,
    activeContests: 0,
    totalQuestions: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: qCount } = await supabase.from('questions').select('*', { count: 'exact', head: true });
      const { count: cCount } = await supabase.from('contests').select('*', { count: 'exact', head: true }).eq('status', 'active');
      
      const { data: userData } = await supabase.from('profiles').select('balance_htg');
      const totalInCirculation = userData?.reduce((acc, curr) => acc + Number(curr.balance_htg), 0) || 0;

      setStats({
        totalUsers: userCount || 0,
        totalQuestions: qCount || 0,
        activeContests: cCount || 0,
        totalRevenue: totalInCirculation
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const StatCard = ({ label, value, color, icon }: { label: string, value: string | number, color: string, icon: string }) => (
    <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-700 shadow-xl">
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-3xl font-black text-white tracking-tighter mb-1">{value}</p>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <StatCard label="Jwè" value={stats.totalUsers} color="blue" icon="👥" />
      <StatCard label="Kesyon" value={stats.totalQuestions} color="purple" icon="❓" />
      <StatCard label="Konkou" value={stats.activeContests} color="green" icon="🏆" />
      <StatCard label="Circulation" value={stats.totalRevenue.toLocaleString()} color="yellow" icon="💰" />
    </div>
  );
};

export default AdminStats;
