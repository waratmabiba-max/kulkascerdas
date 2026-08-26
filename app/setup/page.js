'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

export default function SetupFamily() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [familyCode, setFamilyCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }
        setUser(user);
        
        // Cek apakah user sudah punya keluarga
        const { data: member } = await supabase
          .from('family_members')
          .select('*, families(name, code)')
          .eq('user_id', user.id)
          .single();
        
        if (member) {
          // Sudah punya keluarga, langsung ke dashboard
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Error checking user:', err);
      } finally {
        setChecking(false);
      }
    };
    checkUser();
  }, []);

  const createFamily = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Generate kode unik (6 karakter)
      const code = 'FAM' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const name = `Keluarga ${user?.email?.split('@')[0] || 'Baru'}`;
      
      // Buat keluarga
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert([{ name, code }])
        .select()
        .single();
      
      if (familyError) throw new Error(familyError.message);
      
      // Tambahkan user sebagai admin
      const { error: memberError } = await supabase
        .from('family_members')
        .insert([{ family_id: family.id, user_id: user.id, role: 'admin' }]);
      
      if (memberError) throw new Error(memberError.message);
      
      setFamilyCode(code);
      setFamilyName(name);
      setSuccess(true);
      toast.success('🎉 Keluarga berhasil dibuat!');
      
    } catch (err) {
      setError(err.message);
      toast.error('Gagal membuat keluarga: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinFamily = async () => {
    setLoading(true);
    setError('');
    
    const code = prompt('Masukkan kode keluarga (contoh: FAM7X9K2):');
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
      
      setFamilyCode(code.toUpperCase());
      setFamilyName(family.name);
      setSuccess(true);
      toast.success('🎉 Berhasil bergabung ke keluarga!');
      
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(familyCode);
      setCopied(true);
      toast.success('📋 Kode disalin!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Gagal menyalin kode');
    }
  };

  const goToDashboard = () => {
    router.push('/dashboard');
    router.refresh();
  };

  if (checking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className="text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
        }}
      />

      <div className="max-w-md mx-auto p-4 min-h-screen flex items-center">
        <div className="w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">🏠</div>
            <h1 className="text-2xl font-bold text-gray-800">Setup Keluarga</h1>
            <p className="text-gray-500 text-sm mt-1">Bergabung dengan keluarga untuk berbagi stok</p>
          </div>
          
          {/* SUCCESS STATE - Tampilkan kode */}
          {success ? (
            <div className="bg-green-50 p-6 rounded-xl border border-green-200 animate-slide-in">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🎉</div>
                <h2 className="text-lg font-bold text-green-700">Berhasil!</h2>
                <p className="text-sm text-green-600">
                  {familyName} telah dibuat/diikuti
                </p>
              </div>
              
              {/* Kode Keluarga */}
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200 mb-4">
                <p className="text-xs text-gray-500 text-center mb-1">Kode Keluarga</p>
                <div className="flex items-center gap-3 justify-center">
                  <p className="text-2xl font-bold text-blue-600 tracking-[0.3em]">
                    {familyCode}
                  </p>
                  <button
                    onClick={copyCode}
                    className="p-2 hover:bg-blue-50 rounded-lg transition"
                    title="Salin kode"
                  >
                    {copied ? '✅' : '📋'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Bagikan kode ini ke anggota keluarga
                </p>
              </div>

              {/* Informasi tambahan */}
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg mb-4">
                <p className="font-medium text-blue-700">💡 Tips:</p>
                <ul className="text-xs text-gray-600 mt-1 space-y-1 list-disc list-inside">
                  <li>Kirim kode ke pasangan/anggota keluarga</li>
                  <li>Mereka bisa gabung dengan kode ini</li>
                  <li>Setelah gabung, semua stok akan terlihat bersama</li>
                </ul>
              </div>

              {/* Tombol ke Dashboard */}
              <button
                onClick={goToDashboard}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md hover:shadow-lg"
              >
                🚀 Mulai Kelola Stok
              </button>
            </div>
          ) : (
            /* FORM STATE */
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
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition shadow-md hover:shadow-lg"
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
    </>
  );
}
