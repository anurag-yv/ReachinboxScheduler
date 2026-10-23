import React from 'react';
import { User, SlackConnectionStatus } from '../types';
import {
  Mail,
  Search,
  LogOut,
  Slack,
  ExternalLink,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { Button } from './Button';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  slackStatus: SlackConnectionStatus | null;
  onConnectSlack: () => void;
  onDisconnectSlack: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  slackStatus,
  onConnectSlack,
  onDisconnectSlack,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-chocolate-200/80 shadow-sm shadow-chocolate-900/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-chocolate-700 flex items-center justify-center text-white shadow-md shadow-chocolate-700/20">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-chocolate-950 tracking-tight flex items-center gap-2">
              ReachInbox
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-chocolate-50 text-chocolate-700 border border-chocolate-200">
                Scheduler
              </span>
            </h1>
          </div>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={onSearchSubmit} className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-chocolate-400" />
            <input
              type="text"
              placeholder="Search by recipient, subject, or body..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-chocolate-50/50 border border-chocolate-200 rounded-lg text-chocolate-900 placeholder:text-chocolate-400 focus:outline-none focus:ring-2 focus:ring-chocolate-200 focus:border-chocolate-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-2.5 top-2 text-chocolate-400 hover:text-chocolate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </form>

        {/* Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* Bull Board link */}
          <a
            href="/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-chocolate-700 hover:text-chocolate-950 hover:bg-chocolate-50 rounded-lg border border-chocolate-200 transition-colors"
            title="Open BullMQ Queue Dashboard"
          >
            <Activity className="w-3.5 h-3.5 text-chocolate-600" />
            <span>Bull Board</span>
            <ExternalLink className="w-3 h-3 text-chocolate-400" />
          </a>

          {/* Slack Connection Control */}
          {slackStatus?.connected ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Slack className="w-3.5 h-3.5 text-[#4A154B]" />
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span className="hidden lg:inline">Slack Connected</span>
              <button
                onClick={onDisconnectSlack}
                className="ml-1 text-[11px] text-chocolate-400 hover:text-rose-600 underline font-normal"
                title="Disconnect Slack integration"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              icon={<Slack className="w-3.5 h-3.5 text-[#4A154B]" />}
              onClick={onConnectSlack}
              title="Connect Slack for rate limit notifications"
            >
              <span className="hidden sm:inline">Connect</span> Slack
            </Button>
          )}

          {/* User profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-chocolate-200">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-chocolate-200 object-cover shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-chocolate-100 text-chocolate-800 font-semibold text-xs flex items-center justify-center border border-chocolate-200">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-chocolate-950 leading-tight">{user.name}</p>
              <p className="text-[10px] text-chocolate-500 truncate max-w-[130px] leading-tight">
                {user.email}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-chocolate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
