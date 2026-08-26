'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function WasteHistory() {
  const [wastes, setWastes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalLoss, setTotalLoss] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    fetchWastes();
  }, []);

  const fetchWastes = async () => {
    setLoading(true);
    
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get waste history
      const { data, error } = await supabase
        .from('waste_history')
        .select('*')
        .eq('user_id', user.id)
        .order('discarded_at', { ascending: false });

      if (!error && data) {
        setWastes(data);
        const total = data.reduce((sum, w) => sum + (w.estimated_loss || 0), 0);
        setTotalLoss(total);
      }
    } catch (err) {
      console.error('Error fetching wastes:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

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

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-xl">
          ←
        </Link>
        <h1 className="text-2xl font-bold">🗑️ Histori Pembuangan</h1>
      </div>

      {/* Summary Card */}
      <div className={`${totalLoss > 0 ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' : 'bg-green-50 border-green-200'} p-4 rounded-xl mb-4 border`}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Total Kerugian</p>
            <p className={`text-2xl font-bold ${totalLoss > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Rp{totalLoss.toLocaleString()}
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
              Rata-rata kerugian: Rp{Math.round(totalLoss / wastes.length).toLocaleString()} per item
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
                <div key={month} className="bg-gray-50 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-500">{monthName} {year}</p>
                  <p className="font-semibold text-sm">{stats.count} item</p>
                  <p className="text-xs text-red-600">Rp{stats.loss.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List Wastes */}
      {wastes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✨</div>
          <p className="text-gray-500 text-lg">Belum ada pembuangan</p>
          <p className="text-sm text-gray-400 mt-1">Pertahankan stok tetap terkendali!</p>
          <Link 
            href="/dashboard" 
            className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {wastes.map((waste) => (
            <div 
              key={waste.id} 
              className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-red-300 hover:shadow transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800">{waste.item_name}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{waste.quantity} item</span>
                    {waste.estimated_loss && (
                      <span className="text-red-500 font-medium">
                        Rp{waste.estimated_loss.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-xs text-gray-400">
                    {new Date(waste.discarded_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
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
