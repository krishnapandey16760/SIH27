// src/app/activity-log/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  User, 
  Clock, 
  Search, 
  PlusCircle, 
  RefreshCw 
} from 'lucide-react';
import Link from 'next/link';

interface LogItem {
  id: string;
  type: 'maintenance' | 'user' | 'system';
  title: string;
  description: string;
  user: string;
  role: string;
  timestamp: string;
  status: 'In Progress' | 'Completed' | 'Pending Approval';
  section?: string;
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'maintenance' | 'user'>('all');
  const [search, setSearch] = useState('');
  
  // Quick Maintenance Add Dialog state
  const [showModal, setShowModal] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [maintenanceSection, setMaintenanceSection] = useState('');

  // API se real logs fetch karna
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Quick maintenance block add karna
  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    const storedUser = JSON.parse(localStorage.getItem('rail_user') || '{"name":"Officer In-charge","role":"Engineer"}');

    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'maintenance',
        title: maintenanceTitle,
        description: `Track possession & maintenance work initiated at ${maintenanceSection}.`,
        user: storedUser.name,
        role: storedUser.role,
        section: maintenanceSection,
        status: 'In Progress'
      })
    });

    setMaintenanceTitle('');
    setMaintenanceSection('');
    setShowModal(false);
    fetchLogs();
  };

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === 'all' || log.type === filter;
    const matchesSearch = 
      log.title.toLowerCase().includes(search.toLowerCase()) ||
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      (log.section ? log.section.toLowerCase().includes(search.toLowerCase()) : false);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0d131d] text-zinc-100 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Real-Time Activity &amp; Maintenance Logs
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Dynamic feed capturing live logins, maintenance blocks, and user actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700"
          >
            Switch / New Login
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg flex items-center gap-1.5 font-medium"
          >
            <PlusCircle size={15} /> + Add Maintenance
          </button>
          <button
            onClick={fetchLogs}
            className="p-2 text-zinc-400 hover:text-white bg-[#161f2e] border border-zinc-800 rounded-lg"
            title="Refresh logs"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Search by user, section, keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161f2e] border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 bg-[#161f2e] p-1 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('maintenance')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1 ${filter === 'maintenance' ? 'bg-amber-600 text-white' : 'text-zinc-400'}`}
          >
            <Wrench size={13} /> Maintenance
          </button>
          <button
            onClick={() => setFilter('user')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1 ${filter === 'user' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}
          >
            <User size={13} /> User Logins
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {loading && logs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 bg-[#161f2e]/50 rounded-xl border border-zinc-800">
            Fetching live logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 bg-[#161f2e]/50 rounded-xl border border-zinc-800">
            No dynamic logs recorded yet. Try logging in from the login page.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-[#161f2e] border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-zinc-700 transition-all"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-lg border ${
                    log.type === 'maintenance'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }`}
                >
                  {log.type === 'maintenance' ? <Wrench size={18} /> : <User size={18} />}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded">
                      {log.id}
                    </span>
                    <h3 className="text-sm font-semibold text-zinc-100">{log.title}</h3>
                    {log.section && (
                      <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                        {log.section}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{log.description}</p>
                  
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                    <span className="text-zinc-300 font-medium">{log.user}</span>
                    <span>•</span>
                    <span>{log.role}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {log.timestamp}
                    </span>
                  </div>
                </div>
              </div>

              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium self-start md:self-center ${
                  log.status === 'Completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {log.status}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Modal for adding maintenance activity */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161f2e] border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-white mb-4">Record Track Maintenance</h2>
            <form onSubmit={handleAddMaintenance} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Maintenance Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OHE Power Block / Tamping Machine Block"
                  value={maintenanceTitle}
                  onChange={(e) => setMaintenanceTitle(e.target.value)}
                  className="w-full bg-[#0d131d] border border-zinc-800 rounded-lg p-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Station / Track Section</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ambala Cantt - Saharanpur Line 1"
                  value={maintenanceSection}
                  onChange={(e) => setMaintenanceSection(e.target.value)}
                  className="w-full bg-[#0d131d] border border-zinc-800 rounded-lg p-2 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg"
                >
                  Submit Maintenance Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}