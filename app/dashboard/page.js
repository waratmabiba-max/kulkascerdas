'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from '@/components/NotificationBell';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

// Utility function
function getItemStatus(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { status: 'expired', label: 'Kadaluarsa', color: 'red', priority: 0 };
  } else if (diffDays <= 3) {
    return { status: 'critical', label: 'Segera!', color: 'orange', priority: 1 };
  } else if (diffDays <= 7) {
    return { status: 'warning', label: 'Perhatikan', color: 'yellow', priority: 2 };
  } else {
    return { status: 'safe', label: 'Aman', color: 'green', priority: 3 };
  }
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [hasFamily, setHasFamily] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  // Cek apakah user sudah punya keluarga
  const checkFamily = async (userId) => {
    const { data, error } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      setHasFamily(false);
      return null;
    }
    
    setHasFamily(true);
    setFamilyId(data.family_id);
    return data.family_id;
  };

  // Load data
  const loadData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push('/auth/login');
        return;
      }
      
      setUser(user);

      // Cek family
      const famId = await checkFamily(user.id);
      
      if (!famId) {
        // User belum punya keluarga, redirect ke halaman setup
        router.push('/setup');
        return;
      }

      // Load items berdasarkan family_id (bukan user_id)
      const { data, error } = await supabase
        .from('items')
        .select('*, categories(name, icon)')
        .eq('family_id', famId)
        .order('expiry_date', { ascending: true });

      if (error) {
        setError(error.message);
        toast.error('Gagal memuat data: ' + error.message);
      } else {
        setItems(data || []);
      }
    } catch (err) {
      console.error('Error loadData:', err);
      setError(err.message);
      toast.error('Terjadi kesalahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription
  useEffect(() => {
    loadData();

    if (!familyId) return;

    const channel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
        },
        (payload) => {
          console.log('📡 Realtime update:', payload);
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId]);

  // Handle delete
  const handleDelete = async (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const status = getItemStatus(item.expiry_date);
    let message = '';
    let confirmText = '';
    
    if (status.status === 'expired') {
      message = `🗑️ ${item.name} sudah kadaluarsa!`;
      confirmText = 'Yakin mau dibuang?';
    } else if (status.status === 'critical') {
      const daysLeft = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
      message = `⚠️ ${item.name} masih bisa dipakai (${daysLeft} hari lagi)`;
      confirmText = 'Yakin mau dibuang?';
    } else {
      message = `Apakah ${item.name} sudah tidak terpakai?`;
      confirmText = 'Yakin mau dibuang?';
    }
    
    if (!confirm(`${message}\n\n${confirmText}`)) return;
    
    setDeletingId(id);
    
    try {
      // 1. Insert ke waste_history dengan family_id
      const { error: wasteError } = await supabase
        .from('waste_history')
        .insert([{
          user_id: user.id,
          family_id: familyId,
          item_id: item.id,
          item_name: item.name,
          quantity: item.quantity,
          estimated_loss: item.price_per_unit ? item.price_per_unit * item.quantity : null,
          discarded_at: new Date().toISOString().split('T')[0],
        }]);

      if (wasteError) {
        toast.error('Gagal menyimpan ke histori: ' + wasteError.message);
        setDeletingId(null);
        return;
      }

      // 2. Delete dari items
      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (deleteError) {
        toast.error('Gagal menghapus: ' + deleteError.message);
      } else {
        toast.success(`✅ ${item.name} berhasil dibuang!`);
        await loadData();
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    if (confirm('Yakin mau logout?')) {
      await supabase.auth.signOut();
      router.push('/auth/login');
      router.refresh();
    }
  };

  // Loading state
  if (loading && items.length === 0) {
    return <LoadingSkeleton />;
  }

  // Group items by status
  const grouped = {
    expired: items.filter(i => getItemStatus(i.expiry_date).status === 'expired'),
    critical: items.filter(i => getItemStatus(i.expiry_date).status === 'critical'),
    warning: items.filter(i => getItemStatus(i.expiry_date).status === 'warning'),
    safe: items.filter(i => getItemStatus(i.expiry_date).status === 'safe'),
  };

  const totalLoss = items
    .filter(i => getItemStatus(i.expiry_date).status === 'expired')
    .reduce((sum, i) => sum + (i.price_per_unit || 0) * (i.quantity || 0), 0);

  const totalItems = items.length;
  const needAttention = grouped.expired.length + grouped.critical.length + grouped.warning.length;

  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
          success: {
            icon: '✅',
            style: {
              border: '1px solid #22c55e',
            },
          },
          error: {
            icon: '❌',
            style: {
              border: '1px solid #ef4444',
            },
          },
        }}
      />

      <div className="max-w-md mx-auto p-4 pb-24 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">🧊 Kulkas Cerdas</h1>
          <div className="flex items-center gap-2">
            <NotificationBell items={items} />
            <Link 
              href="/waste" 
              className="text-gray-500 hover:text-gray-700 text-sm p-2 hover:bg-gray-100 rounded-full transition"
              title="Lihat Histori Pembuangan"
            >
              📊
            </Link>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 px-4 py-2 rounded-lg font-medium transition border border-gray-200 hover:border-red-200"
            >
              <span>🚪</span>
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* User info */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl mb-4 text-sm text-green-700 border border-green-200">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span className="font-medium">{user?.email}</span>
            <span className="text-xs text-gray-400 ml-auto">
              👨‍👩‍👦 Keluarga
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200 animate-slide-in">
            ❌ {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl border border-blue-200">
            <p className="text-xs text-gray-600">Total Stok</p>
            <p className="text-2xl font-bold text-blue-700">{totalItems}</p>
          </div>
          
          <div className={`${totalLoss > 0 ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'} p-3 rounded-xl border`}>
            <p className="text-xs text-gray-600">💸 Kerugian</p>
            <p className={`text-xl font-bold ${totalLoss > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Rp{totalLoss.toLocaleString()}
            </p>
          </div>
          
          <div className={`${needAttention > 0 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200' : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'} p-3 rounded-xl border col-span-2`}>
            <p className="text-xs text-gray-600">⚠️ Perlu Perhatian</p>
            <p className={`text-lg font-bold ${needAttention > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
              {needAttention > 0 ? `${needAttention} item` : 'Semua aman! ✨'}
            </p>
            {needAttention > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {grouped.expired.length > 0 && `${grouped.expired.length} kadaluarsa`}
                {grouped.expired.length > 0 && grouped.critical.length > 0 && ' · '}
                {grouped.critical.length > 0 && `${grouped.critical.length} segera`}
                {grouped.critical.length > 0 && grouped.warning.length > 0 && ' · '}
                {grouped.warning.length > 0 && `${grouped.warning.length} perhatikan`}
              </p>
            )}
          </div>
        </div>

        {/* Quick Action */}
        {totalLoss > 0 && (
          <Link href="/waste" className="block mb-4">
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-center hover:bg-red-100 transition animate-slide-in">
              <p className="text-sm text-red-600">
                💰 Total kerugian Rp{totalLoss.toLocaleString()} · Klik untuk lihat detail
              </p>
            </div>
          </Link>
        )}

        {/* Tombol Tambah */}
        <Link href="/items/add">
          <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition mb-4 shadow-md hover:shadow-lg active:scale-[0.98]">
            ➕ Tambah Stok
          </button>
        </Link>

        {/* Items List */}
        <div className="space-y-4">
          {/* ... (sama seperti sebelumnya, tidak berubah) */}
          {grouped.expired.length > 0 && (
            <div>
              <h2 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                <span>🔴 Kadaluarsa</span>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  {grouped.expired.length}
                </span>
              </h2>
              {grouped.expired.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  status="expired" 
                  onDelete={handleDelete}
                  isDeleting={deletingId === item.id}
                />
              ))}
            </div>
          )}

          {grouped.critical.length > 0 && (
            <div>
              <h2 className="font-semibold text-orange-500 mb-2 flex items-center gap-2">
                <span>🚨 Segera!</span>
                <span className="text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full">
                  {grouped.critical.length}
                </span>
              </h2>
              {grouped.critical.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  status="critical" 
                  onDelete={handleDelete}
                  isDeleting={deletingId === item.id}
                />
              ))}
            </div>
          )}

          {grouped.warning.length > 0 && (
            <div>
              <h2 className="font-semibold text-yellow-600 mb-2 flex items-center gap-2">
                <span>⚠️ Perhatikan</span>
                <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full">
                  {grouped.warning.length}
                </span>
              </h2>
              {grouped.warning.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  status="warning" 
                  onDelete={handleDelete}
                  isDeleting={deletingId === item.id}
                />
              ))}
            </div>
          )}

          {grouped.safe.length > 0 && (
            <div>
              <h2 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                <span>✅ Aman</span>
                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                  {grouped.safe.length}
                </span>
              </h2>
              {grouped.safe.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  status="safe" 
                  onDelete={handleDelete}
                  isDeleting={deletingId === item.id}
                />
              ))}
            </div>
          )}

          {totalItems === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="text-7xl mb-4">🕊️</div>
              <p className="text-gray-500 text-lg font-medium">Kulkas masih kosong</p>
              <p className="text-sm text-gray-400 mt-1">Yuk tambahkan stok makanan!</p>
              <Link href="/items/add">
                <button className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-md hover:shadow-lg">
                  + Tambah Sekarang
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ItemCard Component (sama seperti sebelumnya)
function ItemCard({ item, status, onDelete, isDeleting }) {
  const statusColors = {
    expired: 'border-red-500 bg-red-50',
    critical: 'border-orange-500 bg-orange-50',
    warning: 'border-yellow-500 bg-yellow-50',
    safe: 'border-green-500 bg-green-50',
  };

  const statusLabels = {
    expired: '🔴 Kadaluarsa',
    critical: '🚨 Segera!',
    warning: '⚠️ Perhatikan',
    safe: '✅ Aman',
  };

  const colorClass = statusColors[status] || 'border-gray-300 bg-white';
  const daysLeft = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className={`border-l-4 ${colorClass} bg-white p-3 rounded-lg shadow-sm mb-2 hover:shadow-md transition-all duration-200`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{item.categories?.icon || '📦'}</span>
            <h3 className="font-semibold text-gray-800 truncate">{item.name}</h3>
          </div>
          <p className="text-sm text-gray-600">
            {item.quantity} {item.unit}
            {item.price_per_unit && (
              <span className="text-gray-400 ml-1">
                · Rp{item.price_per_unit.toLocaleString()}/unit
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-400">
              📅 {new Date(item.expiry_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className={`text-xs font-medium ${
              status === 'expired' ? 'text-red-600' :
              status === 'critical' ? 'text-orange-600' :
              status === 'warning' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {statusLabels[status]}
              {status !== 'safe' && status !== 'expired' && ` (${daysLeft} hari)`}
            </p>
          </div>
          {item.notes && (
            <p className="text-xs text-gray-400 mt-1 truncate">📝 {item.notes}</p>
          )}
        </div>
        <button
          onClick={() => onDelete(item.id)}
          disabled={isDeleting}
          className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-lg transition ${
            isDeleting 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600'
          }`}
          title="Buang item"
        >
          {isDeleting ? '⏳' : '🗑️'}
        </button>
      </div>
    </div>
  );
}
