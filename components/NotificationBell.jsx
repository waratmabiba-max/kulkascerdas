'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

function getItemStatus(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { status: 'expired', label: 'Kadaluarsa', priority: 0 };
  if (diffDays <= 3) return { status: 'critical', label: 'Segera!', priority: 1 };
  if (diffDays <= 7) return { status: 'warning', label: 'Perhatikan', priority: 2 };
  return { status: 'safe', label: 'Aman', priority: 3 };
}

export function NotificationBell({ items }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef(null);

  // Cek apakah mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter items yang perlu perhatian
  const notifications = items
    .filter(item => {
      const status = getItemStatus(item.expiry_date);
      return status.status === 'expired' || status.status === 'critical' || status.status === 'warning';
    })
    .sort((a, b) => {
      const statusA = getItemStatus(a.expiry_date);
      const statusB = getItemStatus(b.expiry_date);
      return statusA.priority - statusB.priority;
    });

  // Kelompokkan berdasarkan status
  const expiredItems = notifications.filter(i => getItemStatus(i.expiry_date).status === 'expired');
  const criticalItems = notifications.filter(i => getItemStatus(i.expiry_date).status === 'critical');
  const warningItems = notifications.filter(i => getItemStatus(i.expiry_date).status === 'warning');

  // Tutup dropdown jika klik di luar (khusus desktop)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isMobile && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  // Animasi notifikasi baru
  useEffect(() => {
    if (notifications.length > 0) {
      setHasNewNotifications(true);
      const timer = setTimeout(() => setHasNewNotifications(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications.length]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'expired': return 'bg-red-50 border-red-500 text-red-700';
      case 'critical': return 'bg-orange-50 border-orange-500 text-orange-700';
      case 'warning': return 'bg-yellow-50 border-yellow-500 text-yellow-700';
      default: return 'bg-gray-50 border-gray-300 text-gray-700';
    }
  };

  return (
    <>
      {/* Tombol Notifikasi */}
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 rounded-full hover:bg-gray-100 transition ${
            hasNewNotifications ? 'animate-pulse' : ''
          }`}
          aria-label="Notifikasi"
        >
          <span className="text-2xl">🔔</span>
          {notifications.length > 0 && (
            <span className={`absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ${
              expiredItems.length > 0 ? 'bg-red-500' : 'bg-orange-500'
            }`}>
              {notifications.length}
            </span>
          )}
        </button>

        {/* ============================================
            DROPDOWN DESKTOP
        ============================================ */}
        {isOpen && !isMobile && (
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 z-50">
            <NotificationContent 
              notifications={notifications}
              expiredItems={expiredItems}
              criticalItems={criticalItems}
              warningItems={warningItems}
              onClose={() => setIsOpen(false)}
            />
          </div>
        )}
      </div>

      {/* ============================================
          MODAL FULLSCREEN HP
      ============================================ */}
      {isOpen && isMobile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal dari bawah */}
          <div className="relative w-full max-h-[80vh] bg-white rounded-t-2xl shadow-2xl animate-slide-up overflow-hidden">
            {/* Handle/indicator di atas */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>
            
            {/* Header dengan tombol close */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-lg">🔔 Notifikasi</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto p-4 pb-6" style={{ maxHeight: 'calc(80vh - 120px)' }}>
              <NotificationContent 
                notifications={notifications}
                expiredItems={expiredItems}
                criticalItems={criticalItems}
                warningItems={warningItems}
                onClose={() => setIsOpen(false)}
                isMobile={true}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// KOMPONEN KONTEN NOTIFIKASI (Reusable)
// ============================================
function NotificationContent({ notifications, expiredItems, criticalItems, warningItems, onClose, isMobile = false }) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-4xl mb-2">✨</p>
        <p className="text-gray-500 text-sm">Semua stok aman!</p>
        <p className="text-gray-400 text-xs">Tidak ada item yang perlu perhatian</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Kadaluarsa */}
      {expiredItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-600 px-2 py-1">
            🔴 Kadaluarsa ({expiredItems.length})
          </p>
          {expiredItems.map(item => (
            <NotificationItem key={item.id} item={item} status="expired" isMobile={isMobile} />
          ))}
        </div>
      )}

      {/* Kritis */}
      {criticalItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-orange-600 px-2 py-1">
            🚨 Segera ({criticalItems.length})
          </p>
          {criticalItems.map(item => (
            <NotificationItem key={item.id} item={item} status="critical" isMobile={isMobile} />
          ))}
        </div>
      )}

      {/* Warning */}
      {warningItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-yellow-600 px-2 py-1">
            ⚠️ Perhatikan ({warningItems.length})
          </p>
          {warningItems.map(item => (
            <NotificationItem key={item.id} item={item} status="warning" isMobile={isMobile} />
          ))}
        </div>
      )}

      {/* Link ke waste history */}
      {expiredItems.length > 0 && (
        <Link 
          href="/waste"
          className="block mt-3 text-center text-xs text-blue-600 hover:text-blue-700 py-2 border-t border-gray-100"
          onClick={onClose}
        >
          Lihat histori pembuangan →
        </Link>
      )}
    </div>
  );
}

// ============================================
// ITEM NOTIFIKASI
// ============================================
function NotificationItem({ item, status, isMobile = false }) {
  const today = new Date();
  const expiry = new Date(item.expiry_date);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  const getStatusColor = (status) => {
    switch (status) {
      case 'expired': return 'border-l-4 border-red-500 bg-red-50';
      case 'critical': return 'border-l-4 border-orange-500 bg-orange-50';
      case 'warning': return 'border-l-4 border-yellow-500 bg-yellow-50';
      default: return 'border-l-4 border-gray-300 bg-gray-50';
    }
  };

  let message = '';
  if (status === 'expired') {
    message = 'Sudah kadaluarsa!';
  } else if (status === 'critical') {
    message = `${Math.abs(diffDays)} hari lagi!`;
  } else if (status === 'warning') {
    message = `${diffDays} hari lagi`;
  }

  return (
    <div className={`${getStatusColor(status)} p-3 rounded-lg mb-1.5 ${isMobile ? 'py-4' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-xl flex-shrink-0">{item.categories?.icon || '📦'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
          <p className="text-xs text-gray-600">
            {item.quantity} {item.unit} · {message}
          </p>
        </div>
        <span className="text-sm whitespace-nowrap flex-shrink-0">
          {status === 'expired' ? '⚠️' : `⏳${Math.abs(diffDays)}d`}
        </span>
      </div>
    </div>
  );
}
