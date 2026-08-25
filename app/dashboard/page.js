'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
      } else {
        setUser(user);
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🧊 Kulkas Cerdas</h1>
        <button 
          onClick={handleLogout}
          className="text-red-500 text-sm hover:text-red-700"
        >
          Logout
        </button>
      </div>
      
      <div className="bg-green-50 p-4 rounded-xl mb-4">
        <p className="text-green-700">✅ Login berhasil!</p>
        <p className="text-sm text-gray-600">{user?.email}</p>
      </div>

      <p className="text-gray-500 text-center py-8">
        📦 Setup berhasil! Lanjut ke Hari 2
      </p>
    </div>
  );
}
