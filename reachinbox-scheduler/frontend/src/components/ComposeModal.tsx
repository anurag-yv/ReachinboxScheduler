import React, { useState, useEffect } from 'react';
import { EmailSender, ScheduleEmailInput } from '../types';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: EmailSender[];
  onScheduleSuccess: (result: any) => void;
  onSubmitSchedule: (input: ScheduleEmailInput) => Promise<any>;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  senders,
  onScheduleSuccess,
  onSubmitSchedule,
}) => {
  const [senderId, setSenderId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startAt, setStartAt] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [recipients, setRecipients] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Default to 1 minute from now
      const d = new Date(Date.now() + 60000);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setStartAt(d.toISOString().slice(0, 16));
      if (senders.length > 0 && !senderId) setSenderId(senders[0].id);
    }
  }, [isOpen, senders, senderId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!file && !recipients.trim()) {
      setError('Please provide recipient emails or upload a CSV/TXT file.');
      return;
    }

    setIsLoading(true);
    try {
      const recipientList = recipients
        .split(/[\n,]/)
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      const result = await onSubmitSchedule({
        senderId,
        subject,
        body,
        startAt: new Date(startAt).toISOString(),
        delaySeconds,
        hourlyLimit,
        recipients: recipientList,
        file: file || undefined,
      });

      onScheduleSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to schedule emails');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-chocolate-200">
        <div className="flex items-center justify-between pb-3 border-b border-chocolate-100">
          <h3 className="text-base font-bold text-chocolate-950">Compose Campaign</h3>
          <button onClick={onClose} className="text-chocolate-400 hover:text-chocolate-800 text-sm">
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-chocolate-800 block mb-1">From Sender</label>
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="w-full border border-chocolate-200 rounded-lg p-2 text-xs text-chocolate-900 bg-white"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-chocolate-800 block mb-1">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Cold outreach subject line"
              className="w-full border border-chocolate-200 rounded-lg p-2 text-xs text-chocolate-900"
            />
          </div>

          <div>
            <label className="font-semibold text-chocolate-800 block mb-1">Recipients (one per line or upload file)</label>
            <textarea
              rows={2}
              value={recipients}
              onChange={(e) => {
                setRecipients(e.target.value);
                setFile(null);
              }}
              placeholder="alice@company.com&#10;bob@company.com"
              className="w-full border border-chocolate-200 rounded-lg p-2 text-xs text-chocolate-900 font-mono"
            />
            <div className="mt-1">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFile(e.target.files[0]);
                    setRecipients('');
                  }
                }}
                className="text-[11px] text-chocolate-600"
              />
              {file && <span className="text-[11px] text-emerald-700 font-medium ml-2">Selected: {file.name}</span>}
            </div>
          </div>

          <div>
            <label className="font-semibold text-chocolate-800 block mb-1">Email Body</label>
            <textarea
              rows={3}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi there, wanted to reach out regarding..."
              className="w-full border border-chocolate-200 rounded-lg p-2 text-xs text-chocolate-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-semibold text-chocolate-800 block mb-1">Start Time</label>
              <input
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full border border-chocolate-200 rounded-lg p-1.5 text-xs text-chocolate-900"
              />
            </div>
            <div>
              <label className="font-semibold text-chocolate-800 block mb-1">Delay (sec)</label>
              <input
                type="number"
                min={0}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full border border-chocolate-200 rounded-lg p-1.5 text-xs text-chocolate-900"
              />
            </div>
            <div>
              <label className="font-semibold text-chocolate-800 block mb-1">Hourly Limit</label>
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full border border-chocolate-200 rounded-lg p-1.5 text-xs text-chocolate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-chocolate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-chocolate-200 rounded-lg text-chocolate-700 hover:bg-chocolate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-chocolate-700 hover:bg-chocolate-800 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Scheduling...' : 'Schedule Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
