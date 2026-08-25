'use client';

import React, { useState } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { reprocessFailedNotificationAction } from '@/lib/notifications/notification-service';

type ReprocessButtonProps = {
  notificationId: string;
};

export default function ReprocessNotificationButton({ notificationId }: ReprocessButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReprocess = async () => {
    setLoading(true);
    try {
      await reprocessFailedNotificationAction(notificationId);
      setDone(true);
    } catch (_err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <span className="text-[10px] font-bold text-emerald-700 flex items-center justify-end gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> Reenviado
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleReprocess()}
      disabled={loading}
      className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer ml-auto shadow-2xs"
    >
      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
      <span>{loading ? 'Reenviando...' : 'Reprocessar'}</span>
    </button>
  );
}
