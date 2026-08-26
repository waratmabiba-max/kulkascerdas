'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function WasteHistory() {
  const [wastes, setWastes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalLoss, setTotalLoss] = useState(0);
  const [familyId, setFamilyId] = useState(null);
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    fetchWastes();
  }, []);

  const fetchWastes = async () => {
    setLoading(true);
    
    try {
      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoading(false);
        return;
      }
      setUser(user);

      // Ambil family_id
      const { data: member, error: memberError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        // User belum punya keluarga, redirect ke setup
        setLoading(false);
        return;
      }

      setFamilyId(member.family_id);

      // Get waste history berdasarkan family_id (sharing data)
      const { data, error } = await supabase
        .from('waste_history')
        .select('*')
        .eq('family_id', member.family_id)
        .order('discarded_at', { ascending: false });

      if (error) {
        console.error('Error fetching wastes:', error);
      } else if (data) {
        setWastes(data);
        const total = data.reduce((sum, w) => sum + (w.estimated_loss || 0), 0);
        setTotalLoss(total);
      }
    } catch (err) {
      console.error('Error in fetchWastes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Hitung statistik per bulan
  const getMonthlyStats = () => {
    const monthly = {};
    wastes.forEach(w => {
      const date = new Date(w.discarded_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) {
        monthly[key] = { count: 0, loss: 0 };
      }
      monthly[key].count += 1;
      monthly[key].loss += (w.estimated_loss || 0);
    });
    return monthly;
  };

  const monthlyStats = getMonthlyStats();

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className="text-gray-500">Memuat histori...</p>
        </div>
      </div>
    );
  }

  // Format tanggal
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format harga
  const formatPrice = (price) => {
    if (!price) return 'Rp 0';
    return 'Rp' + price.toLocaleString();
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-xl transition">
          ←
        </Link>
        <h1 className="text-2xl font-bold">🗑️ Histori Pembuangan</h1>
      </div>

      {/* Summary Card */}
      <div className={`${totalLoss > 0 ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'} p-4 rounded-xl mb-4 border`}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Total Kerugian</p>
            <p className={`text-2xl font-bold ${totalLoss > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatPrice(totalLoss)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Item Terbuang</p>
            <p className="text-2xl font-bold">{wastes.length}</p>
          </div>
        </div>
        {wastes.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Rata-rata kerugian: {formatPrice(Math.round(totalLoss / wastes.length))} per item
            </p>
          </div>
        )}
      </div>

      {/* Monthly Stats */}
      {Object.keys(monthlyStats).length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">📊 Per Bulan</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(monthlyStats).map(([month, stats]) => {
              const [year, monthNum] = month.split('-');
              const monthName = new Date(year, monthNum - 1).toLocaleDateString('id-ID', { month: 'short' });
              return (
                <div key={month} className="bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                  <p className="text-xs text-gray-500">{monthName} {year}</p>
                  <p className="font-semibold text-sm">{stats.count} item</p>
                  <p className="text-xs text-red-600">{formatPrice(stats.loss)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List Wastes */}
      {wastes.length === 0 ? (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-6xl mb-4">✨</div>
          <p className="text-gray-500 text-lg font-medium">Belum ada pembuangan</p>
          <p className="text-sm text-gray-400 mt-1">Pertahankan stok tetap terkendali!</p>
          <Link 
            href="/dashboard" 
            className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium transition"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {wastes.map((waste) => (
            <div 
              key={waste.id} 
              className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-red-300 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{waste.item_name}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{waste.quantity} item</span>
                    {waste.estimated_loss && (
                      <span className="text-red-500 font-medium">
                        {formatPrice(waste.estimated_loss)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Dibuang oleh: {waste.user_id === user?.id ? 'Anda' : 'Anggota keluarga'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-xs text-gray-400">
                    {formatDate(waste.discarded_at)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    🕐 {new Date(waste.discarded_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
