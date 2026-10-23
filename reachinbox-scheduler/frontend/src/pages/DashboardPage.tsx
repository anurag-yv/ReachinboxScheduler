import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, EmailJob, EmailSender, SlackConnectionStatus } from '../types';
import { EmailService, SenderService, SlackService } from '../services/api';
import { Navbar } from '../components/Navbar';
import { EmailTable } from '../components/EmailTable';
import { ComposeModal } from '../components/ComposeModal';
import { Plus, RefreshCw, Clock, Send, ShieldCheck, Trash2 } from 'lucide-react';

interface DashboardPageProps {
  user: User;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'search'>('scheduled');

  // Tables state
  const [scheduledJobs, setScheduledJobs] = useState<EmailJob[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [scheduledPage, setScheduledPage] = useState(1);
  const [isScheduledLoading, setIsScheduledLoading] = useState(true);

  const [sentJobs, setSentJobs] = useState<EmailJob[]>([]);
  const [sentTotal, setSentTotal] = useState(0);
  const [sentPage, setSentPage] = useState(1);
  const [isSentLoading, setIsSentLoading] = useState(true);

  const [searchResults, setSearchResults] = useState<EmailJob[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [senders, setSenders] = useState<EmailSender[]>([]);
  const [slackStatus, setSlackStatus] = useState<SlackConnectionStatus | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Handle Slack OAuth redirect query params
  useEffect(() => {
    if (searchParams.get('slack') === 'connected') {
      setToastMessage('Slack workspace connected.');
      setSearchParams({});
    } else if (searchParams.get('slack_error')) {
      setError(`Slack connection failed: ${searchParams.get('slack_error')}`);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const loadScheduled = useCallback(async (page = 1) => {
    setIsScheduledLoading(true);
    try {
      const res = await EmailService.getScheduled(page, 10);
      setScheduledJobs(res.data);
      setScheduledTotal(res.pagination.total);
      setScheduledPage(res.pagination.page);
    } catch {
      setError('Failed to fetch scheduled emails');
    } finally {
      setIsScheduledLoading(false);
    }
  }, []);

  const loadSent = useCallback(async (page = 1) => {
    setIsSentLoading(true);
    try {
      const res = await EmailService.getSent(page, 10);
      setSentJobs(res.data);
      setSentTotal(res.pagination.total);
      setSentPage(res.pagination.page);
    } catch {
      setError('Failed to fetch sent emails');
    } finally {
      setIsSentLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const [sendersData, slackData] = await Promise.all([
        SenderService.list().catch(() => []),
        SlackService.getStatus().catch(() => null),
      ]);
      setSenders(sendersData);
      setSlackStatus(slackData);
    } catch {}
    loadScheduled(1);
    loadSent(1);
  }, [loadScheduled, loadSent]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setActiveTab('search');
    try {
      const res = await EmailService.search(searchQuery.trim(), 1, 10);
      setSearchResults(res.data);
      setSearchTotal(res.pagination.total);
    } catch (err: any) {
      setError('Search failed: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all sent and scheduled email history?')) return;
    try {
      await EmailService.clearHistory();
      setScheduledJobs([]);
      setScheduledTotal(0);
      setSentJobs([]);
      setSentTotal(0);
      setSearchResults([]);
      setSearchTotal(0);
      setToastMessage('History and queues cleared.');
      loadScheduled(1);
      loadSent(1);
    } catch (err: any) {
      setError('Failed to clear history: ' + err.message);
    }
  };

  const metrics = [
    { label: 'Scheduled in Queue', count: scheduledTotal, icon: Clock, color: 'text-caramel-700 bg-caramel-50' },
    { label: 'Sent Emails', count: sentTotal, icon: Send, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Active Senders', count: senders.length, icon: ShieldCheck, color: 'text-chocolate-700 bg-chocolate-50' },
  ];

  return (
    <div className="min-h-screen bg-[#FBF9F6] flex flex-col text-xs text-chocolate-900">
      <Navbar
        user={user}
        onLogout={onLogout}
        slackStatus={slackStatus}
        onConnectSlack={() => { window.location.href = '/api/slack/connect'; }}
        onDisconnectSlack={async () => {
          if (window.confirm('Disconnect Slack?')) {
            await SlackService.disconnect();
            setSlackStatus({ connected: false, connection: null });
            setToastMessage('Slack disconnected.');
          }
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={() => {
          setSearchQuery('');
          setSearchResults([]);
          setActiveTab('scheduled');
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {toastMessage && (
          <div className="flex items-center justify-between p-3 bg-chocolate-50 border border-chocolate-200 text-chocolate-900 rounded-xl">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="font-bold">✕</button>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold">✕</button>
          </div>
        )}

        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-chocolate-950">Email Outreach</h2>
            <p className="text-chocolate-600 mt-0.5">Manage cold outreach batches and queue delivery.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { loadScheduled(scheduledPage); loadSent(sentPage); }}
              className="px-3 py-1.5 border border-chocolate-200 rounded-lg bg-white hover:bg-chocolate-50 flex items-center gap-1.5 font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              onClick={handleClearHistory}
              className="px-3 py-1.5 border border-chocolate-200 rounded-lg bg-white hover:bg-red-50 text-chocolate-700 hover:text-red-700 flex items-center gap-1.5 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear History
            </button>
            <button
              onClick={() => setIsComposeOpen(true)}
              className="px-3.5 py-1.5 bg-chocolate-700 hover:bg-chocolate-800 text-white rounded-lg flex items-center gap-1.5 font-medium shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Compose Email
            </button>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {metrics.map((m, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-chocolate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-chocolate-500 uppercase">{m.label}</p>
                <h3 className="text-2xl font-bold text-chocolate-950 mt-1">{m.count}</h3>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${m.color}`}>
                <m.icon className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-chocolate-200 pb-1">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-3.5 py-2 font-semibold rounded-lg flex items-center gap-1.5 ${
              activeTab === 'scheduled' ? 'bg-white border border-chocolate-200 shadow-sm text-chocolate-950' : 'text-chocolate-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Scheduled ({scheduledTotal})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-3.5 py-2 font-semibold rounded-lg flex items-center gap-1.5 ${
              activeTab === 'sent' ? 'bg-white border border-chocolate-200 shadow-sm text-chocolate-950' : 'text-chocolate-600'
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Sent ({sentTotal})
          </button>
          {activeTab === 'search' && (
            <span className="ml-auto text-xs text-chocolate-600">
              Results for: <strong className="text-chocolate-900">{searchQuery}</strong>
            </span>
          )}
        </div>

        {/* Tables */}
        {activeTab === 'scheduled' && (
          <EmailTable
            type="scheduled"
            items={scheduledJobs}
            isLoading={isScheduledLoading}
            emptyTitle="No scheduled emails pending"
            currentPage={scheduledPage}
            totalPages={Math.ceil(scheduledTotal / 10) || 1}
            totalCount={scheduledTotal}
            onPageChange={(page) => loadScheduled(page)}
          />
        )}

        {activeTab === 'sent' && (
          <EmailTable
            type="sent"
            items={sentJobs}
            isLoading={isSentLoading}
            emptyTitle="No sent emails yet"
            currentPage={sentPage}
            totalPages={Math.ceil(sentTotal / 10) || 1}
            totalCount={sentTotal}
            onPageChange={(page) => loadSent(page)}
          />
        )}

        {activeTab === 'search' && (
          <EmailTable
            type="sent"
            items={searchResults}
            isLoading={isSearching}
            emptyTitle="No emails match search"
            currentPage={1}
            totalPages={Math.ceil(searchTotal / 10) || 1}
            totalCount={searchTotal}
            onPageChange={() => {}}
          />
        )}
      </main>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        senders={senders}
        onScheduleSuccess={(res) => {
          setToastMessage(`Campaign scheduled: ${res?.totalScheduled || 1} email(s) queued.`);
          loadScheduled(1);
          loadSent(1);
          setActiveTab('scheduled');
        }}
        onSubmitSchedule={EmailService.schedule}
      />
    </div>
  );
};
