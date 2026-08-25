'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      router.push(user ? '/dashboard' : '/auth/login');
    };
    checkAuth();
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
