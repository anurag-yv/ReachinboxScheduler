import React from 'react';
import { EmailJob } from '../types';
import { Badge } from './Badge';

interface EmailTableProps {
  type: 'scheduled' | 'sent';
  items: EmailJob[];
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  onComposeClick?: () => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  onRowClick?: (job: EmailJob) => void;
}

export const EmailTable: React.FC<EmailTableProps> = ({
  type,
  items,
  isLoading,
  emptyTitle,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  onRowClick,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-chocolate-200 p-8 text-center text-xs text-chocolate-600">
        Loading emails...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-chocolate-200 p-12 text-center">
        <p className="text-sm font-semibold text-chocolate-900">{emptyTitle}</p>
        <p className="text-xs text-chocolate-500 mt-1">
          {type === 'scheduled' ? 'No emails currently scheduled.' : 'No emails sent yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-chocolate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-chocolate-50 border-b border-chocolate-200 text-chocolate-800 font-semibold uppercase text-[11px]">
            <tr>
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Sender</th>
              <th className="py-3 px-4">{type === 'scheduled' ? 'Scheduled Time' : 'Sent Time'}</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-chocolate-100 text-stone-700">
            {items.map((job) => (
              <tr
                key={job.id}
                onClick={() => onRowClick && onRowClick(job)}
                className="hover:bg-chocolate-50/50 transition-colors"
              >
                <td className="py-3 px-4 font-medium text-chocolate-950">{job.recipient}</td>
                <td className="py-3 px-4 max-w-xs truncate" title={job.subject}>
                  <div className="font-medium text-chocolate-900 truncate">{job.subject}</div>
                  <div className="text-[11px] text-chocolate-500 truncate">{job.body}</div>
                </td>
                <td className="py-3 px-4 text-chocolate-700">{job.sender?.email || 'Default'}</td>
                <td className="py-3 px-4 text-chocolate-600 whitespace-nowrap">
                  {new Date(type === 'scheduled' ? job.scheduledAt : job.sentAt || job.scheduledAt).toLocaleString()}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <Badge status={job.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-chocolate-100 bg-chocolate-50/30 text-xs text-chocolate-600">
        <span>Showing {items.length} of {totalCount}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-2.5 py-1 rounded border border-chocolate-200 bg-white disabled:opacity-40"
          >
            Prev
          </button>
          <span>Page {currentPage} of {Math.max(1, totalPages)}</span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1 rounded border border-chocolate-200 bg-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
