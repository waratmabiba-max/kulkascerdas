import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">Halaman Tidak Ditemukan</h1>
        <p className="text-gray-500 mb-4">Maaf, halaman yang Anda cari tidak ada.</p>
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
          ← Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
