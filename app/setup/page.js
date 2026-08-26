'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SetupFamily() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [familyCode, setFamilyCode] = useState('');
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);
      setChecking(false);
      
      // Cek apakah user sudah punya keluarga
      const { data: member } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (member) {
        router.push('/dashboard');
      }
    };
    checkUser();
  }, []);

  const createFamily = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Generate kode unik
      const code = 'FAM' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Buat keluarga
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert([{ name: `Keluarga ${user.email?.split('@')[0] || 'Baru'}`, code }])
        .select()
        .single();
      
      if (familyError) throw new Error(familyError.message);
      
      // Tambahkan user sebagai admin
      const { error: memberError } = await supabase
        .from('family_members')
        .insert([{ family_id: family.id, user_id: user.id, role: 'admin' }]);
      
      if (memberError) throw new Error(memberError.message);
      
      setFamilyCode(code);
      setSuccess(true);
      
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinFamily = async () => {
    setLoading(true);
    setError('');
    
    const code = prompt('Masukkan kode keluarga:');
    if (!code) {
      setLoading(false);
      return;
    }
    
    try {
      // Cari keluarga berdasarkan kode
      const { data: family, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();
      
      if (familyError) throw new Error('Kode keluarga tidak ditemukan');
      
      // Tambahkan user ke keluarga
      const { error: memberError } = await supabase
        .from('family_members')
        .insert([{ family_id: family.id, user_id: user.id, role: 'member' }]);
      
      if (memberError) throw new Error(memberError.message);
      
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen flex items-center">
      <div className="w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-gray-800">Setup Keluarga</h1>
          <p className="text-gray-500 text-sm mt-1">Bergabung dengan keluarga untuk berbagi stok</p>
        </div>
        
        {success ? (
          <div className="bg-green-50 p-4 rounded-xl text-green-700 border border-green-200">
            <p className="font-medium">✅ Berhasil!</p>
            <p className="text-sm mt-1">Mengalihkan ke dashboard...</p>
            {familyCode && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                <p className="text-xs text-gray-500">Kode Keluarga:</p>
                <p className="text-xl font-bold text-blue-600 tracking-widest">{familyCode}</p>
                <p className="text-xs text-gray-400 mt-1">Bagikan kode ini ke anggota keluarga</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
                ❌ {error}
              </div>
            )}
            
            <div className="space-y-4">
              <button
                onClick={createFamily}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-md hover:shadow-lg"
              >
                {loading ? '⏳ Memproses...' : '🏠 Buat Keluarga Baru'}
              </button>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="text-xs text-gray-400">atau</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>
              
              <button
                onClick={joinFamily}
                disabled={loading}
                className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 disabled:opacity-50 transition"
              >
                {loading ? '⏳ Memproses...' : '👋 Gabung ke Keluarga'}
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400">
                💡 Buat keluarga baru jika kamu pemilik, atau gabung dengan kode dari pemilik
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
