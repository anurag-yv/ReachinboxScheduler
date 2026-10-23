import React from 'react';
import { EmailStatus } from '../types';
import { Clock, Send, AlertCircle, RefreshCw } from 'lucide-react';

interface BadgeProps {
  status: EmailStatus | string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  switch (status) {
    case 'scheduled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-caramel-50 text-caramel-700 border border-caramel-200">
          <Clock className="w-3 h-3 text-caramel-600" />
          Scheduled
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-chocolate-50 text-chocolate-800 border border-chocolate-200 animate-pulse">
          <RefreshCw className="w-3 h-3 text-chocolate-600 animate-spin" />
          Processing
        </span>
      );
    case 'sent':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Send className="w-3 h-3 text-emerald-600" />
          Sent
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-chocolate-50 text-chocolate-700 border border-chocolate-100">
          {status}
        </span>
      );
  }
};
