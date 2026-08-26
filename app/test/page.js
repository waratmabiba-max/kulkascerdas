'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestPage() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const testRLS = async () => {
    setLoading(true);
    setResult('⏳ Testing RLS...');
    
    try {
      // 1. Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setResult(`❌ User error: ${userError?.message || 'User tidak login'}`);
        setLoading(false);
        return;
      }
      
      setResult(prev => prev + `\n✅ User: ${user.email} (${user.id})`);

      // 2. Test SELECT categories
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .limit(1);

      if (catError) {
        setResult(prev => prev + `\n❌ Categories SELECT: ${catError.message}`);
      } else {
        setResult(prev => prev + `\n✅ Categories SELECT: ${categories.length} data`);
      }

      // 3. Test INSERT items
      const testItem = {
        user_id: user.id,
        name: `Test ${new Date().getTime()}`,
        quantity: 1,
        unit: 'pcs',
        expiry_date: new Date().toISOString().split('T')[0],
      };

      const { data: inserted, error: insertError } = await supabase
        .from('items')
        .insert([testItem])
        .select();

      if (insertError) {
        setResult(prev => prev + `\n❌ Items INSERT: ${insertError.message}`);
        setResult(prev => prev + `\n\n📋 Detail error:\n${JSON.stringify(insertError, null, 2)}`);
      } else {
        setResult(prev => prev + `\n✅ Items INSERT: ${inserted.length} data ditambahkan`);
        setResult(prev => prev + `\n📦 Data: ${JSON.stringify(inserted, null, 2)}`);

        // 4. Test DELETE (cleanup)
        const { error: deleteError } = await supabase
          .from('items')
          .delete()
          .eq('id', inserted[0].id);

        if (deleteError) {
          setResult(prev => prev + `\n⚠️ DELETE gagal: ${deleteError.message}`);
        } else {
          setResult(prev => prev + `\n✅ DELETE berhasil (cleanup)`);
        }
      }

      setResult(prev => prev + `\n\n🎯 RLS Test Complete!`);
      
    } catch (err) {
      setResult(`🔥 Error: ${err.message}\n\n${err.stack}`);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">🧪 Test RLS</h1>
      
      <button 
        onClick={testRLS}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
      >
        {loading ? '⏳ Testing...' : '🧪 Test RLS'}
      </button>
      
      <pre className="mt-4 p-4 bg-gray-100 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96 border">
        {result || 'Klik tombol untuk test RLS'}
      </pre>

      <div className="mt-4 text-sm text-gray-500">
        <p>📌 Pastikan:</p>
        <ul className="list-disc list-inside ml-2 text-xs">
          <li>User sudah login</li>
          <li>RLS aktif di Supabase</li>
          <li>Policy sudah dibuat</li>
        </ul>
      </div>
    </div>
  );
}
