'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function AddItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState([]);
  const [userId, setUserId] = useState(null);
  const [priceValue, setPriceValue] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUserId(user.id);

      // Get categories
      const { data } = await supabase.from('categories').select('*').order('name');
      setCategories(data || []);
    };
    fetchData();
  }, []);

  // Fungsi untuk format harga ke Rupiah
  const formatRupiah = (value) => {
    if (!value) return '';
    const number = value.replace(/[^0-9]/g, '');
    return new Intl.NumberFormat('id-ID').format(number);
  };

  // Handle perubahan input harga
  const handlePriceChange = (e) => {
    const raw = e.target.value;
    const number = raw.replace(/[^0-9]/g, '');
    setPriceValue(number);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!userId) {
      setError('User tidak ditemukan, silakan login ulang');
      setLoading(false);
      return;
    }

    // Ambil data dari form
    const formData = new FormData(e.target);
    const name = formData.get('name')?.trim();
    const categoryId = formData.get('category_id') || null;
    const quantity = parseFloat(formData.get('quantity')) || 1;
    const unit = formData.get('unit') || 'pcs';
    const expiryDate = formData.get('expiry_date');
    const pricePerUnit = priceValue ? parseFloat(priceValue) : null;
    const notes = formData.get('notes')?.trim() || '';

    // Validasi
    if (!name) {
      setError('Nama barang wajib diisi');
      setLoading(false);
      return;
    }
    if (!expiryDate) {
      setError('Tanggal kadaluarsa wajib diisi');
      setLoading(false);
      return;
    }

    try {
      // Insert langsung pakai supabase client
      const { data, error } = await supabase
        .from('items')
        .insert([{
          user_id: userId,
          name: name,
          category_id: categoryId,
          quantity: quantity,
          unit: unit,
          expiry_date: expiryDate,
          price_per_unit: pricePerUnit,
          notes: notes,
          purchase_date: new Date().toISOString().split('T')[0],
        }])
        .select();

      if (error) {
        console.error('Insert error:', error);
        setError('Gagal menyimpan: ' + error.message);
      } else {
        setSuccess(true);
        // Tunggu sebentar lalu redirect
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 1000);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Terjadi kesalahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
        ← Kembali
      </Link>
      
      <h1 className="text-2xl font-bold mt-4 mb-6">➕ Tambah Stok</h1>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200 animate-slide-in">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4 border border-green-200 animate-slide-in">
          ✅ Item berhasil ditambahkan! Mengalihkan...
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nama Barang <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            placeholder="Contoh: Telur, Susu, Daging"
            disabled={loading || success}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kategori
          </label>
          <select 
            name="category_id"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            disabled={loading || success}
          >
            <option value="">Pilih kategori...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jumlah <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="quantity"
              required
              min="0.5"
              step="0.5"
              defaultValue="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading || success}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Satuan <span className="text-red-500">*</span>
            </label>
            <select
              name="unit"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading || success}
            >
              <option value="pcs">pcs</option>
              <option value="kg">kg</option>
              <option value="gram">gram</option>
              <option value="liter">liter</option>
              <option value="bungkus">bungkus</option>
              <option value="box">box</option>
              <option value="botol">botol</option>
              <option value="kaleng">kaleng</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Kadaluarsa <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="expiry_date"
            required
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            disabled={loading || success}
          />
        </div>

        {/* ============================================
            FORM HARGA DENGAN RUPIAH
        ============================================ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Harga per Satuan <span className="text-gray-400 text-xs">(opsional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="0"
              value={formatRupiah(priceValue)}
              onChange={handlePriceChange}
              disabled={loading || success}
            />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-400">
              💡 Diisi untuk menghitung kerugian jika kadaluarsa
            </p>
            {priceValue && (
              <p className="text-xs text-green-600 font-medium">
                Rp{formatRupiah(priceValue)} / item
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catatan <span className="text-gray-400 text-xs">(opsional)</span>
          </label>
          <textarea
            name="notes"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            rows="2"
            placeholder="Contoh: Beli di pasar Minggu lalu"
            disabled={loading || success}
          />
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg"
        >
          {loading ? '⏳ Menyimpan...' : success ? '✅ Berhasil!' : '💾 Simpan Stok'}
        </button>
      </form>
    </div>
  );
}
